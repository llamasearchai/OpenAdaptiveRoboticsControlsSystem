from typing import Dict, List, Optional, Tuple, Type

import gymnasium as gym
import numpy as np

from arcs.sim.interfaces import Observation, SimulationEnv, State


class VectorizedEnv(SimulationEnv):
    """Simple vectorized wrapper around multiple SimulationEnv instances."""

    supports_vectorized = True

    def __init__(
        self,
        backend_cls: Type[SimulationEnv],
        task_name: str,
        num_envs: int,
        device: str,
        config: Optional[object] = None,
    ):
        if num_envs < 1:
            raise ValueError("num_envs must be >= 1")
        self.num_envs = num_envs
        self._envs: List[SimulationEnv] = [
            backend_cls(task_name=task_name, num_envs=1, device=device, config=config)
            for _ in range(num_envs)
        ]
        self._action_space = self._batch_space(self._envs[0].action_space, num_envs)
        self._observation_space = self._batch_space(
            self._envs[0].observation_space, num_envs
        )

    def reset(self, seed: Optional[int] = None) -> Observation:
        observations = []
        for idx, env in enumerate(self._envs):
            env_seed = None if seed is None else seed + idx
            observations.append(env.reset(seed=env_seed))
        return self._stack_observations(observations)

    def step(self, action: np.ndarray) -> Tuple[Observation, np.ndarray, np.ndarray, np.ndarray, Dict]:
        observations = []
        rewards = []
        terminateds = []
        truncateds = []
        infos = []
        for env, env_action in zip(self._envs, action):
            obs, reward, terminated, truncated, info = env.step(env_action)
            observations.append(obs)
            rewards.append(reward)
            terminateds.append(terminated)
            truncateds.append(truncated)
            infos.append(info)
        return (
            self._stack_observations(observations),
            np.asarray(rewards, dtype=np.float32),
            np.asarray(terminateds, dtype=bool),
            np.asarray(truncateds, dtype=bool),
            {"per_env": infos},
        )

    def get_state(self) -> State:
        states = [env.get_state() for env in self._envs]
        joint_pos = np.stack([s.joint_pos for s in states])
        joint_vel = np.stack([s.joint_vel for s in states])
        object_states: Dict[str, np.ndarray] = {}
        for key in states[0].object_states:
            object_states[key] = np.stack([s.object_states[key] for s in states])
        timestamp = float(np.mean([s.timestamp for s in states]))
        return State(
            joint_pos=joint_pos,
            joint_vel=joint_vel,
            object_states=object_states,
            timestamp=timestamp,
        )

    def set_state(self, state: State) -> None:
        for env, idx in zip(self._envs, range(self.num_envs)):
            env_state = State(
                joint_pos=state.joint_pos[idx],
                joint_vel=state.joint_vel[idx],
                object_states={
                    key: value[idx] for key, value in state.object_states.items()
                },
                timestamp=state.timestamp,
            )
            env.set_state(env_state)

    @property
    def action_space(self) -> gym.Space:
        return self._action_space

    @property
    def observation_space(self) -> gym.Space:
        return self._observation_space

    def update_dynamics(self, params: Dict[str, float]) -> None:
        for env in self._envs:
            env.update_dynamics(params)

    def update_visual(self, params: Dict[str, float]) -> None:
        for env in self._envs:
            env.update_visual(params)

    def update_sensors(self, params: Dict[str, float]) -> None:
        for env in self._envs:
            env.update_sensors(params)

    def update_action(self, params: Dict[str, float]) -> None:
        for env in self._envs:
            env.update_action(params)

    def close(self):
        for env in self._envs:
            env.close()

    def _batch_space(self, space: gym.Space, num_envs: int) -> gym.Space:
        if isinstance(space, gym.spaces.Box):
            low = np.broadcast_to(space.low, (num_envs,) + space.shape)
            high = np.broadcast_to(space.high, (num_envs,) + space.shape)
            return gym.spaces.Box(
                low=low, high=high, shape=(num_envs,) + space.shape, dtype=space.dtype
            )
        raise TypeError("VectorizedEnv only supports Box spaces for now")

    def _stack_observations(self, observations: List[Observation]) -> Observation:
        proprio = np.stack([obs.proprio for obs in observations])
        rgb = None
        if observations[0].rgb is not None:
            rgb = np.stack([obs.rgb for obs in observations])
        depth = None
        if observations[0].depth is not None:
            depth = np.stack([obs.depth for obs in observations])
        tactile = None
        if observations[0].tactile is not None:
            tactile = np.stack([obs.tactile for obs in observations])
        return Observation(
            proprio=proprio,
            rgb=rgb,
            depth=depth,
            tactile=tactile,
            timestep=observations[0].timestep,
            metadata={"per_env": [obs.metadata for obs in observations]},
        )
