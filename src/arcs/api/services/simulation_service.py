"""Simulation service bridging API to existing simulation code."""

import logging
from dataclasses import asdict
from typing import Any
from uuid import uuid4

import numpy as np

from arcs.sim.factory import SimulationBackendFactory
from arcs.sim.interfaces import SimulationEnv, Observation, State

logger = logging.getLogger(__name__)


class SimulationSession:
    """Wrapper for a simulation environment session."""

    def __init__(
        self,
        session_id: str,
        env: SimulationEnv,
        task: str,
        backend: str,
    ):
        self.id = session_id
        self.env = env
        self.task = task
        self.backend = backend
        self.current_step = 0
        self.status = "idle"
        self._last_observation: Observation | None = None

    def to_dict(self) -> dict[str, Any]:
        """Convert session to dictionary."""
        return {
            "id": self.id,
            "task": self.task,
            "backend": self.backend,
            "current_step": self.current_step,
            "status": self.status,
        }


class SimulationService:
    """Service for managing simulation sessions."""

    def __init__(self):
        self._sessions: dict[str, SimulationSession] = {}
        self._factory = SimulationBackendFactory()
        logger.info("SimulationService initialized")

    def create_session(
        self,
        task: str = "Reach",
        backend: str = "dummy",
        num_envs: int = 1,
        device: str = "cpu",
    ) -> SimulationSession:
        """Create a new simulation session."""
        session_id = str(uuid4())

        # Create environment using factory
        env = self._factory.create(
            task=task,
            backend=backend,
            num_envs=num_envs,
            device=device,
        )

        session = SimulationSession(
            session_id=session_id,
            env=env,
            task=task,
            backend=backend,
        )
        self._sessions[session_id] = session

        logger.info(f"Created simulation session {session_id} with {task}/{backend}")
        return session

    def get_session(self, session_id: str) -> SimulationSession | None:
        """Get a simulation session by ID."""
        return self._sessions.get(session_id)

    def list_sessions(self) -> list[SimulationSession]:
        """List all active sessions."""
        return list(self._sessions.values())

    def delete_session(self, session_id: str) -> bool:
        """Delete a simulation session."""
        session = self._sessions.pop(session_id, None)
        if session:
            session.env.close()
            logger.info(f"Deleted simulation session {session_id}")
            return True
        return False

    def reset_session(self, session_id: str, seed: int | None = None) -> Observation:
        """Reset a simulation session."""
        session = self._sessions.get(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        obs = session.env.reset(seed=seed)
        session.current_step = 0
        session.status = "running"
        session._last_observation = obs

        logger.debug(f"Reset session {session_id}")
        return obs

    def step_session(
        self,
        session_id: str,
        action: list[float],
    ) -> tuple[Observation, float, bool, bool, dict[str, Any]]:
        """Execute a step in a simulation session."""
        session = self._sessions.get(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        action_array = np.array(action, dtype=np.float32)
        obs, reward, terminated, truncated, info = session.env.step(action_array)

        session.current_step += 1
        session._last_observation = obs

        if terminated or truncated:
            session.status = "completed"

        return obs, float(reward), terminated, truncated, info

    def get_state(self, session_id: str) -> State:
        """Get current state of a simulation session."""
        session = self._sessions.get(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        return session.env.get_state()

    def set_state(self, session_id: str, state: State) -> None:
        """Set state of a simulation session."""
        session = self._sessions.get(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        session.env.set_state(state)

    def get_observation(self, session_id: str) -> Observation | None:
        """Get last observation from a session."""
        session = self._sessions.get(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        return session._last_observation

    def observation_to_dict(self, obs: Observation) -> dict[str, Any]:
        """Convert Observation to JSON-serializable dict."""
        return {
            "proprio": obs.proprio.tolist() if isinstance(obs.proprio, np.ndarray) else obs.proprio,
            "rgb": obs.rgb.tolist() if obs.rgb is not None else None,
            "depth": obs.depth.tolist() if obs.depth is not None else None,
            "tactile": obs.tactile.tolist() if obs.tactile is not None else None,
            "timestep": obs.timestep,
            "metadata": obs.metadata,
        }

    def state_to_dict(self, state: State) -> dict[str, Any]:
        """Convert State to JSON-serializable dict."""
        return {
            "joint_pos": state.joint_pos.tolist() if isinstance(state.joint_pos, np.ndarray) else state.joint_pos,
            "joint_vel": state.joint_vel.tolist() if isinstance(state.joint_vel, np.ndarray) else state.joint_vel,
            "object_states": {
                k: v.tolist() if isinstance(v, np.ndarray) else v
                for k, v in state.object_states.items()
            },
            "timestamp": state.timestamp,
        }
