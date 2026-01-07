import numpy as np
import gymnasium as gym
from typing import Dict, Optional, Tuple, Any

from arcs.sim.interfaces import SimulationEnv, Observation, State


class DummyBackend(SimulationEnv):
    """
    A pure Python dummy backend for testing logic without heavy physics engines.
    Simulates a simple point mass or kinematic chain without dynamics.
    """

    def __init__(
        self,
        task_name: str = "Reach",
        num_envs: int = 1,
        device: str = "cpu",
        config: Optional[object] = None,
    ):
        self.task_name = task_name
        self.num_envs = num_envs
        self.device = device
        self.config = config
        self.timestep = 0
        self._action_space = gym.spaces.Box(low=-1.0, high=1.0, shape=(7,), dtype=np.float32)
        self._observation_space = gym.spaces.Box(
            low=-np.inf, high=np.inf, shape=(20,), dtype=np.float32
        )

        # Internal state
        self.joint_pos = np.zeros(7)
        self.joint_vel = np.zeros(7)
        self.object_pos = np.array([0.5, 0.0, 0.5])

        # Parameter stores
        self._dynamics_params = {}
        self._sensor_params = {}
        self._action_params = {}

    def reset(self, seed: Optional[int] = None) -> Observation:
        if seed is not None:
            np.random.seed(seed)

        self.timestep = 0
        self.joint_pos = np.zeros(7)
        self.joint_vel = np.zeros(7)

        return self._get_obs()

    def step(self, action: np.ndarray) -> Tuple[Observation, float, bool, bool, Dict]:
        self.timestep += 1

        # Apple action noise/latency if configured
        if self._action_params:
            if np.random.random() < self._action_params.get("dropout", 0.0):
                action = self.joint_vel  # Repeat last action

            _latency = self._action_params.get("latency", 0.0)
            # Simple latency simulation could go here (queue), skipping for now due to state complexity

        # Simple integrator dynamics
        self.joint_vel = action  # Velocity control
        self.joint_pos += self.joint_vel * 0.05  # dt = 0.05

        # Enforce joint limits ([-pi, pi])
        self.joint_pos = np.clip(self.joint_pos, -np.pi, np.pi)

        obs = self._get_obs()
        reward = -np.linalg.norm(self.joint_pos[:3] - self.object_pos)  # Simple reach reward

        terminated = False
        truncated = self.timestep > 100
        info = {"is_success": False}

        return obs, reward, terminated, truncated, info

    def get_state(self) -> State:
        return State(
            joint_pos=self.joint_pos.copy(),
            joint_vel=self.joint_vel.copy(),
            object_states={"target": self.object_pos.copy()},
            timestamp=self.timestep * 0.01,
        )

    def set_state(self, state: State) -> None:
        self.joint_pos = state.joint_pos.copy()
        self.joint_vel = state.joint_vel.copy()
        self.timestep = int(state.timestamp / 0.01)

    @property
    def action_space(self) -> gym.Space:
        return self._action_space

    @property
    def observation_space(self) -> gym.Space:
        return self._observation_space

    def _get_obs(self) -> Observation:
        proprio = np.concatenate([self.joint_pos, self.joint_vel])

        # Apply sensor noise
        if self._sensor_params:
            noise_scale = self._sensor_params.get("noise_scale", 0.0)
            if noise_scale > 0:
                proprio += np.random.normal(0, noise_scale, size=proprio.shape)

        # Pad to match observation space shape if needed, or define obs space dynamically
        extra = np.zeros(self.observation_space.shape[0] - len(proprio))
        full_obs = np.concatenate([proprio, extra])

        return Observation(proprio=full_obs, timestep=self.timestep)

    def close(self):
        pass

    def update_dynamics(self, params: Dict[str, float]) -> None:
        # Dummy backend doesn't model dynamics; store params for debugging.
        self._dynamics_params = params

    def update_sensors(self, params: Dict[str, float]) -> None:
        self._sensor_params = params

    def update_action(self, params: Dict[str, float]) -> None:
        self._action_params = params
