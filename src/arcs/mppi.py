import time
from dataclasses import dataclass
from typing import Callable, Optional

import numpy as np

from arcs.utils.logging import log_event, new_correlation_id

try:
    import torch
except Exception:
    torch = None


@dataclass
class MPPIConfig:
    horizon: int
    num_samples: int
    temperature: float
    noise_sigma: float
    dynamics_model: Callable
    cost_fn: Optional[Callable] = None
    device: str = "cpu"


class MPPIController:
    """Model Predictive Path Integral controller."""

    def __init__(self, config: MPPIConfig, action_dim: int):
        if torch is None:
            raise ImportError("torch is required for MPPIController")
        self.config = config
        self.action_dim = action_dim
        self.device = torch.device(config.device)
        self.prev_action_seq = None
        self.correlation_id = new_correlation_id()

    def get_action(self, state: np.ndarray) -> np.ndarray:
        start_time = time.perf_counter()
        state_t = torch.tensor(state, dtype=torch.float32, device=self.device)
        if state_t.ndim == 1:
            state_t = state_t.unsqueeze(0)
        state_t = state_t.repeat(self.config.num_samples, 1)

        base = (
            self.prev_action_seq
            if self.prev_action_seq is not None
            else torch.zeros(
                self.config.horizon, self.action_dim, device=self.device
            )
        )
        noise = torch.randn(
            self.config.num_samples,
            self.config.horizon,
            self.action_dim,
            device=self.device,
        ) * self.config.noise_sigma
        action_sequences = base.unsqueeze(0) + noise

        costs = torch.zeros(self.config.num_samples, device=self.device)
        state_batch = state_t
        for t in range(self.config.horizon):
            actions_t = action_sequences[:, t, :]
            step_out = self.config.dynamics_model(state_batch, actions_t)
            if isinstance(step_out, tuple):
                state_batch, step_cost = step_out
            else:
                state_batch = step_out
                if self.config.cost_fn is None:
                    step_cost = torch.zeros_like(costs)
                else:
                    step_cost = self.config.cost_fn(state_batch, actions_t)
            costs = costs + step_cost

        if torch.any(torch.isnan(costs)) or torch.all(torch.isinf(costs)):
            return np.zeros(self.action_dim, dtype=np.float32)

        min_cost = torch.min(costs)
        weights = torch.softmax(-(costs - min_cost) / self.config.temperature, dim=0)
        weighted_actions = torch.sum(
            weights.view(-1, 1, 1) * action_sequences, dim=0
        )
        action = weighted_actions[0].detach().cpu().numpy()

        self.prev_action_seq = torch.cat(
            [weighted_actions[1:], weighted_actions[-1:].clone()], dim=0
        ).detach()

        plan_time_ms = (time.perf_counter() - start_time) * 1000.0
        log_event(
            "mppi.planned",
            self.correlation_id,
            best_cost=float(costs.min().item()),
            planning_time_ms=plan_time_ms,
            cost_mean=float(costs.mean().item()),
            cost_std=float(costs.std(unbiased=False).item()),
        )
        return action
