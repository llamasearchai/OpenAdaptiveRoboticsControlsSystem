import numpy as np

from arcs.safety import JointLimits, SafetyFilter


def test_safety_filter_clips():
    limits = JointLimits(
        pos_min=np.array([-1.0, -1.0]),
        pos_max=np.array([1.0, 1.0]),
        vel_max=np.array([0.5, 0.5]),
        torque_max=np.array([0.5, 0.5]),
    )
    filt = SafetyFilter(limits, use_qp=False, dt=0.1)
    action = np.array([2.0, -2.0], dtype=np.float32)
    current_state = {"joint_pos": np.array([0.0, 0.0], dtype=np.float32)}
    safe = filt.filter_action(action, current_state)
    assert np.all(safe <= 0.5)
    assert np.all(safe >= -0.5)
