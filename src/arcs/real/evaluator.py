from dataclasses import dataclass
from typing import Dict, Optional, Any
import numpy as np
import time

from arcs.sim.interfaces import SimulationEnv, Observation
from arcs.real.real_env import RealRobotEnv

# Determine Policy Interface - assuming standard call signature or similar
# For now, we type-hint as Any or a dummy Protocol since Policy might be from arcs.rl.policy
from typing import Protocol


class Policy(Protocol):
    def get_action_and_value(self, obs: Any) -> Any: ...
    # Or simple __call__
    def __call__(self, obs: Any) -> Any: ...


@dataclass
class Metrics:
    success_rate: float
    mean_reward: float
    episode_length: float
    timestamp: float


@dataclass
class TransferGap:
    success_rate_gap: float
    reward_gap: float
    timing_mismatch: float


class SimToRealEvaluator:
    """
    Structured evaluation of transfer quality.
    """

    def __init__(
        self,
        sim_env: SimulationEnv,
        real_env: RealRobotEnv,
        policy: Any,  # Should be arcs.rl.policy.BasePolicy or similar
    ):
        self.sim_env = sim_env
        self.real_env = real_env
        self.policy = policy

    def eval_sim(self, n_episodes: int = 100) -> Metrics:
        """Evaluate policy in sim."""
        print(f"Evaluating in SIM ({n_episodes} episodes)...")
        return self._run_eval_loop(self.sim_env, n_episodes, is_real=False)

    def eval_real(self, n_episodes: int = 20) -> Metrics:
        """Evaluate policy on real (mock) robot."""
        print(f"Evaluating in REAL ({n_episodes} episodes)...")
        # Safety protocol: Operator confirmation could go here
        return self._run_eval_loop(self.real_env, n_episodes, is_real=True)

    def compute_transfer_gap(self, n_sim: int = 50, n_real: int = 10) -> TransferGap:
        metrics_sim = self.eval_sim(n_episodes=n_sim)
        metrics_real = self.eval_real(n_episodes=n_real)

        return TransferGap(
            success_rate_gap=metrics_sim.success_rate - metrics_real.success_rate,
            reward_gap=metrics_sim.mean_reward - metrics_real.mean_reward,
            timing_mismatch=abs(metrics_sim.episode_length - metrics_real.episode_length),
        )

    def _run_eval_loop(self, env: SimulationEnv, n_episodes: int, is_real: bool) -> Metrics:
        rewards = []
        lengths = []
        successes = []

        for i in range(n_episodes):
            obs = env.reset()
            if hasattr(obs, "proprio"):
                obs_data = obs.proprio  # Assuming policy expects vector
            else:
                obs_data = obs  # Fallback

            total_reward = 0
            steps = 0
            done = False

            while not done:
                # Mock Policy Action if not callable
                if not callable(self.policy) and not hasattr(self.policy, "get_action_and_value"):
                    # Dummy action
                    action = env.action_space.sample()
                else:
                    # Adapt to RL policy signature
                    try:
                        import torch

                        if isinstance(obs_data, np.ndarray):
                            obs_t = torch.tensor(obs_data, dtype=torch.float32).unsqueeze(0)
                        else:
                            obs_t = obs_data

                        if hasattr(self.policy, "get_action_and_value"):
                            action_t, _, _, _ = self.policy.get_action_and_value(obs_t)
                            action = action_t.detach().numpy().flatten()
                        else:
                            # Assume simple forward
                            res = self.policy(obs_t)
                            # Handle distribution or tensor
                            if isinstance(res, torch.Tensor):
                                action = res.detach().numpy().flatten()
                            elif hasattr(res, "sample"):
                                action = res.sample().detach().numpy().flatten()
                            else:
                                action = env.action_space.sample()  # Fallback
                    except Exception as e:
                        # Fallback for non-torch policies (like expert script)
                        if hasattr(self.policy, "read_input"):  # Teleop
                            action = self.policy.read_input(obs, getattr(env, "goal", None))
                        else:
                            action = np.zeros(env.action_space.shape)

                # Unpack 5 values (gymnasium standard)
                obs_obj, r, terminated, truncated, info = env.step(action)

                # Handle return types
                if isinstance(r, tuple):
                    r = r[0]

                obs = obs_obj
                if hasattr(obs, "proprio"):
                    obs_data = obs.proprio

                total_reward += float(r)
                steps += 1

                done = terminated or truncated

                if steps > 100:  # Timeout
                    done = True

            rewards.append(total_reward)
            lengths.append(steps)
            successes.append(info.get("is_success", info.get("success", False)))

        return Metrics(
            success_rate=np.mean(successes),
            mean_reward=np.mean(rewards),
            episode_length=np.mean(lengths),
            timestamp=time.time(),
        )
