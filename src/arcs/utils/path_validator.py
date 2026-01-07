import os
from pathlib import Path
from typing import Iterable, Optional

from arcs.utils.logging import log_event, new_correlation_id


class PathValidator:
    """Validate file paths against an allowlist to prevent path traversal."""

    def __init__(self, allowlist: Optional[Iterable[str]] = None, strict: bool = False):
        if allowlist is None:
            env_paths = os.getenv("ARCS_ASSET_DIR", "")
            allowlist = [p for p in env_paths.split(os.pathsep) if p]
        self.allowlist = [Path(p).expanduser().resolve() for p in allowlist] if allowlist else []
        self.strict = strict
        self.correlation_id = new_correlation_id()

    def validate(self, path: str) -> Path:
        resolved = Path(path).expanduser().resolve()
        log_event("file.access", self.correlation_id, path=str(resolved))
        if not self.allowlist:
            return resolved
        for root in self.allowlist:
            try:
                resolved.relative_to(root)
                return resolved
            except ValueError:
                continue
        log_event("file.access.blocked", self.correlation_id, path=str(resolved))
        if self.strict:
            raise ValueError(f"Path {resolved} is outside allowlist")
        return resolved
