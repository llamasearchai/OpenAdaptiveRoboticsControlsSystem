"""Datasets API router."""

import logging
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query, status

from arcs.api.dependencies import RequestId
from arcs.api.schemas.datasets import (
    DatasetSummary,
    DatasetStatistics,
    DatasetListResponse,
    ProcessDatasetRequest,
    DemonstrationResponse,
)
from arcs.api.schemas.common import ApiResponse, ApiMeta

logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory dataset registry (would be replaced with database in production)
_datasets: dict[str, DatasetSummary] = {}


@router.get(
    "",
    response_model=ApiResponse[DatasetListResponse],
)
async def list_datasets(
    request_id: RequestId,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
) -> ApiResponse[DatasetListResponse]:
    """List all datasets."""
    all_datasets = list(_datasets.values())
    paginated = all_datasets[offset:offset + limit]

    return ApiResponse(
        data=DatasetListResponse(
            datasets=paginated,
            total=len(all_datasets),
        ),
        meta=ApiMeta(request_id=request_id),
    )


@router.get(
    "/{dataset_id}",
    response_model=ApiResponse[DatasetSummary],
)
async def get_dataset(
    dataset_id: str,
    request_id: RequestId,
) -> ApiResponse[DatasetSummary]:
    """Get dataset by ID."""
    dataset = _datasets.get(dataset_id)

    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset {dataset_id} not found",
        )

    return ApiResponse(
        data=dataset,
        meta=ApiMeta(request_id=request_id),
    )


@router.post(
    "/register",
    response_model=ApiResponse[DatasetSummary],
    status_code=status.HTTP_201_CREATED,
)
async def register_dataset(
    path: str,
    name: str | None = None,
    request_id: RequestId = "",
) -> ApiResponse[DatasetSummary]:
    """Register an existing HDF5 dataset file."""
    try:
        from arcs.imitation.dataset import DemonstrationDataset

        # Validate path exists
        dataset_path = Path(path)
        if not dataset_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Dataset file not found: {path}",
            )

        # Load dataset to get statistics
        dataset = DemonstrationDataset(str(dataset_path))

        dataset_id = str(uuid4())
        summary = DatasetSummary(
            id=dataset_id,
            name=name or dataset_path.stem,
            path=str(dataset_path),
            num_demonstrations=len(dataset),
            total_transitions=sum(len(d) for d in dataset.demonstrations),
            success_rate=dataset.success_rate if hasattr(dataset, 'success_rate') else 1.0,
        )

        _datasets[dataset_id] = summary

        return ApiResponse(
            data=summary,
            meta=ApiMeta(request_id=request_id),
        )
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Dataset module not available",
        )
    except Exception as e:
        logger.exception(f"Failed to register dataset: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.delete(
    "/{dataset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def unregister_dataset(
    dataset_id: str,
) -> None:
    """Unregister a dataset (does not delete the file)."""
    if dataset_id not in _datasets:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset {dataset_id} not found",
        )

    del _datasets[dataset_id]


@router.get(
    "/{dataset_id}/statistics",
    response_model=ApiResponse[DatasetStatistics],
)
async def get_dataset_statistics(
    dataset_id: str,
    request_id: RequestId,
) -> ApiResponse[DatasetStatistics]:
    """Get dataset statistics."""
    dataset_info = _datasets.get(dataset_id)

    if not dataset_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset {dataset_id} not found",
        )

    try:
        from arcs.imitation.dataset import DemonstrationDataset

        dataset = DemonstrationDataset(dataset_info.path)
        stats = dataset.compute_statistics()

        return ApiResponse(
            data=DatasetStatistics(
                obs_mean=stats["obs_mean"].tolist(),
                obs_std=stats["obs_std"].tolist(),
                act_mean=stats["act_mean"].tolist(),
                act_std=stats["act_std"].tolist(),
            ),
            meta=ApiMeta(request_id=request_id),
        )
    except Exception as e:
        logger.exception(f"Failed to compute statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post(
    "/{dataset_id}/process",
    response_model=ApiResponse[DatasetSummary],
)
async def process_dataset(
    dataset_id: str,
    request: ProcessDatasetRequest,
    request_id: RequestId,
) -> ApiResponse[DatasetSummary]:
    """Process/filter a dataset."""
    dataset_info = _datasets.get(dataset_id)

    if not dataset_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset {dataset_id} not found",
        )

    try:
        from arcs.imitation.dataset import DemonstrationDataset

        dataset = DemonstrationDataset(dataset_info.path)

        # Apply filters
        filter_opts = request.filter_options
        if filter_opts.success_filter is not None:
            dataset = dataset.filter_by_success(filter_opts.success_filter)
        if filter_opts.smoothness_filter is not None:
            dataset = dataset.filter_by_smoothness(filter_opts.smoothness_filter)
        if filter_opts.trim_idle:
            dataset = dataset.trim_idle_frames(filter_opts.velocity_threshold)

        # Apply augmentation
        if request.augmentation_options:
            aug_opts = request.augmentation_options
            dataset = dataset.augment(
                noise_std=aug_opts.pose_noise_std,
                factor=aug_opts.factor,
            )

        # Save to new path if provided
        output_path = request.output_path or f"{dataset_info.path}.processed"
        dataset.save(output_path)

        # Register processed dataset
        new_id = str(uuid4())
        new_summary = DatasetSummary(
            id=new_id,
            name=f"{dataset_info.name}_processed",
            path=output_path,
            num_demonstrations=len(dataset),
            total_transitions=sum(len(d) for d in dataset.demonstrations),
            success_rate=1.0,
        )
        _datasets[new_id] = new_summary

        return ApiResponse(
            data=new_summary,
            meta=ApiMeta(request_id=request_id),
        )
    except Exception as e:
        logger.exception(f"Failed to process dataset: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )
