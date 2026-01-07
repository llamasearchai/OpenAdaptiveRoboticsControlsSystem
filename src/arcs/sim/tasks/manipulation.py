import numpy as np
from typing import Dict, Tuple, Optional
from arcs.sim.interfaces import SimulationEnv, Observation
from arcs.sim.backends.dummy import DummyBackend


class ManipulationTask(DummyBackend):
    """Base class for manipulation tasks, wrapping a backend."""

    # For now inheriting directly from DummyBackend to simplify the prototype.
    # In production, this would wrap a generie 'backend' instance.

    def __init__(self, task_name: str):
        super().__init__(task_name=task_name)

    def compute_reward(self, obs: Observation, action: np.ndarray) -> float:
        # Override in subclasses
        return 0.0

    def is_success(self, obs: Observation) -> bool:
        return False


class ReachTask(ManipulationTask):
    def __init__(self):
        super().__init__("Reach")
        self.goal = np.array([0.5, 0.0, 0.5])

    def compute_reward(self, obs: Observation, action: np.ndarray) -> float:
        # Assuming first 3 elements of proprio are XYZ position
        # This is coupling to DummyBackend implementation details, which is fine for now
        ee_pos = obs.proprio[:3]
        dist = np.linalg.norm(ee_pos - self.goal)
        return -dist

    def step(self, action: np.ndarray) -> Tuple[Observation, float, bool, bool, Dict]:
        obs, _, terminated, truncated, info = super().step(action)
        reward = self.compute_reward(obs, action)

        dist = np.linalg.norm(obs.proprio[:3] - self.goal)
        if dist < 0.05:
            info["is_success"] = True
            # terminated = True # Optional: stop on success

        return obs, reward, terminated, truncated, info
