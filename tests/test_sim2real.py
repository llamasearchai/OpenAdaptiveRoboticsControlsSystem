import pytest
import numpy as np
from arcs.real.real_env import RealRobotEnv
from arcs.real.sys_id import SystemID
from arcs.real.evaluator import SimToRealEvaluator
from arcs.sim.backends.dummy import DummyBackend


class MockPolicy:
    def __call__(self, obs):
        # Return random action
        return np.random.uniform(-0.1, 0.1, size=(7,))


def test_real_robot_basic_motion():
    """Real robot executes basic motion safely (Mock backend)"""
    robot = RealRobotEnv(robot_type="franka", control_freq=30.0)

    # Move to home
    obs_initial = robot.reset()
    assert np.all(np.abs(obs_initial.proprio) < 0.01)  # Near zero

    # Send small, safe action
    action = np.zeros(7)
    # Unpack 5 values
    obs_next, _, _, _, info = robot.step(action)

    assert info["sim_to_real"]
    assert robot.is_safe()


def test_system_id_friction():
    """Identify friction matches spec (Mock)"""
    robot = RealRobotEnv()
    sim = DummyBackend()
    sys_id = SystemID(robot, sim)

    # Run simple calibration
    friction_coeffs = sys_id.calibrate_friction()

    assert "joint_0" in friction_coeffs
    assert friction_coeffs["joint_0"] > 0.1


def test_real_robot_safety_violation():
    """Ensure unsafe actions trigger emergency stop."""
    robot = RealRobotEnv(robot_type="franka", control_freq=30.0)
    robot.reset()

    # Action > 1.0 defined as unsafe in mock
    unsafe_action = np.array([2.0] * 7)

    with pytest.raises(RuntimeError) as excinfo:
        robot.step(unsafe_action)

    assert "Safety violation" in str(excinfo.value)
    assert robot._is_running is False  # Should have stopped


def test_sim_to_real_gap():
    """Quantify success rate gap"""
    # Create simple envs
    sim_env = DummyBackend()
    real_env = RealRobotEnv()
    policy = MockPolicy()

    evaluator = SimToRealEvaluator(sim_env, real_env, policy)
    gap = evaluator.compute_transfer_gap(n_sim=5, n_real=5)

    # Gap should correspond to difference in performance
    # Since both are mocks/dummy with random policy, gap might be small or random
    # But code should run without error
    assert isinstance(gap.success_rate_gap, float)
