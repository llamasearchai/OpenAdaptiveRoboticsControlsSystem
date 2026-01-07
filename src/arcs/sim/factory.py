from dataclasses import dataclass
import importlib
import time
from typing import Dict, Optional, Tuple, Type

import gymnasium as gym
import numpy as np

from arcs.sim.interfaces import SimulationEnv
from arcs.sim.randomization import DomainRandomizer, RandomizationConfig, RandomizationWrapper
from arcs.sim.vectorized import VectorizedEnv
from arcs.utils.logging import log_event, new_correlation_id


class BackendUnavailableError(RuntimeError):
    pass


class BackendRegistrationError(RuntimeError):
    pass


class SpaceMismatchError(ValueError):
    pass


@dataclass
class BackendConfig:
    control_freq: int = 30
    render_mode: Optional[str] = None
    domain_randomization_config: Optional[RandomizationConfig] = None


@dataclass
class BackendSpec:
    module_path: Optional[str] = None
    class_name: Optional[str] = None
    cls: Optional[Type[SimulationEnv]] = None


class SimulationBackendFactory:
    _registry: Dict[str, BackendSpec] = {}
    _task_spaces: Dict[str, Tuple[gym.Space, gym.Space]] = {}

    @classmethod
    def register_backend(
        cls, name: str, module_path: str, class_name: str
    ) -> None:
        cls._registry[name] = BackendSpec(
            module_path=module_path, class_name=class_name
        )

    @classmethod
    def register_backend_cls(cls, name: str, backend_cls: Type[SimulationEnv]) -> None:
        cls._registry[name] = BackendSpec(cls=backend_cls)

    @classmethod
    def create_env(
        cls,
        task: str,
        backend: str,
        num_envs: int = 1,
        device: str = "cpu",
        config: Optional[BackendConfig] = None,
    ) -> SimulationEnv:
        if backend not in cls._registry:
            raise BackendRegistrationError(f"Backend not registered: {backend}")
        backend_cls = cls._load_backend_cls(backend)
        config = config or BackendConfig()

        start_time = time.perf_counter()
        if num_envs > 1 and not getattr(backend_cls, "supports_vectorized", False):
            env: SimulationEnv = VectorizedEnv(
                backend_cls, task_name=task, num_envs=num_envs, device=device, config=config
            )
        else:
            env = backend_cls(
                task_name=task, num_envs=num_envs, device=device, config=config
            )

        action_space, observation_space = cls._ensure_spaces(env)
        cls._validate_spaces(task, action_space, observation_space)

        memory_mb = getattr(env, "gpu_memory_mb", None)

        if config.domain_randomization_config is not None:
            randomizer = DomainRandomizer(
                config=config.domain_randomization_config,
                control_freq=config.control_freq,
            )
            env = RandomizationWrapper(env, randomizer)

        correlation_id = getattr(env, "correlation_id", None) or new_correlation_id()
        env = LoggedEnv(env, backend=backend, task=task, correlation_id=correlation_id)

        init_time_ms = (time.perf_counter() - start_time) * 1000.0
        log_event(
            "backend.initialization",
            correlation_id,
            backend=backend,
            task=task,
            num_envs=num_envs,
            device=device,
            backend_init_time_ms=init_time_ms,
            memory_mb=memory_mb,
        )
        return env

    @classmethod
    def _load_backend_cls(cls, name: str) -> Type[SimulationEnv]:
        spec = cls._registry[name]
        if spec.cls is not None:
            return spec.cls
        if spec.module_path is None or spec.class_name is None:
            raise BackendRegistrationError(f"Incomplete backend spec for {name}")
        try:
            module = importlib.import_module(spec.module_path)
            backend_cls = getattr(module, spec.class_name)
        except Exception as err:
            raise BackendUnavailableError(
                f"Backend {name} unavailable: {err}"
            ) from err
        spec.cls = backend_cls
        return backend_cls

    @classmethod
    def _ensure_spaces(cls, env: SimulationEnv) -> Tuple[gym.Space, gym.Space]:
        action_space = getattr(env, "action_space", None)
        observation_space = getattr(env, "observation_space", None)
        if action_space is None or observation_space is None:
            obs = env.reset()
            if observation_space is None:
                observation_space = gym.spaces.Box(
                    low=-np.inf,
                    high=np.inf,
                    shape=obs.proprio.shape,
                    dtype=np.float32,
                )
                if hasattr(env, "_observation_space"):
                    env._observation_space = observation_space
            if action_space is None:
                if hasattr(env, "_action_space"):
                    action_space = env._action_space
                else:
                    raise SpaceMismatchError("Action space could not be inferred")
        return action_space, observation_space

    @classmethod
    def _validate_spaces(
        cls, task: str, action_space: gym.Space, observation_space: gym.Space
    ) -> None:
        if task not in cls._task_spaces:
            cls._task_spaces[task] = (action_space, observation_space)
            return
        expected_action, expected_obs = cls._task_spaces[task]
        if not cls._compatible_shape(action_space.shape, expected_action.shape):
            raise SpaceMismatchError(
                f"Action space mismatch for task {task}: "
                f"{action_space.shape} vs {expected_action.shape}"
            )
        if not cls._compatible_shape(observation_space.shape, expected_obs.shape):
            raise SpaceMismatchError(
                f"Observation space mismatch for task {task}: "
                f"{observation_space.shape} vs {expected_obs.shape}"
            )

    @staticmethod
    def _compatible_shape(shape_a: Tuple[int, ...], shape_b: Tuple[int, ...]) -> bool:
        if shape_a == shape_b:
            return True
        if len(shape_a) > 1 and shape_a[1:] == shape_b:
            return True
        if len(shape_b) > 1 and shape_b[1:] == shape_a:
            return True
        return False


