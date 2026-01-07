import time
from dataclasses import dataclass
from typing import Dict, List, Optional

import numpy as np

from arcs.utils.logging import log_event, new_correlation_id

try:
    import cvxpy as cp
except Exception:
    cp = None


@dataclass
class Box:
    lower: np.ndarray
    upper: np.ndarray


@dataclass
class JointLimits:
    pos_min: np.ndarray
    pos_max: np.ndarray
    vel_max: np.ndarray
    torque_max: np.ndarray


class SafetyFilter:
    """Filter actions to satisfy joint, velocity, torque, and workspace constraints."""

    def __init__(
        self,
        joint_limits: JointLimits,
        workspace_bounds: Optional[Box] = None,
        dt: float = 0.01,
        use_qp: bool = True,
        solver_timeout: float = 1e-3,
    ):
        self.joint_limits = joint_limits
        self.workspace_bounds = workspace_bounds
        self.dt = dt
        self.use_qp = use_qp
        self.solver_timeout = solver_timeout
        self.correlation_id = new_correlation_id()

    def filter_action(self, action: np.ndarray, current_state: Dict) -> np.ndarray:
        start_time = time.perf_counter()
        action = np.asarray(action, dtype=np.float32)
        if np.any(np.isnan(action)):
            safe_action = np.zeros_like(action)
            self._log_event(action, safe_action, [], 0, 0.0)
            return safe_action

        q = np.asarray(current_state.get("joint_pos", np.zeros_like(action)), dtype=np.float32)
        if np.any(np.isnan(q)):
            safe_action = np.zeros_like(action)
            self._log_event(action, safe_action, [], 0, 0.0)
            return safe_action

        if self.use_qp and cp is not None:
            safe_action, iterations = self._solve_qp(action, q, current_state)
        else:
            safe_action, iterations = self._clip_action(action, q)

        clipped_joints = np.where(np.abs(action - safe_action) > 1e-6)[0].tolist()
        violations = len(clipped_joints)
        filter_time_us = (time.perf_counter() - start_time) * 1e6
        self._log_event(action, safe_action, clipped_joints, violations, filter_time_us, iterations)
        return safe_action

    def _solve_qp(
        self, action: np.ndarray, q: np.ndarray, current_state: Dict
    ) -> tuple[np.ndarray, int]:
        n = action.shape[0]
        u = cp.Variable(n)
        objective = cp.Minimize(cp.sum_squares(u - action))
        constraints = []
        vel_max = np.asarray(self.joint_limits.vel_max, dtype=np.float32)
        torque_max = np.asarray(self.joint_limits.torque_max, dtype=np.float32)
        constraints += [u <= vel_max, u >= -vel_max]
        constraints += [u <= torque_max, u >= -torque_max]

        pos_min = np.asarray(self.joint_limits.pos_min, dtype=np.float32)
        pos_max = np.asarray(self.joint_limits.pos_max, dtype=np.float32)
        q_next = q + u * self.dt
        constraints += [q_next >= pos_min, q_next <= pos_max]

        if self.workspace_bounds is not None:
            ee_pos = current_state.get("ee_pos", None)
            jacobian = current_state.get("jacobian", None)
            if ee_pos is not None and jacobian is not None:
                ee_pos = np.asarray(ee_pos, dtype=np.float32)
                jacobian = np.asarray(jacobian, dtype=np.float32)
                ee_next = ee_pos + jacobian[:3, :] @ u * self.dt
                constraints += [
                    ee_next >= self.workspace_bounds.lower,
                    ee_next <= self.workspace_bounds.upper,
                ]

        problem = cp.Problem(objective, constraints)
        try:
            problem.solve(
                solver=cp.OSQP,
                warm_start=True,
                max_iter=1000,
                time_limit=self.solver_timeout,
                verbose=False,
            )
        except Exception:
            return self._clip_action(action, q)

        if u.value is None or problem.status not in (cp.OPTIMAL, cp.OPTIMAL_INACCURATE):
            return self._clip_action(action, q)

        return np.asarray(u.value, dtype=np.float32), problem.solver_stats.num_iters

    def _clip_action(self, action: np.ndarray, q: np.ndarray) -> tuple[np.ndarray, int]:
        vel_max = np.asarray(self.joint_limits.vel_max, dtype=np.float32)
        torque_max = np.asarray(self.joint_limits.torque_max, dtype=np.float32)
        pos_min = np.asarray(self.joint_limits.pos_min, dtype=np.float32)
        pos_max = np.asarray(self.joint_limits.pos_max, dtype=np.float32)

        safe = np.clip(action, -vel_max, vel_max)
        safe = np.clip(safe, -torque_max, torque_max)
        q_next = q + safe * self.dt
        q_next = np.clip(q_next, pos_min, pos_max)
        safe = (q_next - q) / self.dt
        return safe.astype(np.float32), 0

    def _log_event(
        self,
        action: np.ndarray,
        safe_action: np.ndarray,
        clipped_joints: List[int],
        violations: int,
        filter_time_us: float,
        iterations: int = 0,
    ) -> None:
        log_event(
            "safety.filtered",
            self.correlation_id,
            clipped_joints=clipped_joints,
            original_action=action.tolist(),
            safe_action=safe_action.tolist(),
            filter_time_us=filter_time_us,
            constraint_violations_count=violations,
            qp_iterations=iterations,
        )
