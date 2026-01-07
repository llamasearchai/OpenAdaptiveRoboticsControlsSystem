"""Safety API router."""

import logging
import time

from fastapi import APIRouter, HTTPException, status

from arcs.api.dependencies import RequestId
from arcs.api.schemas.safety import (
    SafetyConfigSchema,
    SafetyFilterRequest,
    SafetyFilterResponse,
    SafetyStatusResponse,
    JointLimits,
)
from arcs.api.schemas.common import ApiResponse, ApiMeta

logger = logging.getLogger(__name__)

router = APIRouter()

# Global safety filter state
_safety_config: SafetyConfigSchema | None = None
_safety_filter = None
_total_filtered = 0
_total_violations = 0


@router.get(
    "/status",
    response_model=ApiResponse[SafetyStatusResponse],
)
async def get_safety_status(
    request_id: RequestId,
) -> ApiResponse[SafetyStatusResponse]:
    """Get safety system status."""
    return ApiResponse(
        data=SafetyStatusResponse(
            enabled=_safety_filter is not None,
            config=_safety_config,
            total_filtered=_total_filtered,
            total_violations=_total_violations,
        ),
        meta=ApiMeta(request_id=request_id),
    )


@router.post(
    "/configure",
    response_model=ApiResponse[SafetyStatusResponse],
)
async def configure_safety(
    config: SafetyConfigSchema,
    request_id: RequestId,
) -> ApiResponse[SafetyStatusResponse]:
    """Configure the safety filter."""
    global _safety_config, _safety_filter

    try:
        from arcs.safety import SafetyFilter

        import numpy as np

        # Build joint limits
        joint_limits = {
            "pos_min": np.array(config.joint_limits.pos_min),
            "pos_max": np.array(config.joint_limits.pos_max),
            "vel_max": np.array(config.joint_limits.vel_max),
            "torque_max": np.array(config.joint_limits.torque_max),
        }

        # Build workspace bounds if provided
        workspace_bounds = None
        if config.workspace_bounds:
            workspace_bounds = {
                "lower": np.array(config.workspace_bounds.lower),
                "upper": np.array(config.workspace_bounds.upper),
            }

        _safety_filter = SafetyFilter(
            joint_limits=joint_limits,
            workspace_bounds=workspace_bounds,
            dt=config.dt,
            use_qp=config.use_qp,
            solver_timeout=config.solver_timeout,
        )
        _safety_config = config

        logger.info("Safety filter configured successfully")

        return ApiResponse(
            data=SafetyStatusResponse(
                enabled=True,
                config=_safety_config,
                total_filtered=_total_filtered,
                total_violations=_total_violations,
            ),
            meta=ApiMeta(request_id=request_id),
        )
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Safety module not available",
        )
    except Exception as e:
        logger.exception(f"Failed to configure safety: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post(
    "/disable",
    response_model=ApiResponse[SafetyStatusResponse],
)
async def disable_safety(
    request_id: RequestId,
) -> ApiResponse[SafetyStatusResponse]:
    """Disable the safety filter."""
    global _safety_filter, _safety_config

    _safety_filter = None
    _safety_config = None

    logger.info("Safety filter disabled")

    return ApiResponse(
        data=SafetyStatusResponse(
            enabled=False,
            config=None,
            total_filtered=_total_filtered,
            total_violations=_total_violations,
        ),
        meta=ApiMeta(request_id=request_id),
    )


@router.post(
    "/filter",
    response_model=ApiResponse[SafetyFilterResponse],
)
async def filter_action(
    request: SafetyFilterRequest,
    request_id: RequestId,
) -> ApiResponse[SafetyFilterResponse]:
    """Filter an action through the safety system."""
    global _total_filtered, _total_violations

    if _safety_filter is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Safety filter not configured. Call /safety/configure first.",
        )

    try:
        import numpy as np

        start_time = time.perf_counter()

        action = np.array(request.action)
        joint_pos = np.array(request.joint_pos)
        joint_vel = np.array(request.joint_vel) if request.joint_vel else None
        ee_pos = np.array(request.ee_pos) if request.ee_pos else None

        # Run safety filter
        result = _safety_filter.filter(
            action=action,
            joint_pos=joint_pos,
            joint_vel=joint_vel,
            ee_pos=ee_pos,
        )

        filter_time_us = (time.perf_counter() - start_time) * 1e6
        _total_filtered += 1

        # Count violations
        clipped = [i for i in range(len(action)) if not np.allclose(action[i], result.safe_action[i])]
        if clipped:
            _total_violations += 1

        return ApiResponse(
            data=SafetyFilterResponse(
                safe_action=result.safe_action.tolist(),
                original_action=request.action,
                clipped_joints=clipped,
                constraint_violations_count=len(clipped),
                filter_time_us=filter_time_us,
                qp_iterations=result.iterations if hasattr(result, 'iterations') else 0,
            ),
            meta=ApiMeta(request_id=request_id),
        )
    except Exception as e:
        logger.exception(f"Safety filter failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post(
    "/reset-stats",
    response_model=ApiResponse[SafetyStatusResponse],
)
async def reset_stats(
    request_id: RequestId,
) -> ApiResponse[SafetyStatusResponse]:
    """Reset safety statistics."""
    global _total_filtered, _total_violations

    _total_filtered = 0
    _total_violations = 0

    return ApiResponse(
        data=SafetyStatusResponse(
            enabled=_safety_filter is not None,
            config=_safety_config,
            total_filtered=0,
            total_violations=0,
        ),
        meta=ApiMeta(request_id=request_id),
    )
