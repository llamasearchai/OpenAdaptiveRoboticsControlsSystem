from typing import Dict, List, Optional, Tuple, Union
import time

import numpy as np
from scipy.spatial.transform import Rotation

from arcs.geo.se3 import SE3, SO3
from arcs.utils.logging import log_event, new_correlation_id
from arcs.utils.path_validator import PathValidator

try:
    from urdfpy import URDF as URDFParser  # type: ignore
    _URDF_LIB = "urdfpy"
except Exception:
    try:
        from yourdfpy import URDF as URDFParser  # type: ignore

        _URDF_LIB = "yourdfpy"
    except Exception:
        URDFParser = None
        _URDF_LIB = None

try:
    import torch
except Exception:
    torch = None


class KinematicsSolver:
    """Forward and Inverse Kinematics Solver."""

    def __init__(
        self,
        urdf_path: Optional[str] = None,
        end_effector_link: Optional[str] = None,
        use_torch: bool = False,
        allowlist: Optional[List[str]] = None,
        strict_paths: bool = False,
    ):
        self.urdf_path = urdf_path
        self.end_effector_link = end_effector_link
        self.use_torch = use_torch
        self.correlation_id = new_correlation_id()

        self._urdf = None
        self._base_link = None
        self._chain_joints = []
        self._joint_limits: List[Tuple[Optional[float], Optional[float]]] = []
        self._chain_joint_names: List[str] = []
        self._origin_mats: List[np.ndarray] = []
        self._axes: List[np.ndarray] = []
        self._joint_types: List[str] = []
        self._link_from_joint: List[str] = []

        if urdf_path is not None:
            self._load_urdf(urdf_path, allowlist=allowlist, strict_paths=strict_paths)

    def _load_urdf(
        self, urdf_path: str, allowlist: Optional[List[str]], strict_paths: bool
    ) -> None:
        if URDFParser is None:
            raise ImportError("urdfpy or yourdfpy is required for URDF parsing")
        validator = PathValidator(allowlist=allowlist, strict=strict_paths)
        resolved = validator.validate(urdf_path)
        if resolved.suffix.lower() != ".urdf":
            raise ValueError("URDF path must have .urdf extension")
        if not resolved.exists():
            raise FileNotFoundError(f"URDF not found: {resolved}")
        try:
            self._urdf = URDFParser.load(str(resolved))
        except Exception as err:
            raise ValueError(f"Failed to parse URDF: {err}") from err

        self._base_link = self._get_base_link_name()
        if self.end_effector_link is None:
            self.end_effector_link = self._get_default_end_effector()
        self._build_chain(self._base_link, self.end_effector_link)

    def _get_default_end_effector(self) -> str:
        links = getattr(self._urdf, "links", [])
        if not links:
            raise ValueError("URDF has no links")
        last_link = links[-1]
        return getattr(last_link, "name", str(last_link))

    def _get_base_link_name(self) -> str:
        if hasattr(self._urdf, "base_link"):
            base_link = self._urdf.base_link
            return getattr(base_link, "name", str(base_link))
        if hasattr(self._urdf, "get_root"):
            return self._urdf.get_root()
        joints = getattr(self._urdf, "joints", [])
        parents = {self._link_name(j.parent) for j in joints}
        children = {self._link_name(j.child) for j in joints}
        roots = list(parents - children)
        if not roots:
            raise ValueError("Unable to determine base link")
        return roots[0]

    def _build_chain(self, base_link: str, end_link: str) -> None:
        joints = getattr(self._urdf, "joints", [])
        child_to_joint = {self._link_name(j.child): j for j in joints}

        chain: List[object] = []
        link = end_link
        while link != base_link:
            if link not in child_to_joint:
                raise ValueError(f"Missing joint for link {link}")
            joint = child_to_joint[link]
            chain.append(joint)
            link = self._link_name(joint.parent)
        chain.reverse()

        self._chain_joints = chain
        self._chain_joint_names = [j.name for j in chain]
        self._joint_limits = []
        self._origin_mats = []
        self._axes = []
        self._joint_types = []
        self._link_from_joint = [self._link_name(j.child) for j in chain]

        for joint in chain:
            limit = getattr(joint, "limit", None)
            lower = getattr(limit, "lower", None) if limit is not None else None
            upper = getattr(limit, "upper", None) if limit is not None else None
            self._joint_limits.append((lower, upper))
            self._origin_mats.append(self._origin_matrix(joint))
            axis = getattr(joint, "axis", np.array([0.0, 0.0, 1.0]))
            self._axes.append(np.asarray(axis, dtype=np.float32))
            self._joint_types.append(getattr(joint, "joint_type", getattr(joint, "type", "fixed")))

    def forward_kinematics(
        self, q: np.ndarray, link_name: Optional[str] = None
    ) -> Union[SE3, Dict[str, SE3], List[SE3], List[Dict[str, SE3]]]:
        if self._urdf is None:
            raise ValueError("URDF not loaded; provide urdf_path in constructor")
        q = np.asarray(q, dtype=np.float32)
        start_time = time.perf_counter()

        if q.ndim == 2:
            if self.use_torch and torch is not None and link_name is not None:
                result = self._fk_batch_torch(q, link_name)
            else:
                result = [
                    self.forward_kinematics(q_i, link_name=link_name) for q_i in q
                ]
            fk_time_us = (time.perf_counter() - start_time) * 1e6
            log_event(
                "fk.compute",
                self.correlation_id,
                num_joints=len(self._chain_joint_names),
                fk_time_us=fk_time_us,
            )
            return result

        if q.ndim != 1:
            raise ValueError("q must be 1D or 2D array")
        if q.shape[0] != len(self._chain_joint_names):
            raise ValueError("q dimension does not match joint count")

        self._validate_joint_limits(q)
        joint_positions = {name: 0.0 for name in self._chain_joint_names}
        for idx, name in enumerate(self._chain_joint_names):
            joint_positions[name] = float(q[idx])

        link_fk = self._urdf.link_fk(cfg=joint_positions)
        link_poses: Dict[str, SE3] = {}
        for link, matrix in link_fk.items():
            name = self._link_name(link)
            link_poses[name] = self._matrix_to_se3(np.asarray(matrix))

        if link_name is None:
            result = link_poses
        else:
            if link_name not in link_poses:
                raise ValueError(f"Link not found: {link_name}")
            result = link_poses[link_name]

        fk_time_us = (time.perf_counter() - start_time) * 1e6
        log_event(
            "fk.compute",
            self.correlation_id,
            num_joints=len(self._chain_joint_names),
            fk_time_us=fk_time_us,
        )
        return result

    def jacobian(self, joint_angles: np.ndarray) -> np.ndarray:
        if self._urdf is None:
            raise ValueError("URDF not loaded; provide urdf_path in constructor")
        q = np.asarray(joint_angles, dtype=np.float32)
        if q.ndim != 1:
            raise ValueError("jacobian expects 1D joint vector")
        if q.shape[0] != len(self._chain_joint_names):
            raise ValueError("q dimension does not match joint count")
        self._validate_joint_limits(q)

        T = np.eye(4)
        joint_frames = []
        for idx, joint in enumerate(self._chain_joints):
            T_joint = T @ self._origin_mats[idx]
            axis = self._axes[idx]
            joint_frames.append((T_joint, axis, self._joint_types[idx]))
            T = T_joint @ self._joint_motion_matrix(self._joint_types[idx], axis, q[idx])

        p_ee = T[:3, 3]
        J = np.zeros((6, len(self._chain_joints)), dtype=np.float32)
        for idx, (T_joint, axis, joint_type) in enumerate(joint_frames):
            axis_world = T_joint[:3, :3] @ axis
            p_joint = T_joint[:3, 3]
            if joint_type in ("revolute", "continuous"):
                J[:3, idx] = np.cross(axis_world, p_ee - p_joint)
                J[3:, idx] = axis_world
            elif joint_type == "prismatic":
                J[:3, idx] = axis_world
                J[3:, idx] = 0.0
            else:
                J[:, idx] = 0.0

        cond_number = float(np.linalg.cond(J)) if J.size > 0 else 0.0
        log_event(
            "fk.jacobian",
            self.correlation_id,
            num_joints=len(self._chain_joint_names),
            jacobian_condition_number=cond_number,
        )
        return J

    def inverse_kinematics(
        self,
        target_pose: SE3,
        q_init: Optional[np.ndarray] = None,
        max_iters: int = 100,
    ) -> Optional[np.ndarray]:
        """Basic IK placeholder using damped least squares."""
        if q_init is None:
            q = np.zeros(len(self._chain_joint_names), dtype=np.float32)
        else:
            q = np.asarray(q_init, dtype=np.float32).copy()
        for _ in range(max_iters):
            current = self.forward_kinematics(q, link_name=self.end_effector_link)
            if not isinstance(current, SE3):
                return None
            error = target_pose.translation - current.translation
            if np.linalg.norm(error) < 1e-4:
                return q
            J = self.jacobian(q)
            dq = np.linalg.pinv(J[:3, :]) @ error
            q = q + dq.astype(np.float32)
        return q

    def _fk_batch_torch(self, q: np.ndarray, link_name: str) -> List[SE3]:
        if link_name == self._base_link:
            return [SE3.identity() for _ in range(q.shape[0])]
        if link_name not in self._link_from_joint and link_name != self.end_effector_link:
            raise ValueError(f"Link not found in serial chain: {link_name}")
        if torch is None:
            raise RuntimeError("torch not available for GPU FK")

        device = torch.device("cuda") if torch.cuda.is_available() else torch.device("cpu")
        q_t = torch.tensor(q, dtype=torch.float32, device=device)
        batch = q_t.shape[0]
        T = torch.eye(4, device=device).repeat(batch, 1, 1)
        link_targets = {name: idx for idx, name in enumerate(self._link_from_joint)}

        target_index = link_targets.get(link_name, len(self._link_from_joint) - 1)
        for idx in range(target_index + 1):
            origin = torch.tensor(self._origin_mats[idx], dtype=torch.float32, device=device)
            axis = torch.tensor(self._axes[idx], dtype=torch.float32, device=device)
            joint_type = self._joint_types[idx]
            T_joint = torch.bmm(T, origin.expand(batch, -1, -1))
            motion = self._joint_motion_matrix_torch(joint_type, axis, q_t[:, idx])
            T = torch.bmm(T_joint, motion)

        matrices = T.detach().cpu().numpy()
        return [self._matrix_to_se3(matrices[i]) for i in range(batch)]

    def _validate_joint_limits(self, q: np.ndarray) -> None:
        for idx, (lower, upper) in enumerate(self._joint_limits):
            if lower is None or upper is None:
                continue
            if q[idx] < lower or q[idx] > upper:
                raise ValueError(
                    f"Joint {self._chain_joint_names[idx]} out of limits: {q[idx]}"
                )

    @staticmethod
    def _link_name(link) -> str:
        return getattr(link, "name", str(link))

    @staticmethod
    def _matrix_to_se3(matrix: np.ndarray) -> SE3:
        rot = SO3.from_matrix(matrix[:3, :3])
        return SE3(rot, matrix[:3, 3])

    @staticmethod
    def _origin_matrix(joint) -> np.ndarray:
        origin = getattr(joint, "origin", None)
        if origin is None:
            return np.eye(4)
        origin_arr = np.asarray(origin)
        if origin_arr.shape == (4, 4):
            return origin_arr
        if hasattr(origin, "xyz") and hasattr(origin, "rpy"):
            rot = Rotation.from_euler("xyz", origin.rpy).as_matrix()
            mat = np.eye(4)
            mat[:3, :3] = rot
            mat[:3, 3] = np.asarray(origin.xyz)
            return mat
        return np.eye(4)

    @staticmethod
    def _joint_motion_matrix(joint_type: str, axis: np.ndarray, q: float) -> np.ndarray:
        if joint_type in ("revolute", "continuous"):
            axis = axis / (np.linalg.norm(axis) + 1e-8)
            rot = Rotation.from_rotvec(axis * q).as_matrix()
            mat = np.eye(4)
            mat[:3, :3] = rot
            return mat
        if joint_type == "prismatic":
            mat = np.eye(4)
            mat[:3, 3] = axis * q
            return mat
        return np.eye(4)

    @staticmethod
    def _joint_motion_matrix_torch(
        joint_type: str, axis: torch.Tensor, q: torch.Tensor
    ) -> torch.Tensor:
        batch = q.shape[0]
        axis = axis / (torch.norm(axis) + 1e-8)
        if joint_type in ("revolute", "continuous"):
            kx, ky, kz = axis[0], axis[1], axis[2]
            K = torch.tensor(
                [[0.0, -kz, ky], [kz, 0.0, -kx], [-ky, kx, 0.0]],
                device=q.device,
                dtype=q.dtype,
            ).view(1, 3, 3)
            K = K.repeat(batch, 1, 1)
            eye = torch.eye(3, device=q.device, dtype=q.dtype).view(1, 3, 3)
            eye = eye.repeat(batch, 1, 1)
            angle = q.view(-1, 1, 1)
            sin_a = torch.sin(angle)
            cos_a = torch.cos(angle)
            rot = eye + sin_a * K + (1 - cos_a) * torch.bmm(K, K)
            mat = torch.eye(4, device=q.device).view(1, 4, 4).repeat(batch, 1, 1)
            mat[:, :3, :3] = rot
            return mat
        if joint_type == "prismatic":
            mat = torch.eye(4, device=q.device).view(1, 4, 4).repeat(batch, 1, 1)
            mat[:, :3, 3] = q.view(-1, 1) * axis.view(1, 3)
            return mat
        return torch.eye(4, device=q.device).view(1, 4, 4).repeat(batch, 1, 1)
