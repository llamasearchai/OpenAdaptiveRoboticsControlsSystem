"""Simulation-related schemas."""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class SimulationConfig(BaseModel):
    """Configuration for creating a simulation session."""

    task: Literal["Reach", "Pick", "Place", "Push"] = Field(
        default="Reach",
        description="Simulation task type"
    )
    backend: Literal["dummy", "isaacgym", "mujoco", "pybullet"] = Field(
        default="dummy",
        description="Simulation backend"
    )
    num_envs: int = Field(
        default=1,
        ge=1,
        le=4096,
        description="Number of parallel environments"
    )
    device: Literal["cpu", "cuda"] = Field(
        default="cpu",
        description="Compute device"
    )


class SimulationSessionResponse(BaseModel):
    """Simulation session response."""

    id: str = Field(..., description="Session ID")
    task: str = Field(..., description="Task type")
    backend: str = Field(..., description="Backend type")
    status: Literal["idle", "running", "paused", "completed", "error"] = Field(
        default="idle",
        description="Session status"
    )
    current_step: int = Field(default=0, description="Current simulation step")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ObservationResponse(BaseModel):
    """Observation from the simulation."""

    proprio: list[float] = Field(..., description="Proprioceptive state (joint angles, velocities)")
    rgb: list[list[list[float]]] | None = Field(default=None, description="RGB image [H, W, 3]")
    depth: list[list[float]] | None = Field(default=None, description="Depth image [H, W]")
    tactile: list[float] | None = Field(default=None, description="Tactile sensor readings")
    timestep: int = Field(..., description="Simulation timestep")
    metadata: dict[str, Any] = Field(default_factory=dict)


class StateResponse(BaseModel):
    """Simulation state response."""

    joint_pos: list[float] = Field(..., description="Joint positions (7 DOF)")
    joint_vel: list[float] = Field(..., description="Joint velocities (7 DOF)")
    object_states: dict[str, list[float]] = Field(
        default_factory=dict,
        description="Object states"
    )
    timestamp: float = Field(..., description="State timestamp")


class ResetRequest(BaseModel):
    """Request to reset simulation."""

    seed: int | None = Field(default=None, description="Random seed for reset")


class StepRequest(BaseModel):
    """Request to step simulation."""

    action: list[float] = Field(
        ...,
        min_length=7,
        max_length=7,
        description="Action vector (7 DOF joint commands)"
    )


class StepResponse(BaseModel):
    """Response from simulation step."""

    observation: ObservationResponse
    reward: float = Field(..., description="Step reward")
    terminated: bool = Field(..., description="Episode terminated")
    truncated: bool = Field(..., description="Episode truncated")
    info: dict[str, Any] = Field(default_factory=dict, description="Additional info")
