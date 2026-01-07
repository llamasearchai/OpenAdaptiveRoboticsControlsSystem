import numpy as np
import pytest

from arcs.sim.backends.dummy import DummyBackend
from arcs.sim.factory import SimulationBackendFactory
from arcs.sim.randomization import DomainRandomizer, RandomizationConfig
from arcs.sim.tasks.manipulation import ReachTask


def test_dummy_backend_interface():
    """Test standard interface on dummy backend."""
    env = DummyBackend()
    obs = env.reset()

    assert hasattr(obs, "proprio")
    assert obs.proprio.shape[0] == 20

    action = env.action_space.sample()
    obs, reward, terminated, truncated, info = env.step(action)

    assert isinstance(reward, float)
    assert isinstance(terminated, bool)
    assert isinstance(aggregated_obs_shape := obs.proprio.shape, tuple)


def test_reach_task_logic():
    """Test reach task rewards and success check."""
    env = ReachTask()
    env.reset()

    # Move towards goal
    dist_initial = np.linalg.norm(env.joint_pos[:3] - env.goal)

    # Action that moves towards goal (assuming direct velocity control on pos)
    direction = env.goal - env.joint_pos[:3]
    action = np.zeros(7)
    action[:3] = direction * 10  # Speed up approach

    obs, reward, terminated, truncated, info = env.step(action)

    dist_new = np.linalg.norm(env.joint_pos[:3] - env.goal)
    assert dist_new < dist_initial
    assert reward > -dist_initial  # Reward should be less negative


def test_domain_randomization():
    """Test randomization config."""
    config = RandomizationConfig()
    config.dynamics.mass_scale.distribution.low = 1.0
    config.dynamics.mass_scale.distribution.high = 1.0
    randomizer = DomainRandomizer(config)
    env = ReachTask()

    # Just ensure it runs without error for now
    randomizer.randomize_episode(env)


def test_backend_factory_dummy():
    env = SimulationBackendFactory.create_env("Reach", backend="dummy")
    obs = env.reset()
    assert obs.proprio.shape[-1] == 20
    env.close()


def test_backend_factory_vectorized():
    env = SimulationBackendFactory.create_env("Reach", backend="dummy", num_envs=4)
    obs = env.reset()
    assert obs.proprio.shape[0] == 4
    action = env.action_space.sample()
    obs, reward, terminated, truncated, info = env.step(action)
    assert obs.proprio.shape[0] == 4
    env.close()
