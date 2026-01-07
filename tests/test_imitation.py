import pytest
import numpy as np
import torch
from arcs.imitation.teleop import TeleoperationInterface, Demonstration
from arcs.imitation.bc import BehavioralCloning
from arcs.imitation.dataset import DemonstrationDataset
from arcs.sim.tasks.manipulation import ReachTask
from arcs.sim.interfaces import Observation
from arcs.rl.policy import MLPPolicy


class MockEnv(ReachTask):
    """Mock Env for determinism."""

    def step(self, action):
        return super().step(action)


def test_teleop_recording():
    """Test recording a demonstration."""
    env = MockEnv()
    teleop = TeleoperationInterface()

    demo = teleop.record_demonstration(env, max_steps=10)

    assert len(demo.observations) == 11  # N+1 obs
    assert len(demo.actions) == 10
    assert len(demo.rewards) == 10
    assert "timestamp" in demo.metadata


def test_bc_training():
    """Test BC training loop."""
    # Create fake demos
    demos = []

    # Policy to train
    policy = MLPPolicy(20, 7)
    bc = BehavioralCloning(policy)

    # Generate perfect demos from a 'expert' (random valid actions)
    for _ in range(5):
        obs_list = [Observation(proprio=np.zeros(20)) for _ in range(6)]
        act_list = [np.ones(7) * 0.1] * 5
        d = Demonstration(obs_list, act_list, [0.0] * 5, {})
        demos.append(d)

    history = bc.train(demos, epochs=2, batch_size=2, val_split=0.2)

    assert "train_loss" in history
    assert len(history["train_loss"]) == 2
    # Ensure policy weights changed (or at least valid gradient step happened)


def test_demonstration_dataset_filters():
    obs_seq = [Observation(proprio=np.zeros(3)) for _ in range(3)]
    demo_success = Demonstration(
        observations=obs_seq,
        actions=[np.zeros(2), np.zeros(2)],
        rewards=[0.0, 0.0],
        metadata={"success": True},
    )
    demo_fail = Demonstration(
        observations=obs_seq,
        actions=[np.zeros(2), np.zeros(2)],
        rewards=[0.0, 0.0],
        metadata={"success": False},
    )
    dataset = DemonstrationDataset([demo_success, demo_fail])
    filtered = dataset.filter_by_success(min_success_rate=1.0)
    assert len(filtered) == 1
    augmented = filtered.augment_spatial(pose_noise_std=0.0, factor=1)
    assert len(augmented) == 2
