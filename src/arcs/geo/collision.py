import numpy as np


class CollisionChecker:
    """Collision checking interface."""

    def __init__(self):
        pass

    def check_collision(self, q: np.ndarray) -> bool:
        """Check if configuration q is in collision."""
        # Simple proxy: check if end-effector is inside strict workspace bounds
        # For a reach task, we might define collision as hitting the table (z < 0)
        # We assume q ~ joint_pos, but we need FK to get EE pos.
        # For this mock, we'll just check joint limits violation as "collision"
        # or simple heuristic if we had kinematics.
        return np.any(np.abs(q) > np.pi)

    def distance(self, q: np.ndarray) -> float:
        """Return minimum distance to obstacles."""
        # Mock signed distance
        return 0.5
