"""API configuration with environment variable support."""

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings


class APISettings(BaseSettings):
    """API server configuration.

    All settings can be overridden via environment variables with ARCS_API_ prefix.
    """

    # Server settings
    host: str = Field(default="0.0.0.0", description="Server bind host")
    port: int = Field(default=8000, description="Server bind port")
    debug: bool = Field(default=False, description="Enable debug mode")
    reload: bool = Field(default=False, description="Enable auto-reload")

    # CORS settings
    cors_origins: list[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"],
        description="Allowed CORS origins"
    )
    cors_allow_credentials: bool = Field(default=True)
    cors_allow_methods: list[str] = Field(default=["*"])
    cors_allow_headers: list[str] = Field(default=["*"])

    # API settings
    api_prefix: str = Field(default="/api", description="API route prefix")
    api_title: str = Field(default="ARCS API", description="API title")
    api_version: str = Field(default="0.1.0", description="API version")
    api_description: str = Field(
        default="Adaptive Robotics Control System API",
        description="API description"
    )

    # Rate limiting
    rate_limit_enabled: bool = Field(default=True)
    rate_limit_requests: int = Field(default=100, description="Requests per window")
    rate_limit_window: int = Field(default=60, description="Window in seconds")

    # WebSocket settings
    ws_heartbeat_interval: int = Field(default=30, description="Heartbeat interval in seconds")
    ws_max_connections: int = Field(default=100, description="Max WebSocket connections")

    # Logging
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = Field(default="INFO")
    log_format: str = Field(
        default="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    model_config = {
        "env_prefix": "ARCS_API_",
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
    }


@lru_cache
def get_settings() -> APISettings:
    """Get cached API settings."""
    return APISettings()
