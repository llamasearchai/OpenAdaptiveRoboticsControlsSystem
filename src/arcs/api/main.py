"""FastAPI application entry point for ARCS API server."""

import logging
import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from arcs.api.config import get_settings
from arcs.api.routers import simulation, training, kinematics, datasets, safety
from arcs.api.websocket.manager import connection_manager
from arcs.api.websocket import handlers as ws_handlers

# Configure logging
settings = get_settings()
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format=settings.log_format
)
logger = logging.getLogger(__name__)

# Use global connection manager from websocket module


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager for startup/shutdown."""
    logger.info("Starting ARCS API server...")
    logger.info(f"Debug mode: {settings.debug}")
    logger.info(f"CORS origins: {settings.cors_origins}")

    # Start WebSocket heartbeat
    await connection_manager.start_heartbeat()

    yield

    logger.info("Shutting down ARCS API server...")
    await connection_manager.close_all()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title=settings.api_title,
        description=settings.api_description,
        version=settings.api_version,
        lifespan=lifespan,
        docs_url="/docs" if settings.debug else None,
        redoc_url="/redoc" if settings.debug else None,
        openapi_url="/openapi.json" if settings.debug else None,
    )

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=settings.cors_allow_credentials,
        allow_methods=settings.cors_allow_methods,
        allow_headers=settings.cors_allow_headers,
    )

    # Request timing middleware
    @app.middleware("http")
    async def add_process_time_header(request: Request, call_next) -> Response:
        start_time = time.perf_counter()
        response = await call_next(request)
        process_time = (time.perf_counter() - start_time) * 1000
        response.headers["X-Process-Time"] = f"{process_time:.2f}ms"
        return response

    # Global exception handler
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception(f"Unhandled exception: {exc}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "internal_server_error",
                "message": "An unexpected error occurred",
                "detail": str(exc) if settings.debug else None,
            }
        )

    # Health check endpoint
    @app.get("/health", tags=["Health"])
    async def health_check() -> dict:
        """Health check endpoint."""
        return {
            "status": "healthy",
            "version": settings.api_version,
        }

    # Register routers
    app.include_router(
        simulation.router,
        prefix=f"{settings.api_prefix}/simulation",
        tags=["Simulation"]
    )
    app.include_router(
        training.router,
        prefix=f"{settings.api_prefix}/training",
        tags=["Training"]
    )
    app.include_router(
        kinematics.router,
        prefix=f"{settings.api_prefix}/kinematics",
        tags=["Kinematics"]
    )
    app.include_router(
        datasets.router,
        prefix=f"{settings.api_prefix}/datasets",
        tags=["Datasets"]
    )
    app.include_router(
        safety.router,
        prefix=f"{settings.api_prefix}/safety",
        tags=["Safety"]
    )

    # WebSocket endpoints
    app.include_router(
        ws_handlers.router,
        prefix="/ws",
        tags=["WebSocket"]
    )

    # Store WebSocket manager in app state
    app.state.ws_manager = connection_manager

    return app


# Create the application instance
app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "arcs.api.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.reload,
        log_level=settings.log_level.lower(),
    )
