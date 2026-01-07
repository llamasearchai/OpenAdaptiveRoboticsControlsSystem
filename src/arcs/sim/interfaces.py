from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Dict, Optional, Tuple, Any
import numpy as np
import gymnasium as gym

@dataclass
class Observation:
    """Standardized observation dataclass."""
    proprio: np.ndarray  # Joint angles, velocities
    rgb: Optional[np.ndarray] = None  # [H, W, 3]
    depth: Optional[np.ndarray] = None  # [H, W]
    tactile: Optional[np.ndarray] = None  # Contact sensors
    timestep: int = 0
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}

@dataclass
class State:
    """System state for checkpointing/planning."""
    joint_pos: np.ndarray
    joint_vel: np.ndarray
    object_states: Dict[str, np.ndarray]
    timestamp: float

class SimulationEnv(ABC):
    """Abstract interface supporting multiple simulation backends."""

    supports_vectorized: bool = False

    @abstractmethod
    def reset(self, seed: Optional[int] = None) -> Observation:
        """Reset the environment to an initial state."""
        pass

    @abstractmethod
    def step(self, action: np.ndarray) -> Tuple[Observation, float, bool, bool, Dict]:
        """
        Execute one simulation step.
        Returns:
            observation: The new observation
            reward: scalar reward
            terminated: bool, true if episode is over due to failure/success
            truncated: bool, true if episode is over due to time limit
            info: auxiliary diagnostic information
        """
        pass

    @abstractmethod
    def get_state(self) -> State:
        """Get full system state for checkpointing/planning."""
        pass

    @abstractmethod
    def set_state(self, state: State) -> None:
        """Set system state (e.g. for MPPI rollouts)."""
        pass

    @property
    @abstractmethod
    def action_space(self) -> gym.Space:
        """Get the action space."""
        pass

    @property
    @abstractmethod
    def observation_space(self) -> gym.Space:
        """Get the observation space."""
        pass

    @abstractmethod
    def update_dynamics(self, params: Dict[str, float]) -> None:
        """Update physics-related parameters (e.g., mass, friction, damping)."""
        pass

    def update_visual(self, params: Dict[str, float]) -> None:
        """Update visual parameters (e.g., lighting intensity)."""
        return None

    def update_sensors(self, params: Dict[str, float]) -> None:
        """Update sensor parameters (e.g., noise scales)."""
        return None

    def update_action(self, params: Dict[str, float]) -> None:
        """Update action parameters (e.g., latency/dropout)."""
        return None
    
    @abstractmethod
    def close(self):
        """Cleanup resources."""
        pass
