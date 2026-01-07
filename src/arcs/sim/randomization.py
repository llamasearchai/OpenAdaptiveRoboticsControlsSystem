from dataclasses import dataclass, field
from typing import Dict, Optional, Tuple, Literal
from collections import deque

import numpy as np

from arcs.sim.interfaces import Observation, SimulationEnv
from arcs.utils.logging import log_event, new_correlation_id


DistributionKind = Literal["uniform", "normal", "truncated_normal"]
ScheduleKind = Literal["fixed", "curriculum"]


@dataclass
class Distribution:
    kind: DistributionKind = "uniform"
    low: Optional[float] = None
    high: Optional[float] = None
    mean: float = 0.0
    std: float = 1.0

    def sample(self, rng: np.random.Generator, scale: float = 1.0) -> float:
        if self.kind == "uniform":
            if self.low is None or self.high is None:
                raise ValueError("Uniform distribution requires low/high")
            if self.low > self.high:
                raise ValueError("Uniform distribution requires low <= high")
            mid = 0.5 * (self.low + self.high)
            half = 0.5 * (self.high - self.low) * max(0.0, scale)
            return rng.uniform(mid - half, mid + half)
        if self.kind == "normal":
            return rng.normal(self.mean, self.std * max(0.0, scale))
        if self.kind == "truncated_normal":
            if self.low is None or self.high is None:
                raise ValueError("Truncated normal requires low/high")
            if self.low > self.high:
                raise ValueError("Truncated normal requires low <= high")
            value = rng.normal(self.mean, self.std * max(0.0, scale))
            return float(np.clip(value, self.low, self.high))
        raise ValueError(f"Unsupported distribution kind: {self.kind}")


@dataclass
class Schedule:
    kind: ScheduleKind = "fixed"
    start: float = 0.0
    end: float = 1.0
    steps: int = 1

    def scale(self, step: int, progress: float) -> float:
        if self.kind == "fixed":
            return 1.0
        if self.kind == "curriculum":
            if self.steps <= 0:
                return self.end
            phase = min(1.0, step / float(self.steps))
            return self.start + (self.end - self.start) * min(1.0, phase * progress)
        raise ValueError(f"Unsupported schedule kind: {self.kind}")


@dataclass
class RandomizationParam:
    distribution: Distribution
    schedule: Schedule = field(default_factory=Schedule)

    def sample(self, rng: np.random.Generator, step: int, progress: float) -> float:
        scale = self.schedule.scale(step=step, progress=progress)
        return self.distribution.sample(rng, scale=scale)


@dataclass
class DynamicsRandomizationConfig:
    mass_scale: RandomizationParam = field(
        default_factory=lambda: RandomizationParam(
            Distribution(kind="uniform", low=0.8, high=1.2)
        )
    )
    friction_scale: RandomizationParam = field(
        default_factory=lambda: RandomizationParam(
            Distribution(kind="uniform", low=0.5, high=1.5)
        )
    )
    damping_scale: RandomizationParam = field(
        default_factory=lambda: RandomizationParam(
            Distribution(kind="uniform", low=0.8, high=1.2)
        )
    )


@dataclass
class VisualRandomizationConfig:
    lighting_intensity: RandomizationParam = field(
        default_factory=lambda: RandomizationParam(
            Distribution(kind="uniform", low=0.5, high=2.0)
        )
    )


@dataclass
class SensorRandomizationConfig:
    joint_position_noise: RandomizationParam = field(
        default_factory=lambda: RandomizationParam(
            Distribution(kind="normal", mean=0.0, std=0.001)
        )
    )
    joint_velocity_noise: RandomizationParam = field(
        default_factory=lambda: RandomizationParam(
            Distribution(kind="normal", mean=0.0, std=0.01)
        )
    )
    force_torque_noise: RandomizationParam = field(
        default_factory=lambda: RandomizationParam(
            Distribution(kind="normal", mean=0.0, std=0.5)
        )
    )
    camera_latency_s: RandomizationParam = field(
        default_factory=lambda: RandomizationParam(
            Distribution(kind="uniform", low=0.0, high=0.05)
        )
    )


@dataclass
class ActionRandomizationConfig:
    latency_s: RandomizationParam = field(
        default_factory=lambda: RandomizationParam(
            Distribution(kind="uniform", low=0.0, high=0.03)
        )
    )
    dropout_prob: RandomizationParam = field(
        default_factory=lambda: RandomizationParam(
            Distribution(kind="uniform", low=0.0, high=0.01)
        )
    )


@dataclass
class RandomizationConfig:
    dynamics: DynamicsRandomizationConfig = field(default_factory=DynamicsRandomizationConfig)
    visual: VisualRandomizationConfig = field(default_factory=VisualRandomizationConfig)
    sensor: SensorRandomizationConfig = field(default_factory=SensorRandomizationConfig)
    action: ActionRandomizationConfig = field(default_factory=ActionRandomizationConfig)


