"""FastAPI dependency injection providers."""

from typing import Annotated, Generator
from uuid import uuid4

from fastapi import Depends, Header, Request

from arcs.api.config import APISettings, get_settings
from arcs.api.services.simulation_service import SimulationService
from arcs.api.services.training_service import TrainingService
from arcs.api.services.kinematics_service import KinematicsService


# Settings dependency
Settings = Annotated[APISettings, Depends(get_settings)]


def get_request_id(
    x_request_id: str | None = Header(default=None, alias="X-Request-ID")
) -> str:
    """Get or generate request ID for tracing."""
    return x_request_id or str(uuid4())


RequestId = Annotated[str, Depends(get_request_id)]


# Service singletons
_simulation_service: SimulationService | None = None
_training_service: TrainingService | None = None
_kinematics_service: KinematicsService | None = None


def get_simulation_service() -> SimulationService:
    """Get simulation service singleton."""
    global _simulation_service
    if _simulation_service is None:
        _simulation_service = SimulationService()
    return _simulation_service


def get_training_service() -> TrainingService:
    """Get training service singleton."""
    global _training_service
    if _training_service is None:
        _training_service = TrainingService()
    return _training_service


def get_kinematics_service() -> KinematicsService:
    """Get kinematics service singleton."""
    global _kinematics_service
    if _kinematics_service is None:
        _kinematics_service = KinematicsService()
    return _kinematics_service


SimulationServiceDep = Annotated[SimulationService, Depends(get_simulation_service)]
TrainingServiceDep = Annotated[TrainingService, Depends(get_training_service)]
KinematicsServiceDep = Annotated[KinematicsService, Depends(get_kinematics_service)]
