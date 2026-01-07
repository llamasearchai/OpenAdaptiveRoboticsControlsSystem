import numpy as np
import pytest
import os
import tempfile
import importlib.util
from arcs.geo.se3 import SE3, SO3
from arcs.geo.collision import CollisionChecker
from arcs.geo.kinematics import KinematicsSolver


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


def test_collision_checker_proxy():
    """Test simple collision proxy (joint limits)."""
    checker = CollisionChecker()

    # Safe config
    q_safe = np.array([0.0, 0.0, 0.0])
    assert not checker.check_collision(q_safe)

    # Violation (> pi)
    q_unsafe_pos = np.array([4.0, 0.0, 0.0])
    assert checker.check_collision(q_unsafe_pos)

    # Violation (< -pi)
    q_unsafe_neg = np.array([-4.0, 0.0, 0.0])
    assert checker.check_collision(q_unsafe_neg)

    # Distance mock
    assert checker.distance(q_safe) > 0


# --- Mock URDF Data for Kinematics Testing ---
MOCK_URDF = """<?xml version="1.0"?>
<robot name="test_robot">
  <link name="base_link"/>
  <link name="link1"/>
  <link name="link2"/>
  
  <joint name="joint1" type="revolute">
    <parent link="base_link"/>
    <child link="link1"/>
    <origin xyz="0 0 1" rpy="0 0 0"/>
    <axis xyz="0 0 1"/>
    <limit lower="-3.14" upper="3.14"/>
  </joint>
  
  <joint name="joint2" type="prismatic">
    <parent link="link1"/>
    <child link="link2"/>
    <origin xyz="1 0 0" rpy="0 0 0"/>
    <axis xyz="1 0 0"/>
    <limit lower="0.0" upper="1.0"/>
  </joint>
</robot>
"""


@pytest.fixture
def mock_urdf_file():
    fd, path = tempfile.mkstemp(suffix=".urdf")
    with os.fdopen(fd, "w") as f:
        f.write(MOCK_URDF)
    yield path
    os.remove(path)


def test_kinematics_solver_with_mock_urdf(mock_urdf_file):
    # This import is intentionally placed here to avoid a top-level dependency on urdfpy/yourdfpy
    # for tests that don't require it.

    has_urdfpy = importlib.util.find_spec("urdfpy") is not None
    has_yourdfpy = importlib.util.find_spec("yourdfpy") is not None

    if not has_urdfpy and not has_yourdfpy:
        pytest.skip("urdfpy/yourdfpy not installed, skipping kinematics test")

    solver = KinematicsSolver(urdf_path=mock_urdf_file, end_effector_link="link2")

    # Test Forward Kinematics
    # q = [0 (rot), 0 (prism)]
    # Link1 should be at (0,0,1)
    # Link2 should be at Link1 + (1,0,0) = (1,0,1)
    q_zero = np.array([0.0, 0.0])
    pose_zero = solver.forward_kinematics(q_zero)

    assert np.allclose(pose_zero.translation, [1.0, 0.0, 1.0])

    # q = [pi/2, 0.5]
    # Joint1 rotates 90 deg about Z. Link1 origin at (0,0,1).
    # Link2 attached at (1,0,0) relative to Link1.
    # After 90 deg rot, (1,0,0) becomes (0,1,0).
    # Plus Base offset (0,0,1) -> (0,1,1).
    # Prismatic joint moves 0.5 along local X (which is now World Y).
    # So add (0, 0.5, 0).
    # Result: (0, 1.5, 1).

    q_test = np.array([np.pi / 2, 0.5])
    pose_test = solver.forward_kinematics(q_test)

    assert np.allclose(pose_test.translation, [0.0, 1.5, 1.0], atol=1e-5)


def test_kinematics_math():
    """Test low-level kinematics math without URDF parser."""
    # 1. Revolute Joint (rotate 90 deg about Z)
    axis = np.array([0.0, 0.0, 1.0])
    q = np.pi / 2
    mat = KinematicsSolver._joint_motion_matrix("revolute", axis, q)

    # Expect rotation of 90 deg about Z
    # [ 0 -1  0  0]
    # [ 1  0  0  0]
    # [ 0  0  1  0]
    # [ 0  0  0  1]
    expected_rot = np.array([[0, -1, 0, 0], [1, 0, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]])
    assert np.allclose(mat, expected_rot, atol=1e-6)

    # 2. Prismatic Joint (move 0.5 along X)
    axis = np.array([1.0, 0.0, 0.0])
    q = 0.5
    mat = KinematicsSolver._joint_motion_matrix("prismatic", axis, q)

    expected_trans = np.eye(4)
    expected_trans[0, 3] = 0.5

    assert np.allclose(mat, expected_trans)
