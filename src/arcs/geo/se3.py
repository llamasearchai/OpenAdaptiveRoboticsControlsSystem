import numpy as np
from scipy.spatial.transform import Rotation


class SO3:
    """Special Orthogonal Group SO(3)."""

    def __init__(self, quat: np.ndarray):
        # stored as [x, y, z, w]
        self._quat = quat / np.linalg.norm(quat)
        self._rot = Rotation.from_quat(self._quat)

    @classmethod
    def from_quat(cls, quat: np.ndarray) -> "SO3":
        return cls(quat)

    @classmethod
    def from_matrix(cls, matrix: np.ndarray) -> "SO3":
        quat = Rotation.from_matrix(matrix).as_quat()
        return cls(quat)

    @classmethod
    def identity(cls) -> "SO3":
        return cls(np.array([0.0, 0.0, 0.0, 1.0]))

    def as_matrix(self) -> np.ndarray:
        return self._rot.as_matrix()

    def as_quat(self) -> np.ndarray:
        return self._quat

    def compose(self, other: "SO3") -> "SO3":
        # scipy uses active rotation, multiplication order is standard
        new_rot = self._rot * other._rot
        return SO3(new_rot.as_quat())


class SE3:
    """Special Euclidean Group SE(3)."""

    def __init__(self, rotation: SO3, translation: np.ndarray):
        self.rotation = rotation
        self.translation = translation

    @classmethod
    def from_xyz_quat(cls, xyz: np.ndarray, quat: np.ndarray) -> "SE3":
        return cls(SO3.from_quat(quat), np.array(xyz))

    @classmethod
    def identity(cls) -> "SE3":
        return cls(SO3.identity(), np.zeros(3))

    def compose(self, other: "SE3") -> "SE3":
        # T1 * T2 = [R1 t1] * [R2 t2] = [R1R2  R1t2 + t1]
        new_rot = self.rotation.compose(other.rotation)
        new_trans = self.rotation._rot.apply(other.translation) + self.translation
        return SE3(new_rot, new_trans)

    def inverse(self) -> "SE3":
        # T^-1 = [R^T  -R^T t]
        inv_rot = SO3(self.rotation._rot.inv().as_quat())
        inv_trans = -inv_rot._rot.apply(self.translation)
        return SE3(inv_rot, inv_trans)

    def transform_point(self, point: np.ndarray) -> np.ndarray:
        return self.rotation._rot.apply(point) + self.translation

    def transform_vector(self, vector: np.ndarray) -> np.ndarray:
        return self.rotation._rot.apply(vector)

    def as_matrix(self) -> np.ndarray:
        H = np.eye(4)
        H[:3, :3] = self.rotation.as_matrix()
        H[:3, 3] = self.translation
        return H
