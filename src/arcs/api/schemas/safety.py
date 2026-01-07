"""Safety-related schemas."""

from pydantic import BaseModel, Field


class JointLimits(BaseModel):
    """Joint limits configuration."""

    pos_min: list[float] = Field(
        ...,
        min_length=7,
        max_length=7,
        description="Minimum joint positions"
    )
    pos_max: list[float] = Field(
        ...,
        min_length=7,
        max_length=7,
        description="Maximum joint positions"
    )
    vel_max: list[float] = Field(
        ...,
        min_length=7,
        max_length=7,
        description="Maximum joint velocities"
    )
    torque_max: list[float] = Field(
        ...,
        min_length=7,
        max_length=7,
        description="Maximum joint torques"
    )


class WorkspaceBounds(BaseModel):
    """Workspace bounding box."""

    lower: list[float] = Field(
        ...,
        min_length=3,
        max_length=3,
        description="Lower bounds [x, y, z]"
    )
    upper: list[float] = Field(
        ...,
        min_length=3,
        max_length=3,
        description="Upper bounds [x, y, z]"
    )


class SafetyConfigSchema(BaseModel):
    """Safety filter configuration."""

    joint_limits: JointLimits
    workspace_bounds: WorkspaceBounds | None = None
    dt: float = Field(default=0.01, gt=0, description="Time step")
    use_qp: bool = Field(default=True, description="Use QP solver")
    solver_timeout: float = Field(default=0.001, gt=0, description="Solver timeout (seconds)")


class SafetyFilterRequest(BaseModel):
    """Request to filter an action through safety."""

    action: list[float] = Field(
        ...,
        min_length=7,
        max_length=7,
        description="Action to filter (7 DOF)"
    )
    joint_pos: list[float] = Field(
        ...,
        min_length=7,
        max_length=7,
        description="Current joint positions"
    )
    joint_vel: list[float] | None = Field(
        default=None,
        min_length=7,
        max_length=7,
        description="Current joint velocities"
    )
    ee_pos: list[float] | None = Field(
        default=None,
        min_length=3,
        max_length=3,
        description="End effector position"
    )


class SafetyFilterResponse(BaseModel):
    """Safety filter response."""

    safe_action: list[float] = Field(..., description="Filtered safe action")
    original_action: list[float] = Field(..., description="Original action")
    clipped_joints: list[int] = Field(
        default_factory=list,
        description="Indices of clipped joints"
    )
    constraint_violations_count: int = Field(
        default=0,
        description="Number of constraint violations"
    )
    filter_time_us: float = Field(..., description="Filter time in microseconds")
    qp_iterations: int = Field(default=0, description="QP solver iterations")


class SafetyStatusResponse(BaseModel):
    """Safety system status."""

    enabled: bool = Field(..., description="Whether safety filter is enabled")
    config: SafetyConfigSchema | None = Field(default=None, description="Current configuration")
    total_filtered: int = Field(default=0, description="Total actions filtered")
    total_violations: int = Field(default=0, description="Total constraint violations")
