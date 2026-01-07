from typing import List, Optional
import numpy as np


class CollisionChecker:
    """Collision checking interface."""

    def __init__(self):
        pass

    def check_collision(self, q: np.ndarray) -> bool:
        """Check if configuration q is in collision."""
        # Dummy: always safe
        return False

    def distance(self, q: np.ndarray) -> float:
        """Return minimum distance to obstacles."""
        return 1.0
