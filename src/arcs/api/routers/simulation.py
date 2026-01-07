"""Simulation API router."""

from datetime import datetime
import logging

from fastapi import APIRouter, HTTPException, status

from arcs.api.dependencies import SimulationServiceDep, RequestId
from arcs.api.schemas.simulation import (
    SimulationConfig,
    SimulationSessionResponse,
    StepRequest,
    StepResponse,
    ResetRequest,
    ObservationResponse,
    StateResponse,
)
from arcs.api.schemas.common import ApiResponse, ApiMeta

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/sessions",
    response_model=ApiResponse[SimulationSessionResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_session(
    config: SimulationConfig,
    service: SimulationServiceDep,
    request_id: RequestId,
) -> ApiResponse[SimulationSessionResponse]:
    """Create a new simulation session."""
    try:
        session = service.create_session(
            task=config.task,
            backend=config.backend,
            num_envs=config.num_envs,
            device=config.device,
        )

        return ApiResponse(
            data=SimulationSessionResponse(
                id=session.id,
                task=session.task,
                backend=session.backend,
                status=session.status,
                current_step=session.current_step,
            ),
            meta=ApiMeta(request_id=request_id),
        )
    except Exception as e:
        logger.exception(f"Failed to create session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get(
    "/sessions",
    response_model=ApiResponse[list[SimulationSessionResponse]],
)
async def list_sessions(
    service: SimulationServiceDep,
    request_id: RequestId,
) -> ApiResponse[list[SimulationSessionResponse]]:
    """List all simulation sessions."""
    sessions = service.list_sessions()

    return ApiResponse(
        data=[
            SimulationSessionResponse(
                id=s.id,
                task=s.task,
                backend=s.backend,
                status=s.status,
                current_step=s.current_step,
            )
            for s in sessions
        ],
        meta=ApiMeta(request_id=request_id),
    )


@router.get(
    "/sessions/{session_id}",
    response_model=ApiResponse[SimulationSessionResponse],
)
async def get_session(
    session_id: str,
    service: SimulationServiceDep,
    request_id: RequestId,
) -> ApiResponse[SimulationSessionResponse]:
    """Get a simulation session by ID."""
    session = service.get_session(session_id)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found",
        )

    return ApiResponse(
        data=SimulationSessionResponse(
            id=session.id,
            task=session.task,
            backend=session.backend,
            status=session.status,
            current_step=session.current_step,
        ),
        meta=ApiMeta(request_id=request_id),
    )


@router.delete(
    "/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_session(
    session_id: str,
    service: SimulationServiceDep,
) -> None:
    """Delete a simulation session."""
    if not service.delete_session(session_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found",
        )


@router.post(
    "/sessions/{session_id}/reset",
    response_model=ApiResponse[ObservationResponse],
)
async def reset_session(
    session_id: str,
    request: ResetRequest,
    service: SimulationServiceDep,
    request_id: RequestId,
) -> ApiResponse[ObservationResponse]:
    """Reset a simulation session."""
    try:
        obs = service.reset_session(session_id, seed=request.seed)
        obs_dict = service.observation_to_dict(obs)

        return ApiResponse(
            data=ObservationResponse(**obs_dict),
            meta=ApiMeta(request_id=request_id),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        logger.exception(f"Failed to reset session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post(
    "/sessions/{session_id}/step",
    response_model=ApiResponse[StepResponse],
)
async def step_session(
    session_id: str,
    request: StepRequest,
    service: SimulationServiceDep,
    request_id: RequestId,
) -> ApiResponse[StepResponse]:
    """Execute a simulation step."""
    try:
        obs, reward, terminated, truncated, info = service.step_session(
            session_id,
            action=request.action,
        )
        obs_dict = service.observation_to_dict(obs)

        return ApiResponse(
            data=StepResponse(
                observation=ObservationResponse(**obs_dict),
                reward=reward,
                terminated=terminated,
                truncated=truncated,
                info=info,
            ),
            meta=ApiMeta(request_id=request_id),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        logger.exception(f"Failed to step session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get(
    "/sessions/{session_id}/state",
    response_model=ApiResponse[StateResponse],
)
async def get_state(
    session_id: str,
    service: SimulationServiceDep,
    request_id: RequestId,
) -> ApiResponse[StateResponse]:
    """Get current simulation state."""
    try:
        state = service.get_state(session_id)
        state_dict = service.state_to_dict(state)

        return ApiResponse(
            data=StateResponse(**state_dict),
            meta=ApiMeta(request_id=request_id),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        logger.exception(f"Failed to get state: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get(
    "/sessions/{session_id}/observation",
    response_model=ApiResponse[ObservationResponse],
)
async def get_observation(
    session_id: str,
    service: SimulationServiceDep,
    request_id: RequestId,
) -> ApiResponse[ObservationResponse]:
    """Get last observation from session."""
    try:
        obs = service.get_observation(session_id)

        if obs is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No observation available. Reset the session first.",
            )

        obs_dict = service.observation_to_dict(obs)

        return ApiResponse(
            data=ObservationResponse(**obs_dict),
            meta=ApiMeta(request_id=request_id),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