class LoggedEnv(SimulationEnv):
    """Logging wrapper for SimulationEnv."""

    supports_vectorized = True

    def __init__(self, env: SimulationEnv, backend: str, task: str, correlation_id: str):
        self._env = env
        self._backend = backend
        self._task = task
        self.correlation_id = correlation_id

    def reset(self, seed: Optional[int] = None):
        start_time = time.perf_counter()
        obs = self._env.reset(seed=seed)
        reset_time_ms = (time.perf_counter() - start_time) * 1000.0
        log_event(
            "backend.reset",
            self.correlation_id,
            backend=self._backend,
            task=self._task,
            reset_time_ms=reset_time_ms,
        )
        return obs

    def step(self, action: np.ndarray):
        start_time = time.perf_counter()
        obs, reward, terminated, truncated, info = self._env.step(action)
        step_time = time.perf_counter() - start_time
        steps_per_second = (1.0 / step_time) if step_time > 0 else None
        log_event(
            "backend.step",
            self.correlation_id,
            backend=self._backend,
            task=self._task,
            steps_per_second=steps_per_second,
            step_time_ms=step_time * 1000.0,
        )
        return obs, reward, terminated, truncated, info

    def get_state(self):
        return self._env.get_state()

    def set_state(self, state):
        self._env.set_state(state)

    @property
    def action_space(self):
        return self._env.action_space

    @property
    def observation_space(self):
        return self._env.observation_space

    def update_dynamics(self, params: Dict[str, float]) -> None:
        self._env.update_dynamics(params)

    def update_visual(self, params: Dict[str, float]) -> None:
        self._env.update_visual(params)

    def update_sensors(self, params: Dict[str, float]) -> None:
        self._env.update_sensors(params)

    def update_action(self, params: Dict[str, float]) -> None:
        self._env.update_action(params)

    def close(self):
        self._env.close()


SimulationBackendFactory.register_backend(
    "dummy", "arcs.sim.backends.dummy", "DummyBackend"
)
SimulationBackendFactory.register_backend(
    "isaacgym", "arcs.sim.backends.isaacgym", "IsaacGymBackend"
)
SimulationBackendFactory.register_backend(
    "mujoco", "arcs.sim.backends.mujoco", "MuJoCoBackend"
)
SimulationBackendFactory.register_backend(
    "pybullet", "arcs.sim.backends.pybullet", "PyBulletBackend"
)
