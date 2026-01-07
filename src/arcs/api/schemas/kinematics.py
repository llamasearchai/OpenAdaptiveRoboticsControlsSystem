"""Kinematics-related schemas."""

from pydantic import BaseModel, Field


class FKRequest(BaseModel):
    """Forward kinematics request."""

    joint_angles: list[float] = Field(
        ...,
        min_length=7,
        max_length=7,
        description="Joint angles in radians (7 DOF)"
    )
    link_name: str | None = Field(
        default=None,
        description="Target link name (default: end effector)"
    )
    urdf_path: str | None = Field(
        default=None,
        description="Path to URDF file"
    )


class FKResponse(BaseModel):
    """Forward kinematics response."""

    position: list[float] = Field(..., description="End effector position [x, y, z]")
    quaternion: list[float] = Field(..., description="Orientation quaternion [x, y, z, w]")
    matrix: list[list[float]] = Field(..., description="4x4 transformation matrix")


class IKRequest(BaseModel):
    """Inverse kinematics request."""

    target_position: list[float] = Field(
        ...,
        min_length=3,
        max_length=3,
        description="Target position [x, y, z]"
    )
    target_quaternion: list[float] | None = Field(
        default=None,
        min_length=4,
        max_length=4,
        description="Target orientation quaternion [x, y, z, w]"
    )
    initial_joints: list[float] | None = Field(
        default=None,
        min_length=7,
        max_length=7,
        description="Initial joint angles for solver"
    )
    urdf_path: str | None = Field(
        default=None,
        description="Path to URDF file"
    )
    max_iterations: int = Field(
        default=100,
        ge=1,
        le=1000,
        description="Maximum solver iterations"
    )
    tolerance: float = Field(
        default=1e-6,
        gt=0,
        description="Convergence tolerance"
    )


class IKResponse(BaseModel):
    """Inverse kinematics response."""

    joint_angles: list[float] | None = Field(
        default=None,
        description="Solved joint angles (None if not converged)"
    )
    converged: bool = Field(..., description="Whether solver converged")
    iterations: int = Field(..., description="Number of iterations")
    error: float = Field(..., description="Final error")


class JacobianRequest(BaseModel):
    """Jacobian computation request."""

    joint_angles: list[float] = Field(
        ...,
        min_length=7,
        max_length=7,
        description="Joint angles in radians (7 DOF)"
    )
    urdf_path: str | None = Field(
        default=None,
        description="Path to URDF file"
    )


class JacobianResponse(BaseModel):
    """Jacobian computation response."""

    jacobian: list[list[float]] = Field(..., description="6x7 Jacobian matrix")
    condition_number: float = Field(..., description="Matrix condition number")
    shape: list[int] = Field(..., description="Matrix shape [rows, cols]")


class JointLimitsResponse(BaseModel):
    """Joint limits response."""

    joints: list[dict] = Field(..., description="Joint limit information")
    num_joints: int = Field(..., description="Number of joints")


class JointLimitCheckRequest(BaseModel):
    """Joint limit check request."""

    joint_angles: list[float] = Field(
        ...,
        min_length=7,
        max_length=7,
        description="Joint angles to check"
    )
    urdf_path: str | None = Field(default=None)


class JointLimitCheckResponse(BaseModel):
    """Joint limit check response."""

    valid: bool = Field(..., description="Whether all joints are within limits")
    violations: list[dict] = Field(default_factory=list, description="Limit violations")
