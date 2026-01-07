from dataclasses import dataclass, field
from typing import List, Optional, Dict, Literal, Any
import numpy as np
import time
from arcs.sim.interfaces import SimulationEnv, Observation


@dataclass
class Demonstration:
    """A recorded demonstration trajectory."""

    observations: List[Observation]
    actions: List[np.ndarray]
    rewards: List[float]
    metadata: Dict[str, Any] = field(default_factory=dict)


class TeleoperationInterface:
    """Interface for collecting human demonstrations."""

    def __init__(self, device: str = "keyboard", control_mode: str = "joint"):
        self.device = device
        self.control_mode = control_mode

    def read_input(self) -> np.ndarray:
        """Poll device and return action."""
        # Setup specific device polling here (Mocked for now)
        # E.g. read keyboard state or spacemouse
        return np.random.uniform(-0.1, 0.1, size=(7,))  # Mock small motions

    def record_demonstration(
        self, env: SimulationEnv, max_steps: int = 500
    ) -> Demonstration:
        """Record a single episode."""
        obs = env.reset()
        observations = []
        actions = []
        rewards = []

        observations.append(obs)

        for t in range(max_steps):
            action = self.read_input()

            # Execute
            next_obs, reward, terminated, truncated, info = env.step(action)

            actions.append(action)
            rewards.append(reward)
            observations.append(next_obs)

            obs = next_obs

            if terminated or truncated:
                break

        # Handle observation/action length mismatch (obs is N+1)
        # Usually we discard the final observation for BC training pairs (o_t, a_t)
        # or keep it. Let's keep it in the list but user must handle it.

        return Demonstration(
            observations=observations,
            actions=actions,
            rewards=rewards,
            metadata={
                "task": getattr(env, "task_name", "unknown"),
                "success": info.get("is_success", False),
                "timestamp": time.time(),
            },
        )
