"""Kinematics API router."""

import logging

from fastapi import APIRouter, HTTPException, status

from arcs.api.dependencies import KinematicsServiceDep, RequestId
from arcs.api.schemas.kinematics import (
    FKRequest,
    FKResponse,
    IKRequest,
    IKResponse,
    JacobianRequest,
    JacobianResponse,
    JointLimitsResponse,
    JointLimitCheckRequest,
    JointLimitCheckResponse,
)
from arcs.api.schemas.common import ApiResponse, ApiMeta

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/fk",
    response_model=ApiResponse[FKResponse],
)
async def forward_kinematics(
    request: FKRequest,
    service: KinematicsServiceDep,
    request_id: RequestId,
) -> ApiResponse[FKResponse]:
    """Compute forward kinematics."""
    try:
        result = service.forward_kinematics(
            joint_angles=request.joint_angles,
            urdf_path=request.urdf_path,
            link_name=request.link_name,
        )

        return ApiResponse(
            data=FKResponse(
                position=result["position"],
                quaternion=result["quaternion"],
                matrix=result["matrix"],
            ),
            meta=ApiMeta(request_id=request_id),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"URDF file not found: {e}",
        )
    except Exception as e:
        logger.exception(f"FK computation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post(
    "/ik",
    response_model=ApiResponse[IKResponse],
)
async def inverse_kinematics(
    request: IKRequest,
    service: KinematicsServiceDep,
    request_id: RequestId,
) -> ApiResponse[IKResponse]:
    """Compute inverse kinematics."""
    try:
        result = service.inverse_kinematics(
            target_position=request.target_position,
            target_quaternion=request.target_quaternion,
            initial_joints=request.initial_joints,
            urdf_path=request.urdf_path,
            max_iterations=request.max_iterations,
            tolerance=request.tolerance,
        )

        return ApiResponse(
            data=IKResponse(
                joint_angles=result["joint_angles"],
                converged=result["converged"],
                iterations=result["iterations"],
                error=result["error"],
            ),
            meta=ApiMeta(request_id=request_id),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"URDF file not found: {e}",
        )
    except Exception as e:
        logger.exception(f"IK computation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post(
    "/jacobian",
    response_model=ApiResponse[JacobianResponse],
)
async def compute_jacobian(
    request: JacobianRequest,
    service: KinematicsServiceDep,
    request_id: RequestId,
) -> ApiResponse[JacobianResponse]:
    """Compute the Jacobian matrix."""
    try:
        result = service.compute_jacobian(
            joint_angles=request.joint_angles,
            urdf_path=request.urdf_path,
        )

        return ApiResponse(
            data=JacobianResponse(
                jacobian=result["jacobian"],
                condition_number=result["condition_number"],
                shape=result["shape"],
            ),
            meta=ApiMeta(request_id=request_id),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.exception(f"Jacobian computation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.get(
    "/joint-limits",
    response_model=ApiResponse[JointLimitsResponse],
)
async def get_joint_limits(
    service: KinematicsServiceDep,
    request_id: RequestId,
    urdf_path: str | None = None,
) -> ApiResponse[JointLimitsResponse]:
    """Get joint limits from URDF."""
    try:
        result = service.get_joint_limits(urdf_path=urdf_path)

        return ApiResponse(
            data=JointLimitsResponse(
                joints=result["joints"],
                num_joints=result["num_joints"],
            ),
            meta=ApiMeta(request_id=request_id),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.exception(f"Failed to get joint limits: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.post(
    "/check-limits",
    response_model=ApiResponse[JointLimitCheckResponse],
)
async def check_joint_limits(
    request: JointLimitCheckRequest,
    service: KinematicsServiceDep,
    request_id: RequestId,
) -> ApiResponse[JointLimitCheckResponse]:
    """Check if joint angles are within limits."""
    try:
        result = service.check_joint_limits(
            joint_angles=request.joint_angles,
            urdf_path=request.urdf_path,
        )

        return ApiResponse(
            data=JointLimitCheckResponse(
                valid=result["valid"],
                violations=result["violations"],
            ),
            meta=ApiMeta(request_id=request_id),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.exception(f"Joint limit check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )
