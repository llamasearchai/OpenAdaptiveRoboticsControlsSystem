import json
import logging
import time
import uuid
from typing import Any, Dict


LOGGER_NAME = "arcs"


def get_logger() -> logging.Logger:
    return logging.getLogger(LOGGER_NAME)


def new_correlation_id() -> str:
    return uuid.uuid4().hex


def log_event(event: str, correlation_id: str, **fields: Any) -> None:
    payload: Dict[str, Any] = {
        "event": event,
        "correlation_id": correlation_id,
        "timestamp": time.time(),
        **fields,
    }
    get_logger().info(json.dumps(payload, sort_keys=True))
