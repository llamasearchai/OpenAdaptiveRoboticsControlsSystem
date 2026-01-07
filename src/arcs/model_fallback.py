import random
import time
from typing import Any, Callable, Iterable, Optional

from arcs.config import ModelConfig
from arcs.utils.logging import log_event, new_correlation_id


RETRIABLE_CODES = {429, 500, 502, 503, 504}
NON_RETRIABLE_CODES = {400, 401, 403, 404}


class ModelUnavailableError(RuntimeError):
    pass


class ModelFallback:
    """Handle model fallback chain with exponential backoff."""

    def __init__(self, config: Optional[ModelConfig] = None):
        self.config = config or ModelConfig()
        self.correlation_id = new_correlation_id()

    def call(
        self,
        call_fn: Callable[[str], Any],
        models: Optional[Iterable[str]] = None,
    ) -> Any:
        chain = (
            list(models)
            if models is not None
            else [m.strip() for m in self.config.fallback_chain.split(",") if m.strip()]
        )
        last_error = None
        for model in chain:
            for attempt in range(self.config.api_max_retries):
                try:
                    return call_fn(model)
                except Exception as err:
                    last_error = err
                    if not self._is_retriable(err):
                        raise
                    wait = self.config.api_backoff_base_sec * (2**attempt) + random.uniform(
                        0.0, 0.5
                    )
                    time.sleep(wait)
            log_event(
                "model.fallback",
                self.correlation_id,
                original_model=model,
                fallback_model=self._next_model(chain, model),
                error_code=self._error_code(last_error),
                attempt=self.config.api_max_retries,
            )
        raise ModelUnavailableError("All models in fallback chain exhausted")

    @staticmethod
    def _is_retriable(err: Exception) -> bool:
        code = ModelFallback._error_code(err)
        if code in NON_RETRIABLE_CODES:
            return False
        if code in RETRIABLE_CODES:
            return True
        return True

    @staticmethod
    def _error_code(err: Exception) -> Optional[int]:
        code = getattr(err, "status_code", None)
        if code is None:
            code = getattr(err, "code", None)
        return int(code) if code is not None else None

    @staticmethod
    def _next_model(chain: Iterable[str], current: str) -> Optional[str]:
        chain_list = list(chain)
        if current not in chain_list:
            return None
        idx = chain_list.index(current)
        return chain_list[idx + 1] if idx + 1 < len(chain_list) else None
