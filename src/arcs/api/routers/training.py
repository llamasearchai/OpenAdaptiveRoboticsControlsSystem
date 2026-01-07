"""Training API router."""

import logging

from fastapi import APIRouter, HTTPException, Query, status

from arcs.api.dependencies import TrainingServiceDep, RequestId
from arcs.api.schemas.training import (
    StartTrainingRequest,
    TrainingRunResponse,
    TrainingMetricsResponse,
)
from arcs.api.schemas.common import ApiResponse, ApiMeta, PaginatedResponse, PaginationMeta

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/runs",
    response_model=ApiResponse[TrainingRunResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_run(
    request: StartTrainingRequest,
    service: TrainingServiceDep,
    request_id: RequestId,
) -> ApiResponse[TrainingRunResponse]:
    """Create a new training run."""
    try:
        run = service.create_run(
            config=request.config.model_dump(),
            total_steps=request.total_steps,
        )

        return ApiResponse(
            data=TrainingRunResponse(
                id=run.id,
                config=run.config,
                status=run.status,
                current_step=run.current_step,
                total_steps=run.total_steps,
                metrics_count=len(run.metrics),
                start_time=run.start_time,
                end_time=run.end_time,
                error_message=run.error_message,
            ),
            meta=ApiMeta(request_id=request_id),
        )
    except Exception as e:
        logger.exception(f"Failed to create run: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get(
    "/runs",
    response_model=ApiResponse[list[TrainingRunResponse]],
)
async def list_runs(
    service: TrainingServiceDep,
    request_id: RequestId,
) -> ApiResponse[list[TrainingRunResponse]]:
    """List all training runs."""
    runs = service.list_runs()

    return ApiResponse(
        data=[
            TrainingRunResponse(
                id=r.id,
                config=r.config,
                status=r.status,
                current_step=r.current_step,
                total_steps=r.total_steps,
                metrics_count=len(r.metrics),
                start_time=r.start_time,
                end_time=r.end_time,
                error_message=r.error_message,
            )
            for r in runs
        ],
        meta=ApiMeta(request_id=request_id),
    )


@router.get(
    "/runs/{run_id}",
    response_model=ApiResponse[TrainingRunResponse],
)
async def get_run(
    run_id: str,
    service: TrainingServiceDep,
    request_id: RequestId,
) -> ApiResponse[TrainingRunResponse]:
    """Get a training run by ID."""
    run = service.get_run(run_id)

    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Run {run_id} not found",
        )

    return ApiResponse(
        data=TrainingRunResponse(
            id=run.id,
            config=run.config,
            status=run.status,
            current_step=run.current_step,
            total_steps=run.total_steps,
            metrics_count=len(run.metrics),
            start_time=run.start_time,
            end_time=run.end_time,
            error_message=run.error_message,
        ),
        meta=ApiMeta(request_id=request_id),
    )


@router.post(
    "/runs/{run_id}/start",
    response_model=ApiResponse[TrainingRunResponse],
)
async def start_run(
    run_id: str,
    service: TrainingServiceDep,
    request_id: RequestId,
) -> ApiResponse[TrainingRunResponse]:
    """Start a training run."""
    try:
        started = service.start_run(run_id)

        if not started:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Run is already training",
            )

        run = service.get_run(run_id)

        return ApiResponse(
            data=TrainingRunResponse(
                id=run.id,
                config=run.config,
                status=run.status,
                current_step=run.current_step,
                total_steps=run.total_steps,
                metrics_count=len(run.metrics),
                start_time=run.start_time,
                end_time=run.end_time,
                error_message=run.error_message,
            ),
            meta=ApiMeta(request_id=request_id),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.post(
    "/runs/{run_id}/stop",
    response_model=ApiResponse[TrainingRunResponse],
)
async def stop_run(
    run_id: str,
    service: TrainingServiceDep,
    request_id: RequestId,
) -> ApiResponse[TrainingRunResponse]:
    """Stop a training run."""
    try:
        service.stop_run(run_id)
        run = service.get_run(run_id)

        return ApiResponse(
            data=TrainingRunResponse(
                id=run.id,
                config=run.config,
                status=run.status,
                current_step=run.current_step,
                total_steps=run.total_steps,
                metrics_count=len(run.metrics),
                start_time=run.start_time,
                end_time=run.end_time,
                error_message=run.error_message,
            ),
            meta=ApiMeta(request_id=request_id),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.delete(
    "/runs/{run_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_run(
    run_id: str,
    service: TrainingServiceDep,
) -> None:
    """Delete a training run."""
    if not service.delete_run(run_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Run {run_id} not found",
        )


@router.get(
    "/runs/{run_id}/metrics",
    response_model=PaginatedResponse[TrainingMetricsResponse],
)
async def get_metrics(
    run_id: str,
    service: TrainingServiceDep,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=1000),
) -> PaginatedResponse[TrainingMetricsResponse]:
    """Get metrics for a training run with pagination."""
    try:
        run = service.get_run(run_id)
        if not run:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Run {run_id} not found",
            )

        metrics = service.get_metrics(run_id, offset=offset, limit=limit)
        total_count = len(run.metrics)
        total_pages = (total_count + limit - 1) // limit

        return PaginatedResponse(
            items=[
                TrainingMetricsResponse(
                    step=m.step,
                    policy_loss=m.policy_loss,
                    value_loss=m.value_loss,
                    kl=m.kl,
                    entropy=m.entropy,
                    explained_variance=m.explained_variance,
                    episode_reward=m.episode_reward,
                    episode_length=m.episode_length,
                    timestamp=m.timestamp,
                )
                for m in metrics
            ],
            pagination=PaginationMeta(
                page=offset // limit,
                page_size=limit,
                total_count=total_count,
                total_pages=total_pages,
                has_next=offset + limit < total_count,
                has_previous=offset > 0,
            ),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
