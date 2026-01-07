import os
from typing import Optional

import torch

from arcs.sim.backends.dummy import DummyBackend


class IsaacGymBackend(DummyBackend):
    """Stub IsaacGym backend with GPU pre-allocation and vectorization hooks."""

    supports_vectorized = False

    def __init__(
        self,
        task_name: str = "Reach",
        num_envs: int = 1,
        device: str = "cuda:0",
        config: Optional[object] = None,
    ):
        if os.getenv("ISAACGYM_LICENSE_AVAILABLE") == "0":
            raise RuntimeError(
                "IsaacGym license server unavailable; set ISAACGYM_LICENSE_AVAILABLE=1"
            )
        super().__init__(
            task_name=task_name, num_envs=num_envs, device=device, config=config
        )
        self._gpu_buffer = None
        self._gpu_memory_mb = 0.0
        self._preallocate_gpu_memory(num_envs=num_envs, device=device)

    def _preallocate_gpu_memory(self, num_envs: int, device: str) -> None:
        if "cuda" not in device:
            return
        if not torch.cuda.is_available():
            return
        try:
            # Small stub allocation to simulate GPU resource reservation.
            self._gpu_buffer = torch.empty((max(1, num_envs), 256), device=device)
            self._gpu_memory_mb = (
                self._gpu_buffer.nelement() * self._gpu_buffer.element_size()
            ) / (1024**2)
        except RuntimeError as err:
            raise RuntimeError(
                "IsaacGym GPU OOM during pre-allocation; reduce num_envs"
            ) from err

    @property
    def gpu_memory_mb(self) -> float:
        return self._gpu_memory_mb
