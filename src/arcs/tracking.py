import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

import numpy as np

from arcs.utils.logging import log_event, new_correlation_id

try:
    import wandb
except Exception:
    wandb = None

try:
    import psutil
except Exception:
    psutil = None

try:
    import imageio
except Exception:
    imageio = None

try:
    import torch
except Exception:
    torch = None

try:
    import pynvml
except Exception:
    pynvml = None


@dataclass
class TrackerConfig:
    backend: Literal["wandb", "local"] = "local"
    project: str = "arcs"
    entity: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    log_dir: str = "runs"


class ExperimentTracker:
    """Tracking facade for wandb with local fallback."""

    def __init__(self, config: TrackerConfig):
        self.config = config
        self.correlation_id = new_correlation_id()
        self.run_id = self.correlation_id[:8]
        self._local_dir = Path(config.log_dir) / self.run_id
        self._local_dir.mkdir(parents=True, exist_ok=True)
        self._metrics_path = self._local_dir / "metrics.jsonl"
        self._backend = config.backend
        self._wandb_run = None

        if self._backend == "wandb":
            if wandb is None:
                self._backend = "local"
            else:
                try:
                    self._wandb_run = wandb.init(
                        project=config.project,
                        entity=config.entity,
                        tags=config.tags,
                    )
                except Exception:
                    self._backend = "local"

        log_event(
            "tracker.initialized",
            self.correlation_id,
            backend=self._backend,
            run_id=self.run_id,
        )

    def log_scalar(self, name: str, value: float, step: int) -> None:
        payload = {name: value, "step": step, **self._system_metrics()}
        if self._backend == "wandb" and self._wandb_run is not None:
            try:
                wandb.log(payload, step=step)
            except Exception:
                self._backend = "local"
        if self._backend == "local":
            self._append_local(payload)
        log_event(
            "tracker.logged",
            self.correlation_id,
            type="scalar",
            name=name,
            step=step,
        )

    def log_histogram(self, name: str, values: np.ndarray, step: int) -> None:
        if self._backend == "wandb" and self._wandb_run is not None:
            try:
                wandb.log({name: wandb.Histogram(values), "step": step}, step=step)
            except Exception:
                self._backend = "local"
        if self._backend == "local":
            payload = {"type": "histogram", "name": name, "step": step}
            self._append_local(payload)
        log_event(
            "tracker.logged",
            self.correlation_id,
            type="histogram",
            name=name,
            step=step,
        )

    def log_video(self, name: str, frames: np.ndarray, step: int, fps: int = 30) -> None:
        if self._backend == "wandb" and self._wandb_run is not None:
            try:
                wandb.log({name: wandb.Video(frames, fps=fps), "step": step}, step=step)
            except Exception:
                self._backend = "local"
        if self._backend == "local":
            video_path = self._local_dir / f"{name}_{step}.mp4"
            if imageio is not None:
                imageio.mimwrite(video_path, frames, fps=fps)
            else:
                video_path = self._local_dir / f"{name}_{step}.npy"
                np.save(video_path, frames)
            payload = {"type": "video", "name": name, "step": step, "path": str(video_path)}
            self._append_local(payload)
        log_event(
            "tracker.logged",
            self.correlation_id,
            type="video",
            name=name,
            step=step,
        )

    def log_artifact(self, path: str, type: str = "file") -> None:
        path_obj = Path(path)
        if self._backend == "wandb" and self._wandb_run is not None:
            try:
                artifact = wandb.Artifact(path_obj.stem, type=type)
                artifact.add_file(path)
                self._wandb_run.log_artifact(artifact)
            except Exception:
                self._backend = "local"
        if self._backend == "local":
            artifacts_dir = self._local_dir / "artifacts"
            artifacts_dir.mkdir(exist_ok=True)
            dest = artifacts_dir / path_obj.name
            if path_obj.exists():
                dest.write_bytes(path_obj.read_bytes())
            self._append_local({"type": "artifact", "path": str(dest)})
        log_event(
            "tracker.logged",
            self.correlation_id,
            type="artifact",
            name=path,
            step=0,
        )

    def _append_local(self, payload: Dict[str, Any]) -> None:
        with self._metrics_path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(payload) + "\n")

    def _system_metrics(self) -> Dict[str, Any]:
        metrics: Dict[str, Any] = {}
        if psutil is not None:
            metrics["cpu_percent"] = psutil.cpu_percent()
            metrics["memory_mb"] = psutil.virtual_memory().used / (1024**2)
        if torch is not None and torch.cuda.is_available():
            metrics["gpu_memory_mb"] = torch.cuda.memory_allocated() / (1024**2)
            if pynvml is not None:
                try:
                    pynvml.nvmlInit()
                    handle = pynvml.nvmlDeviceGetHandleByIndex(0)
                    util = pynvml.nvmlDeviceGetUtilizationRates(handle)
                    metrics["gpu_util_percent"] = util.gpu
                except Exception:
                    pass
        return metrics
