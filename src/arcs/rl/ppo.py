import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
from typing import Dict, Any

from arcs.rl.policy import MLPPolicy
from arcs.rl.buffer import RolloutBuffer


class PPO:
    """Proximal Policy Optimization."""

    def __init__(
        self,
        policy: MLPPolicy,
        lr: float = 3e-4,
        clip_ratio: float = 0.2,
        gamma: float = 0.99,
        gae_lambda: float = 0.95,
        entropy_coef: float = 0.01,
        vf_coef: float = 0.5,
        target_kl: float = 0.015,
        update_epochs: int = 10,
        batch_size: int = 64,
    ):
        self.policy = policy
        self.optimizer = optim.Adam(policy.parameters(), lr=lr)

        self.clip_ratio = clip_ratio
        self.gamma = gamma
        self.gae_lambda = gae_lambda
        self.entropy_coef = entropy_coef
        self.vf_coef = vf_coef
        self.target_kl = target_kl
        self.update_epochs = update_epochs
        self.batch_size = batch_size

    def update(self, buffer: RolloutBuffer) -> Dict[str, float]:
        buffer.get(normalize_advantages=True, reset_buffer=False)
        size = buffer.size

        loss_info = {"policy_loss": 0.0, "value_loss": 0.0, "kl": 0.0}
        num_updates = 0
        stop_training = False

        for i in range(self.update_epochs):
            buffer.reset_sampling()
            num_batches = max(1, int(np.ceil(size / self.batch_size)))
            for _ in range(num_batches):
                batch = buffer.sample_batch(self.batch_size, replace=False)
                obs = batch["obs"]
                act = batch["actions"]
                ret = batch["returns"]
                adv = batch["advantages"]
                old_log_p = batch["log_probs"]

                # Re-evaluate
                _, log_p, entropy, values = self.policy.get_action_and_value(obs, act)

                ratio = torch.exp(log_p - old_log_p)
                surr1 = ratio * adv
                surr2 = (
                    torch.clamp(ratio, 1.0 - self.clip_ratio, 1.0 + self.clip_ratio)
                    * adv
                )
                policy_loss = -torch.min(surr1, surr2).mean()

                value_loss = 0.5 * ((ret - values) ** 2).mean()

                entropy_loss = -entropy.mean()

                loss = (
                    policy_loss
                    + self.vf_coef * value_loss
                    + self.entropy_coef * entropy_loss
                )

                # Optimization step
                self.optimizer.zero_grad()
                loss.backward()
                self.optimizer.step()

                # Logging (approx KL)
                with torch.no_grad():
                    approx_kl = (old_log_p - log_p).mean().item()

                loss_info["policy_loss"] += policy_loss.item()
                loss_info["value_loss"] += value_loss.item()
                loss_info["kl"] += approx_kl
                num_updates += 1

                if approx_kl > 1.5 * self.target_kl:
                    stop_training = True
                    break
            if stop_training:
                break

        if num_updates > 0:
            loss_info["policy_loss"] /= num_updates
            loss_info["value_loss"] /= num_updates
            loss_info["kl"] /= num_updates

        buffer.reset()

        return loss_info
