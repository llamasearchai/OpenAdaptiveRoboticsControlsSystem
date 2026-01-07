import numpy as np
import pytest
from arcs.geo.se3 import SE3, SO3


def test_so3_composition():
    # Rotate 90 deg around X
    R1 = SO3.from_matrix(np.array([[1, 0, 0], [0, 0, -1], [0, 1, 0]]))
    # Rotate 90 deg around Y
    R2 = SO3.from_matrix(np.array([[0, 0, 1], [0, 1, 0], [-1, 0, 0]]))

    R3 = R1.compose(R2)
    # Check shape
    assert R3.as_matrix().shape == (3, 3)


def test_se3_inverse():
    T = SE3.from_xyz_quat([1, 2, 3], [0, 0, 0, 1])
    T_inv = T.inverse()

    prod = T.compose(T_inv)
    assert np.allclose(prod.translation, [0, 0, 0], atol=1e-6)
    assert np.allclose(prod.rotation.as_matrix(), np.eye(3), atol=1e-6)


def test_se3_transform_point():
    # Translate by [1, 0, 0]
    T = SE3.from_xyz_quat([1, 0, 0], [0, 0, 0, 1])
    p = np.array([0.0, 0.0, 0.0])
    p_new = T.transform_point(p)
    assert np.allclose(p_new, [1, 0, 0])