class DomainRandomizer:
    """Applies structured randomization to the simulation environment."""

    def __init__(
        self,
        config: Optional[RandomizationConfig] = None,
        control_freq: int = 30,
        seed: Optional[int] = None,
    ):
        self.config = config or RandomizationConfig()
        self.control_freq = control_freq
        self._rng = np.random.default_rng(seed)
        self._episode = 0
        self._step = 0
        self._curriculum_progress = 1.0

    def set_curriculum_progress(self, progress: float) -> None:
        self._curriculum_progress = float(np.clip(progress, 0.0, 1.0))

    def randomize_episode(self, env: SimulationEnv) -> Dict[str, Dict[str, float]]:
        self._episode += 1
        params = {
            "dynamics": {
                "mass_scale": self.config.dynamics.mass_scale.sample(
                    self._rng, self._episode, self._curriculum_progress
                ),
                "friction_scale": self.config.dynamics.friction_scale.sample(
                    self._rng, self._episode, self._curriculum_progress
                ),
                "damping_scale": self.config.dynamics.damping_scale.sample(
                    self._rng, self._episode, self._curriculum_progress
                ),
            },
            "visual": {
                "lighting_intensity": self.config.visual.lighting_intensity.sample(
                    self._rng, self._episode, self._curriculum_progress
                )
            },
        }
        env.update_dynamics(params["dynamics"])
        env.update_visual(params["visual"])
        correlation_id = getattr(env, "correlation_id", None) or new_correlation_id()
        log_event(
            "randomization.episode",
            correlation_id,
            randomization_params=params,
            curriculum_stage=self._curriculum_progress,
        )
        return params

    def randomize_step(self, env: SimulationEnv) -> Dict[str, Dict[str, float]]:
        self._step += 1
        params = {
            "sensor": {
                "joint_position_noise": self.config.sensor.joint_position_noise.sample(
                    self._rng, self._step, self._curriculum_progress
                ),
                "joint_velocity_noise": self.config.sensor.joint_velocity_noise.sample(
                    self._rng, self._step, self._curriculum_progress
                ),
                "force_torque_noise": self.config.sensor.force_torque_noise.sample(
                    self._rng, self._step, self._curriculum_progress
                ),
                "camera_latency_s": self.config.sensor.camera_latency_s.sample(
                    self._rng, self._step, self._curriculum_progress
                ),
            },
            "action": {
                "latency_s": self.config.action.latency_s.sample(
                    self._rng, self._step, self._curriculum_progress
                ),
                "dropout_prob": float(
                    np.clip(
                        self.config.action.dropout_prob.sample(
                            self._rng, self._step, self._curriculum_progress
                        ),
                        0.0,
                        1.0,
                    )
                ),
            },
        }
        env.update_sensors(params["sensor"])
        env.update_action(params["action"])
        correlation_id = getattr(env, "correlation_id", None) or new_correlation_id()
        log_event(
            "randomization.step",
            correlation_id,
            randomization_params=params,
            curriculum_stage=self._curriculum_progress,
        )
        return params

    def apply_action(
        self,
        action: np.ndarray,
        params: Dict[str, Dict[str, float]],
        action_queue: deque,
    ) -> np.ndarray:
        latency_s = params.get("action", {}).get("latency_s", 0.0)
        dropout_prob = params.get("action", {}).get("dropout_prob", 0.0)
        if self._rng.random() < dropout_prob:
            action = np.zeros_like(action)
        delay_steps = int(round(latency_s * self.control_freq))
        if delay_steps <= 0:
            return action
        action_queue.append(action)
        if len(action_queue) <= delay_steps:
            return np.zeros_like(action)
        return action_queue.popleft()

    def apply_observation(
        self,
        obs: Observation,
        params: Dict[str, Dict[str, float]],
        camera_queue: deque,
    ) -> Observation:
        sensor_params = params.get("sensor", {})
        noise_scale = sensor_params.get("joint_position_noise", 0.0)
        obs.proprio = obs.proprio + self._rng.normal(
            0.0, noise_scale, size=obs.proprio.shape
        )
        if obs.tactile is not None:
            tactile_noise = sensor_params.get("force_torque_noise", 0.0)
            obs.tactile = obs.tactile + self._rng.normal(
                0.0, tactile_noise, size=obs.tactile.shape
            )
        latency_s = sensor_params.get("camera_latency_s", 0.0)
        delay_steps = int(round(latency_s * self.control_freq))
        if delay_steps > 0 and obs.rgb is not None:
            camera_queue.append((obs.rgb, obs.depth))
            if len(camera_queue) <= delay_steps:
                obs.rgb = None
                obs.depth = None
            else:
                obs.rgb, obs.depth = camera_queue.popleft()
        return obs


class AutomaticDomainRandomization:
    """Simple ADR controller that expands ranges based on success rate."""

    def __init__(
        self,
        randomizer: DomainRandomizer,
        success_threshold: float = 0.8,
        progress_increment: float = 0.1,
    ):
        self.randomizer = randomizer
        self.success_threshold = success_threshold
        self.progress_increment = progress_increment
        self.progress = 0.0

    def update(self, success_rate: float) -> float:
        if success_rate >= self.success_threshold:
            self.progress = min(1.0, self.progress + self.progress_increment)
            self.randomizer.set_curriculum_progress(self.progress)
        return self.progress


class RandomizationWrapper(SimulationEnv):
    """Applies domain randomization hooks on reset/step."""

    supports_vectorized = True

    def __init__(self, env: SimulationEnv, randomizer: DomainRandomizer):
        self._env = env
        self._randomizer = randomizer
        self._action_queue: deque = deque()
        self._camera_queue: deque = deque()
        self.correlation_id = getattr(env, "correlation_id", None)

    def reset(self, seed: Optional[int] = None) -> Observation:
        obs = self._env.reset(seed=seed)
        self._action_queue.clear()
        self._camera_queue.clear()
        episode_params = self._randomizer.randomize_episode(self._env)
        obs.metadata["randomization_episode"] = episode_params
        return obs

    def step(self, action: np.ndarray):
        step_params = self._randomizer.randomize_step(self._env)
        action = self._randomizer.apply_action(action, step_params, self._action_queue)
        obs, reward, terminated, truncated, info = self._env.step(action)
        obs = self._randomizer.apply_observation(obs, step_params, self._camera_queue)
        obs.metadata["randomization_step"] = step_params
        info["randomization"] = step_params
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
