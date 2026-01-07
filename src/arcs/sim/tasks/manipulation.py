import numpy as np
from typing import Dict, Tuple
from arcs.sim.interfaces import Observation
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

    def _get_obs(self) -> Observation:
        _base_obs = super()._get_obs()
        # Inject goal info into the observation vector
        # structure: [joint_pos(7), joint_vel(7), goal_err(3), padding(3)] -> 20 dim matches DummyBackend

        # We assume joint_pos[:3] is our "EE position" for this dummy task
        ee_pos = self.joint_pos[:3]
        goal_error = self.goal - ee_pos

        # Verify base_obs.proprio structure from DummyBackend: [pos, vel, padding]
        # We reconstruct it cleaner
        proprio = np.concatenate([self.joint_pos, self.joint_vel, goal_error])

        # Pad if necessary to match 20
        needed = self.observation_space.shape[0] - len(proprio)
        if needed > 0:
            proprio = np.concatenate([proprio, np.zeros(needed)])
        elif needed < 0:
            # Expand observation space if needed (hacky for inherited class but works for python)
            # But verify_reach.py reads obs_dim from space.
            # Better to fit in 20. 7+7+3 = 17. Fits.
            pass

        return Observation(proprio=proprio, timestep=self.timestep)

    def step(self, action: np.ndarray) -> Tuple[Observation, float, bool, bool, Dict]:
        # We need to call DummyBackend step logic, but we can't easily inject changes
        # because DummyBackend.step calls self._get_obs().
        # Since we override _get_obs(), calling super().step(action) WILL call our new _get_obs()!
        # Inheritance FTW.

        obs, _, terminated, truncated, info = super().step(action)

        # Recompute reward based on distance
        reward = self.compute_reward(obs, action)

        dist = np.linalg.norm(obs.proprio[:3] - self.goal)
        if dist < 0.05:
            info["is_success"] = True
            # terminated = True # Optional: stop on success

        return obs, reward, terminated, truncated, info
