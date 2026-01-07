"""Training-related schemas."""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class PPOConfigSchema(BaseModel):
    """PPO algorithm configuration."""

    lr: float = Field(default=3e-4, gt=0, le=1, description="Learning rate")
    clip_ratio: float = Field(default=0.2, gt=0, lt=1, description="PPO clip ratio")
    gamma: float = Field(default=0.99, gt=0, le=1, description="Discount factor")
    gae_lambda: float = Field(default=0.95, ge=0, le=1, description="GAE lambda")
    entropy_coef: float = Field(default=0.01, ge=0, description="Entropy coefficient")
    vf_coef: float = Field(default=0.5, gt=0, description="Value function coefficient")
    update_epochs: int = Field(default=10, ge=1, le=100, description="PPO update epochs")
    batch_size: int = Field(default=64, ge=1, le=8192, description="Batch size")
    steps_per_update: int = Field(default=2048, ge=64, description="Steps per update")


class SACConfigSchema(BaseModel):
    """SAC algorithm configuration."""

    lr: float = Field(default=3e-4, gt=0, le=1, description="Learning rate")
    gamma: float = Field(default=0.99, gt=0, le=1, description="Discount factor")
    tau: float = Field(default=0.005, gt=0, lt=1, description="Target network update rate")
    alpha: float = Field(default=0.2, gt=0, description="Entropy coefficient")


class EnvConfigSchema(BaseModel):
    """Environment configuration."""

    task: Literal["Reach", "Pick", "Place", "Push"] = Field(default="Reach")
    backend: Literal["dummy", "isaacgym", "mujoco", "pybullet"] = Field(default="dummy")
    num_envs: int = Field(default=1, ge=1, le=4096)
    device: Literal["cpu", "cuda"] = Field(default="cpu")


class TrainingConfigSchema(BaseModel):
    """Complete training configuration."""

    ppo: PPOConfigSchema = Field(default_factory=PPOConfigSchema)
    sac: SACConfigSchema = Field(default_factory=SACConfigSchema)
    env: EnvConfigSchema = Field(default_factory=EnvConfigSchema)
    algorithm: Literal["ppo", "sac"] = Field(default="ppo")


class StartTrainingRequest(BaseModel):
    """Request to start a training run."""

    config: TrainingConfigSchema = Field(default_factory=TrainingConfigSchema)
    total_steps: int = Field(default=100000, ge=1000, description="Total training steps")
    checkpoint_interval: int | None = Field(default=10000, description="Checkpoint save interval")
    log_interval: int = Field(default=100, description="Logging interval")


class TrainingMetricsResponse(BaseModel):
    """Training metrics response."""

    step: int = Field(..., description="Training step")
    policy_loss: float = Field(..., description="Policy loss")
    value_loss: float = Field(..., description="Value function loss")
    kl: float = Field(..., description="KL divergence")
    entropy: float = Field(default=0.0, description="Policy entropy")
    explained_variance: float = Field(default=0.0, description="Explained variance")
    episode_reward: float | None = Field(default=None, description="Episode reward")
    episode_length: int | None = Field(default=None, description="Episode length")
    timestamp: float = Field(..., description="Metric timestamp")


class TrainingRunResponse(BaseModel):
    """Training run response."""

    id: str = Field(..., description="Run ID")
    config: dict[str, Any] = Field(..., description="Training configuration")
    status: Literal["idle", "training", "paused", "completed", "error"] = Field(
        default="idle",
        description="Run status"
    )
    current_step: int = Field(default=0, description="Current training step")
    total_steps: int = Field(..., description="Total training steps")
    metrics_count: int = Field(default=0, description="Number of recorded metrics")
    start_time: float | None = Field(default=None, description="Start timestamp")
    end_time: float | None = Field(default=None, description="End timestamp")
    error_message: str | None = Field(default=None, description="Error message if failed")
    created_at: datetime = Field(default_factory=datetime.utcnow)
