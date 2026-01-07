"""ARCS REST API and WebSocket server.

This module provides the HTTP API layer for the ARCS robotics control system,
exposing simulation, training, kinematics, and dataset management endpoints.
"""

from arcs.api.main import app, create_app

__all__ = ["app", "create_app"]
