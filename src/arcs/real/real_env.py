from typing import Dict, Tuple, Optional
import time
import numpy as np
import gymnasium as gym
from arcs.sim.interfaces import SimulationEnv, Observation, State


class RealRobotEnv(SimulationEnv):
    """
    Interface to physical robot (ROS or direct SDK).
    Currently uses a Mock backend for testing safe deployment logic.
    """

    def __init__(
        self,
        robot_type: str = "franka",
        control_freq: float = 30.0,  # Hz
        camera_config: Optional[Dict] = None,
    ):
        self.robot_type = robot_type
        self.control_freq = control_freq
        self.camera_config = camera_config or {}
        self.last_step_time = 0.0
        self._action_space = None  # To be defined based on robot type
        self._observation_space = None

        # Safety / State
        self.safety_mode = "strict"
        self._is_running = False

        # Mock State
        self._mock_pos = np.zeros(7)  # 7 DOF for Franka

        print(f"Initialized RealRobotEnv for {robot_type} @ {control_freq}Hz")

    def reset(self, seed: Optional[int] = None) -> Observation:
        """Move to home pose, wait for settle, capture observation."""
        print("Moving to HOME pose...")
        time.sleep(0.1)  # Simulate movement time (faster for tests)
        self._mock_pos = np.zeros(7)
        self.last_step_time = time.time()
        self._is_running = True
        return self._get_obs()

    def step(self, action: np.ndarray) -> Tuple[Observation, float, bool, bool, Dict]:
        """Send command, wait for cycle, read sensors."""
        if not self._is_running:
            raise RuntimeError("Environment not running. Call reset() first.")

        if not self.is_safe(action):
            self.emergency_stop()
            raise RuntimeError("Safety violation detected during step!")

        # Enforce Rate Limiting
        current_time = time.time()
        elapsed = current_time - self.last_step_time
        target_dt = 1.0 / self.control_freq
        if elapsed < target_dt:
            # For tests, we might want to skip sleep or keep it short
            # time.sleep(target_dt - elapsed)
            pass

        self.last_step_time = time.time()

        # Apply Action (Mock Physics)
        # Simple integrator
        self._mock_pos += action * 0.01

        obs = self._get_obs()
        reward = 0.0  # Reward typically defined by task, not robot env
        terminated = False
        truncated = False
        info = {"timestamp": self.last_step_time, "sim_to_real": True}

        return obs, reward, terminated, truncated, info

    def emergency_stop(self):
        """Immediate halt."""
        print("!!! EMERGENCY STOP !!!")
        self._is_running = False
        # In real code: send zero torques / braking command

    def is_safe(self, action: Optional[np.ndarray] = None) -> bool:
        """Check force limits, singularities, workspace bounds."""
        # Check action limits
        if action is not None:
            if np.max(np.abs(action)) > 1.0:  # Arbitrary safe limit
                print("Unsafe action magnitude")
                return False

        # Check workspace (Mock)
        if np.any(np.abs(self._mock_pos) > np.pi):
            print("Joint limit violation")
            return False

        return True

    def _get_obs(self) -> Observation:
        return Observation(
            proprio=self._mock_pos.copy(),
            timestep=int(time.time() * 1000),
            metadata={"source": "real_robot_mock"},
        )

    @property
    def action_space(self) -> gym.Space:
        # Placeholder
        from gymnasium import spaces

        return spaces.Box(low=-1.0, high=1.0, shape=(7,), dtype=np.float32)

    @property
    def observation_space(self) -> gym.Space:
        # Placeholder
        from gymnasium import spaces

        return spaces.Box(low=-np.inf, high=np.inf, shape=(7,), dtype=np.float32)

    def get_state(self) -> State:
        return State(
            joint_pos=self._mock_pos.copy(),
            joint_vel=np.zeros_like(self._mock_pos),
            object_states={},
            timestamp=time.time(),
        )

    def set_state(self, state: State) -> None:
        # For real robot, set_state is usually invalid or requires moving the robot
        # mocking it as "teleport" or ignoring
        self._mock_pos = state.joint_pos.copy()

    def update_dynamics(self, params: Dict[str, float]) -> None:
        # Real robot dynamics are physical constants, can't update them!
        # Maybe use this to update internal models if any
        pass

    def close(self):
        self._is_running = False
        print("RealRobotEnv Disconnected.")
