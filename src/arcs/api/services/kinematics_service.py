"""Kinematics service bridging API to existing geometry code."""

import logging
from typing import Any

import numpy as np

from arcs.geo.kinematics import KinematicsSolver
from arcs.geo.se3 import SE3

logger = logging.getLogger(__name__)


class KinematicsService:
    """Service for kinematics computations."""

    def __init__(self, urdf_path: str | None = None):
        self._solvers: dict[str, KinematicsSolver] = {}
        self._default_urdf = urdf_path
        logger.info("KinematicsService initialized")

    def get_solver(self, urdf_path: str | None = None) -> KinematicsSolver:
        """Get or create a kinematics solver for a URDF."""
        path = urdf_path or self._default_urdf
        if not path:
            raise ValueError("No URDF path provided")

        if path not in self._solvers:
            self._solvers[path] = KinematicsSolver(urdf_path=path)
            logger.info(f"Created KinematicsSolver for {path}")

        return self._solvers[path]

    def forward_kinematics(
        self,
        joint_angles: list[float],
        urdf_path: str | None = None,
        link_name: str | None = None,
    ) -> dict[str, Any]:
        """Compute forward kinematics."""
        try:
            solver = self.get_solver(urdf_path)
            q = np.array(joint_angles, dtype=np.float64)

            pose = solver.forward_kinematics(q, link_name=link_name)

            return {
                "position": pose.translation.tolist(),
                "quaternion": pose.rotation.tolist(),
                "matrix": pose.as_matrix().tolist(),
            }
        except Exception as e:
            logger.error(f"Forward kinematics failed: {e}")
            raise

    def inverse_kinematics(
        self,
        target_position: list[float],
        target_quaternion: list[float] | None = None,
        initial_joints: list[float] | None = None,
        urdf_path: str | None = None,
        max_iterations: int = 100,
        tolerance: float = 1e-6,
    ) -> dict[str, Any]:
        """Compute inverse kinematics."""
        try:
            solver = self.get_solver(urdf_path)

            # Build target pose
            position = np.array(target_position, dtype=np.float64)
            if target_quaternion:
                quaternion = np.array(target_quaternion, dtype=np.float64)
                target_pose = SE3.from_translation_and_quaternion(position, quaternion)
            else:
                target_pose = SE3.from_translation(position)

            # Initial guess
            q0 = None
            if initial_joints:
                q0 = np.array(initial_joints, dtype=np.float64)

            # Solve IK
            result = solver.inverse_kinematics(
                target_pose=target_pose,
                q0=q0,
                max_iterations=max_iterations,
                tolerance=tolerance,
            )

            return {
                "joint_angles": result.joint_angles.tolist() if result.converged else None,
                "converged": result.converged,
                "iterations": result.iterations,
                "error": result.error,
            }
        except Exception as e:
            logger.error(f"Inverse kinematics failed: {e}")
            raise

    def compute_jacobian(
        self,
        joint_angles: list[float],
        urdf_path: str | None = None,
    ) -> dict[str, Any]:
        """Compute the Jacobian matrix."""
        try:
            solver = self.get_solver(urdf_path)
            q = np.array(joint_angles, dtype=np.float64)

            jacobian = solver.compute_jacobian(q)

            # Compute condition number for manipulability
            try:
                condition_number = float(np.linalg.cond(jacobian))
            except Exception:
                condition_number = float("inf")

            return {
                "jacobian": jacobian.tolist(),
                "condition_number": condition_number,
                "shape": list(jacobian.shape),
            }
        except Exception as e:
            logger.error(f"Jacobian computation failed: {e}")
            raise

    def get_joint_limits(
        self,
        urdf_path: str | None = None,
    ) -> dict[str, Any]:
        """Get joint limits from URDF."""
        try:
            solver = self.get_solver(urdf_path)

            limits = []
            for joint in solver.joints:
                limits.append({
                    "name": joint.name,
                    "type": joint.joint_type,
                    "lower": float(joint.limit.lower) if joint.limit else None,
                    "upper": float(joint.limit.upper) if joint.limit else None,
                })

            return {
                "joints": limits,
                "num_joints": len(limits),
            }
        except Exception as e:
            logger.error(f"Failed to get joint limits: {e}")
            raise

    def check_joint_limits(
        self,
        joint_angles: list[float],
        urdf_path: str | None = None,
    ) -> dict[str, Any]:
        """Check if joint angles are within limits."""
        try:
            solver = self.get_solver(urdf_path)
            q = np.array(joint_angles, dtype=np.float64)

            violations = []
            for i, (angle, joint) in enumerate(zip(q, solver.joints)):
                if joint.limit:
                    if angle < joint.limit.lower:
                        violations.append({
                            "joint": i,
                            "name": joint.name,
                            "value": float(angle),
                            "limit": float(joint.limit.lower),
                            "type": "below_lower",
                        })
                    elif angle > joint.limit.upper:
                        violations.append({
                            "joint": i,
                            "name": joint.name,
                            "value": float(angle),
                            "limit": float(joint.limit.upper),
                            "type": "above_upper",
                        })

            return {
                "valid": len(violations) == 0,
                "violations": violations,
            }
        except Exception as e:
            logger.error(f"Joint limit check failed: {e}")
            raise
