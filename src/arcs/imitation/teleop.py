from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
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

    def read_input(
        self, obs: Optional[Observation] = None, goal: Optional[np.ndarray] = None
    ) -> np.ndarray:
        """
        Poll device and return action.

        Args:
            obs: Current observation (needed for scripted/expert mode)
            goal: Current goal (needed for scripted/expert mode)
        """
        # If we have obs and goal, act as an 'expert' for data collection testing
        if obs is not None and goal is not None:
            # Simple P-controller towards goal
            current_pos = obs.proprio[:3]
            error = goal - current_pos
            action = np.clip(error * 5.0, -1.0, 1.0)
            # Add slight noise to simulate human imperfection
            action += np.random.normal(0, 0.05, size=action.shape)
            # Pad action if necessary (proprio is 7-dim: 3 pos + ? usually 7 dim is joint angles)
            # Wait, DummyBackend step takes velocity for joints.
            # If proprio is joint_pos (7), joint_vel (7), then we need 7 dim action.
            # We need Jacobian for Cartesian control, but for DummyBackend logic:
            # self.joint_pos += self.joint_vel * 0.01.
            # And reward is based on joint_pos[:3] distance to goal.
            # So we can just set 1st 3 joints vel to move towards goal, others 0.
            full_action = np.zeros(7)
            full_action[:3] = action
            return full_action

        # Fallback to random if no state provided
        return np.random.uniform(-0.1, 0.1, size=(7,))

    def record_demonstration(self, env: SimulationEnv, max_steps: int = 500) -> Demonstration:
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
