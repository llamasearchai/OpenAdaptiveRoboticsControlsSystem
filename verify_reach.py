from arcs.sim.tasks.manipulation import ReachTask
from arcs.rl.policy import MLPPolicy
from arcs.rl.ppo import PPO
from arcs.rl.buffer import RolloutBuffer
import numpy as np
import torch
import os


def verify_reach_learning():
    # Setup
    env = ReachTask()
    obs_dim = env.observation_space.shape[0]
    action_dim = env.action_space.shape[0]

    policy = MLPPolicy(obs_dim, action_dim, hidden_dims=[64, 64])
    ppo = PPO(policy, lr=3e-4)
    buffer = RolloutBuffer(2048, obs_dim, action_dim)

    print(f"Starting training on {env.task_name}...")

    # Train Loop
    obs = env.reset().proprio

    final_mean_reward = None
    for epoch in range(5):
        # Collect rollout
        for _ in range(2048):
            with torch.no_grad():
                # Add batch dim: [ObsDim] -> [1, ObsDim]
                obs_tensor = torch.tensor(obs, dtype=torch.float32).unsqueeze(0)
                action, log_prob, _, value = policy.get_action_and_value(obs_tensor)

            # Action is [1, ActionDim], flatten to [ActionDim] for env
            action_np = action.numpy().flatten()
            next_obs_obj, reward, terminated, truncated, info = env.step(action_np)
            next_obs = next_obs_obj.proprio

            # Simple done handling
            done = terminated or truncated
            buffer.add(obs, action_np, reward, done, value.item(), log_prob.item())

            obs = next_obs
            if done:
                obs = env.reset().proprio

        # Update
        buffer.compute_returns_and_advantage(last_value=0.0)
        metrics = ppo.update(buffer)

        # Eval
        eval_rewards = []
        for _ in range(10):
            o = env.reset().proprio
            ep_ret = 0
            for _ in range(100):
                with torch.no_grad():
                    o_tensor = torch.tensor(o, dtype=torch.float32).unsqueeze(0)
                    a, _, _, _ = policy.get_action_and_value(o_tensor)
                o, r, d, t, _ = env.step(a.numpy().flatten())
                ep_ret += r.item() if hasattr(r, "item") else r
                o = o.proprio
                if d or t:
                    break
            eval_rewards.append(ep_ret)

        final_mean_reward = float(np.mean(eval_rewards))
        print(
            f"Epoch {epoch}: Loss={metrics['policy_loss']:.4f}, Mean Reward={final_mean_reward:.2f}"
        )

    print("Verification complete.")
    min_reward = float(os.getenv("ARCS_BENCHMARK_MIN_REWARD", "-10.0"))
    if final_mean_reward is not None and final_mean_reward < min_reward:
        raise RuntimeError(
            f"Benchmark failed: mean reward {final_mean_reward:.2f} < {min_reward:.2f}"
        )


if __name__ == "__main__":
    verify_reach_learning()
