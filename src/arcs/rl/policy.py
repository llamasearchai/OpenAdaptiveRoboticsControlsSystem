import torch
import torch.nn as nn
from torch.distributions import Normal
from typing import List


class MLPPolicy(nn.Module):
    """Simple MLP Actor-Critic Policy."""

    def __init__(
        self, obs_dim: int, action_dim: int, hidden_dims: List[int] = [64, 64]
    ):
        super().__init__()

        # Actor
        layers = []
        in_dim = obs_dim
        for h in hidden_dims:
            layers.append(nn.Linear(in_dim, h))
            layers.append(nn.Tanh())
            in_dim = h
        layers.append(nn.Linear(in_dim, action_dim))
        self.actor_mean = nn.Sequential(*layers)
        self.actor_logstd = nn.Parameter(
            torch.zeros(1, action_dim)
        )  # Learnable log std

        # Critic
        layers_v = []
        in_dim = obs_dim
        for h in hidden_dims:
            layers_v.append(nn.Linear(in_dim, h))
            layers_v.append(nn.Tanh())
            in_dim = h
        layers_v.append(nn.Linear(in_dim, 1))
        self.critic = nn.Sequential(*layers_v)

    def get_action_and_value(self, obs, action=None):
        if not isinstance(obs, torch.Tensor):
            obs = torch.tensor(obs, dtype=torch.float32)

        action_mean = self.actor_mean(obs)
        action_std = torch.exp(self.actor_logstd.expand_as(action_mean))

        dist = Normal(action_mean, action_std)

        if action is None:
            action = dist.sample()

        log_prob = dist.log_prob(action).sum(-1)
        entropy = dist.entropy().sum(-1)
        value = self.critic(obs).squeeze(-1)

        return action, log_prob, entropy, value
