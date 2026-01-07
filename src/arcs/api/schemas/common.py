"""Common schema definitions."""

from datetime import datetime
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class ApiMeta(BaseModel):
    """API response metadata."""

    request_id: str = Field(..., description="Request correlation ID")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    processing_time_ms: float | None = Field(default=None, description="Processing time in milliseconds")


class ApiResponse(BaseModel, Generic[T]):
    """Generic API response wrapper."""

    data: T
    meta: ApiMeta | None = None


class ErrorDetail(BaseModel):
    """Error detail."""

    field: str | None = None
    message: str
    code: str | None = None


class ErrorResponse(BaseModel):
    """API error response."""

    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Human-readable error message")
    details: list[ErrorDetail] | None = None
    request_id: str | None = None


class PaginationMeta(BaseModel):
    """Pagination metadata."""

    page: int = Field(..., ge=0)
    page_size: int = Field(..., ge=1, le=100)
    total_count: int = Field(..., ge=0)
    total_pages: int = Field(..., ge=0)
    has_next: bool
    has_previous: bool


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated API response."""

    items: list[T]
    pagination: PaginationMeta


class Vector3(BaseModel):
    """3D vector."""

    x: float
    y: float
    z: float

    def to_list(self) -> list[float]:
        return [self.x, self.y, self.z]

    @classmethod
    def from_list(cls, values: list[float]) -> "Vector3":
        return cls(x=values[0], y=values[1], z=values[2])


class Quaternion(BaseModel):
    """Quaternion (x, y, z, w)."""

    x: float
    y: float
    z: float
    w: float

    def to_list(self) -> list[float]:
        return [self.x, self.y, self.z, self.w]

    @classmethod
    def from_list(cls, values: list[float]) -> "Quaternion":
        return cls(x=values[0], y=values[1], z=values[2], w=values[3])


class SE3Pose(BaseModel):
    """SE3 pose (position + orientation)."""

    position: Vector3
    orientation: Quaternion
