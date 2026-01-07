"""Training service bridging API to existing RL training code."""

import logging
import threading
import time
from dataclasses import dataclass, field
from typing import Any, Callable
from uuid import uuid4

import numpy as np

from arcs.config import PPOConfig, TrainingConfig
from arcs.rl.ppo import PPO
from arcs.rl.policy import MLPPolicy
from arcs.sim.factory import SimulationBackendFactory

logger = logging.getLogger(__name__)


@dataclass
class TrainingMetrics:
    """Training metrics for a single update step."""
    step: int
    policy_loss: float
    value_loss: float
    kl: float
    entropy: float = 0.0
    explained_variance: float = 0.0
    episode_reward: float | None = None
    episode_length: int | None = None
    timestamp: float = field(default_factory=time.time)


@dataclass
class TrainingRun:
    """Training run state."""
    id: str
    config: dict[str, Any]
    status: str = "idle"  # idle, training, paused, completed, error
    current_step: int = 0
    total_steps: int = 0
    metrics: list[TrainingMetrics] = field(default_factory=list)
    start_time: float | None = None
    end_time: float | None = None
    error_message: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to JSON-serializable dict."""
        return {
            "id": self.id,
            "config": self.config,
            "status": self.status,
            "current_step": self.current_step,
            "total_steps": self.total_steps,
            "metrics_count": len(self.metrics),
            "start_time": self.start_time,
            "end_time": self.end_time,
            "error_message": self.error_message,
        }


class TrainingService:
    """Service for managing RL training runs."""

    def __init__(self):
        self._runs: dict[str, TrainingRun] = {}
        self._threads: dict[str, threading.Thread] = {}
        self._stop_flags: dict[str, threading.Event] = {}
        self._callbacks: dict[str, list[Callable[[TrainingMetrics], None]]] = {}
        logger.info("TrainingService initialized")

    def create_run(
        self,
        config: dict[str, Any],
        total_steps: int = 100000,
    ) -> TrainingRun:
        """Create a new training run."""
        run_id = str(uuid4())

        run = TrainingRun(
            id=run_id,
            config=config,
            total_steps=total_steps,
        )
        self._runs[run_id] = run
        self._callbacks[run_id] = []

        logger.info(f"Created training run {run_id}")
        return run

    def get_run(self, run_id: str) -> TrainingRun | None:
        """Get a training run by ID."""
        return self._runs.get(run_id)

    def list_runs(self) -> list[TrainingRun]:
        """List all training runs."""
        return list(self._runs.values())

    def start_run(self, run_id: str) -> bool:
        """Start a training run in a background thread."""
        run = self._runs.get(run_id)
        if not run:
            raise ValueError(f"Run {run_id} not found")

        if run.status == "training":
            return False

        # Create stop flag
        stop_flag = threading.Event()
        self._stop_flags[run_id] = stop_flag

        # Start training thread
        thread = threading.Thread(
            target=self._training_loop,
            args=(run, stop_flag),
            daemon=True,
        )
        self._threads[run_id] = thread

        run.status = "training"
        run.start_time = time.time()
        thread.start()

        logger.info(f"Started training run {run_id}")
        return True

    def stop_run(self, run_id: str) -> bool:
        """Stop a training run."""
        run = self._runs.get(run_id)
        if not run:
            raise ValueError(f"Run {run_id} not found")

        stop_flag = self._stop_flags.get(run_id)
        if stop_flag:
            stop_flag.set()
            run.status = "paused"
            run.end_time = time.time()
            logger.info(f"Stopped training run {run_id}")
            return True

        return False

    def delete_run(self, run_id: str) -> bool:
        """Delete a training run."""
        self.stop_run(run_id)

        run = self._runs.pop(run_id, None)
        self._threads.pop(run_id, None)
        self._stop_flags.pop(run_id, None)
        self._callbacks.pop(run_id, None)

        if run:
            logger.info(f"Deleted training run {run_id}")
            return True
        return False

    def get_metrics(
        self,
        run_id: str,
        offset: int = 0,
        limit: int = 100,
    ) -> list[TrainingMetrics]:
        """Get metrics for a training run."""
        run = self._runs.get(run_id)
        if not run:
            raise ValueError(f"Run {run_id} not found")

        return run.metrics[offset:offset + limit]

    def add_callback(
        self,
        run_id: str,
        callback: Callable[[TrainingMetrics], None],
    ) -> None:
        """Add a callback for training updates."""
        if run_id in self._callbacks:
            self._callbacks[run_id].append(callback)

    def remove_callback(
        self,
        run_id: str,
        callback: Callable[[TrainingMetrics], None],
    ) -> None:
        """Remove a callback."""
        if run_id in self._callbacks and callback in self._callbacks[run_id]:
            self._callbacks[run_id].remove(callback)

    def _training_loop(self, run: TrainingRun, stop_flag: threading.Event) -> None:
        """Background training loop."""
        try:
            config = run.config

            # Create environment
            factory = SimulationBackendFactory()
            env_config = config.get("env", {})
            env = factory.create(
                task=env_config.get("task", "Reach"),
                backend=env_config.get("backend", "dummy"),
                num_envs=env_config.get("num_envs", 1),
                device=env_config.get("device", "cpu"),
            )

            # Get observation/action dimensions
            obs_dim = env.observation_space.shape[0]
            act_dim = env.action_space.shape[0]

            # Create policy
            policy = MLPPolicy(
                obs_dim=obs_dim,
                act_dim=act_dim,
                hidden_dims=[256, 256],
            )

            # Create PPO trainer
            ppo_config = config.get("ppo", {})
            ppo = PPO(
                policy=policy,
                lr=ppo_config.get("lr", 3e-4),
                clip_ratio=ppo_config.get("clip_ratio", 0.2),
                gamma=ppo_config.get("gamma", 0.99),
                gae_lambda=ppo_config.get("gae_lambda", 0.95),
                entropy_coef=ppo_config.get("entropy_coef", 0.01),
                vf_coef=ppo_config.get("vf_coef", 0.5),
                update_epochs=ppo_config.get("update_epochs", 10),
                batch_size=ppo_config.get("batch_size", 64),
            )

            # Training loop
            obs = env.reset()
            episode_reward = 0.0
            episode_length = 0

            while run.current_step < run.total_steps and not stop_flag.is_set():
                # Collect experience
                for _ in range(ppo_config.get("steps_per_update", 2048)):
                    if stop_flag.is_set():
                        break

                    action, log_prob, _, value = policy.get_action_and_value(
                        obs.proprio if hasattr(obs, 'proprio') else obs
                    )

                    next_obs, reward, terminated, truncated, info = env.step(action)

                    episode_reward += float(reward)
                    episode_length += 1
                    run.current_step += 1

                    # Store in buffer
                    ppo.buffer.store(
                        obs=obs.proprio if hasattr(obs, 'proprio') else obs,
                        act=action,
                        rew=reward,
                        val=value,
                        logp=log_prob,
                        done=terminated or truncated,
                    )

                    obs = next_obs

                    if terminated or truncated:
                        # Episode complete
                        metrics = TrainingMetrics(
                            step=run.current_step,
                            policy_loss=0.0,
                            value_loss=0.0,
                            kl=0.0,
                            episode_reward=episode_reward,
                            episode_length=episode_length,
                        )
                        run.metrics.append(metrics)
                        self._notify_callbacks(run.id, metrics)

                        episode_reward = 0.0
                        episode_length = 0
                        obs = env.reset()

                # Update policy
                if not stop_flag.is_set() and len(ppo.buffer) > 0:
                    update_info = ppo.update()

                    metrics = TrainingMetrics(
                        step=run.current_step,
                        policy_loss=update_info.get("policy_loss", 0.0),
                        value_loss=update_info.get("value_loss", 0.0),
                        kl=update_info.get("kl", 0.0),
                        entropy=update_info.get("entropy", 0.0),
                    )
                    run.metrics.append(metrics)
                    self._notify_callbacks(run.id, metrics)

            # Training complete
            env.close()
            run.status = "completed"
            run.end_time = time.time()
            logger.info(f"Training run {run.id} completed")

        except Exception as e:
            logger.exception(f"Training run {run.id} failed: {e}")
            run.status = "error"
            run.error_message = str(e)
            run.end_time = time.time()

    def _notify_callbacks(self, run_id: str, metrics: TrainingMetrics) -> None:
        """Notify all callbacks for a run."""
        for callback in self._callbacks.get(run_id, []):
            try:
                callback(metrics)
            except Exception as e:
                logger.warning(f"Callback error: {e}")
