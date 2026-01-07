import torch
import numpy as np
import pytest
from arcs.rl.policy import MLPPolicy
from arcs.rl.ppo import PPO
from arcs.rl.buffer import RolloutBuffer, BufferOverflowError


def test_mlp_policy_forward():
    """Test policy forward pass and output shapes."""
    obs_dim = 10
    action_dim = 5
    policy = MLPPolicy(obs_dim, action_dim)

    obs = torch.randn(32, obs_dim)
    action, log_prob, entropy, value = policy.get_action_and_value(obs)

    assert action.shape == (32, action_dim)
    assert log_prob.shape == (32,)
    assert value.shape == (32,)
    # Entropy sum over action dim
    assert entropy.shape == (32,)


def test_buffer_gae():
    """Test GAE computation."""
    buffer = RolloutBuffer(100, obs_dim=4, action_dim=2)

    # Fill buffer
    for i in range(100):
        obs = np.random.randn(4)
        act = np.random.randn(2)
        rew = 1.0
        done = float(i == 99)
        val = 0.5
        lp = -0.5
        buffer.add(obs, act, rew, done, val, lp)

    buffer.compute_returns_and_advantage(last_value=0.5)
    data = buffer.get()

    assert data["advantages"].shape == (100,)
    assert data["returns"].shape == (100,)
    # Check return = adv + value
    assert torch.allclose(
        data["returns"], data["advantages"] + data["values"], atol=1e-5
    )


def test_ppo_update_step():
    """Test that PPO update runs and reduces loss (or at least runs)."""
    # Create simple environment-like data
    obs_dim = 4
    action_dim = 2
    policy = MLPPolicy(obs_dim, action_dim)
    ppo = PPO(policy)
    buffer = RolloutBuffer(64, obs_dim, action_dim)

    # Fake rollout
    for _ in range(64):
        obs = np.random.randn(obs_dim)
        act = np.random.randn(action_dim)
        buffer.add(obs, act, 1.0, 0.0, 0.5, -0.5)

    buffer.compute_returns_and_advantage(0.5)

    # Run update
    loss_info = ppo.update(buffer)

    assert "policy_loss" in loss_info
    assert "value_loss" in loss_info


def test_buffer_sample_batch():
    buffer = RolloutBuffer(10, obs_dim=3, action_dim=2)
    for _ in range(10):
        buffer.add(np.zeros(3), np.zeros(2), 1.0, 0.0, 0.0, 0.0)
    buffer.compute_returns_and_advantage(last_value=0.0)
    batch = buffer.sample_batch(batch_size=4, replace=False)
    assert batch["obs"].shape == (4, 3)
    assert batch["actions"].shape == (4, 2)


def test_buffer_overflow_strict():
    buffer = RolloutBuffer(2, obs_dim=1, action_dim=1, raise_on_overflow=True)
    buffer.add([0.0], [0.0], 0.0, 0.0, 0.0, 0.0)
    buffer.add([0.0], [0.0], 0.0, 0.0, 0.0, 0.0)
    with pytest.raises(BufferOverflowError):
        buffer.add([0.0], [0.0], 0.0, 0.0, 0.0, 0.0)
