from typing import Optional

from arcs.sim.backends.dummy import DummyBackend


class PyBulletBackend(DummyBackend):
    """Stub PyBullet backend."""

    supports_vectorized = False

    def __init__(
        self,
        task_name: str = "Reach",
        num_envs: int = 1,
        device: str = "cpu",
        config: Optional[object] = None,
    ):
        super().__init__(
            task_name=task_name, num_envs=num_envs, device=device, config=config
        )
