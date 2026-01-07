"""Dataset-related schemas."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class DatasetConfig(BaseModel):
    """Dataset configuration."""

    min_success_rate: float = Field(
        default=1.0,
        ge=0,
        le=1,
        description="Minimum success rate filter"
    )
    max_jerk: float = Field(
        default=10.0,
        gt=0,
        description="Maximum jerk filter for smoothness"
    )
    augmentation_factor: int = Field(
        default=0,
        ge=0,
        description="Augmentation factor (0 = no augmentation)"
    )


class DatasetFilterOptions(BaseModel):
    """Dataset filtering options."""

    success_filter: float | None = Field(default=None, ge=0, le=1)
    smoothness_filter: float | None = Field(default=None, gt=0)
    trim_idle: bool = Field(default=False)
    velocity_threshold: float = Field(default=0.01, gt=0)


class AugmentationOptions(BaseModel):
    """Dataset augmentation options."""

    pose_noise_std: float = Field(default=0.01, ge=0)
    factor: int = Field(default=1, ge=1)


class DemonstrationMetadata(BaseModel):
    """Demonstration metadata."""

    task: str
    success: bool
    success_rate: float | None = None
    timestamp: float
    duration: float
    demonstrator_id: str | None = None


class DemonstrationResponse(BaseModel):
    """Single demonstration response."""

    id: str
    num_transitions: int = Field(..., description="Number of transitions")
    metadata: DemonstrationMetadata


class DatasetSummary(BaseModel):
    """Dataset summary response."""

    id: str = Field(..., description="Dataset ID")
    name: str = Field(..., description="Dataset name")
    path: str = Field(..., description="File path")
    num_demonstrations: int = Field(..., description="Number of demonstrations")
    total_transitions: int = Field(..., description="Total transitions")
    success_rate: float = Field(..., description="Overall success rate")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    config: DatasetConfig = Field(default_factory=DatasetConfig)


class DatasetStatistics(BaseModel):
    """Dataset statistics."""

    obs_mean: list[float] = Field(..., description="Observation mean")
    obs_std: list[float] = Field(..., description="Observation std")
    act_mean: list[float] = Field(..., description="Action mean")
    act_std: list[float] = Field(..., description="Action std")


class DatasetListResponse(BaseModel):
    """Dataset list response."""

    datasets: list[DatasetSummary]
    total: int


class ProcessDatasetRequest(BaseModel):
    """Request to process/filter dataset."""

    filter_options: DatasetFilterOptions = Field(default_factory=DatasetFilterOptions)
    augmentation_options: AugmentationOptions | None = None
    output_path: str | None = Field(default=None, description="Output path for processed dataset")
