import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
from typing import Callable, Dict, List, Optional, Union

from arcs.rl.policy import MLPPolicy
from arcs.imitation.teleop import Demonstration
from arcs.imitation.dataset import DemonstrationDataset, DatasetConfig


class BehavioralCloning:
    """Supervised learning from demonstrations."""

    def __init__(self, policy: MLPPolicy, lr: float = 1e-4):
        self.policy = policy
        self.optimizer = optim.Adam(policy.parameters(), lr=lr)
        self.loss_fn = nn.MSELoss()  # For continuous actions

    def _prepare_dataset(self, dataset: DemonstrationDataset):
        dataset.validate()
        obs_list = []
        act_list = []
        for d in dataset.iter_demos():
            # Pair (o_t, a_t)
            # Demos have N+1 obs, N actions
            length = len(d.actions)
            for i in range(length):
                obs_list.append(d.observations[i].proprio)
                act_list.append(d.actions[i])

        return (
            torch.tensor(np.array(obs_list), dtype=torch.float32),
            torch.tensor(np.array(act_list), dtype=torch.float32),
        )

    def train(
        self,
        demonstrations: Union[List[Demonstration], DemonstrationDataset],
        epochs: int = 10,
        batch_size: int = 32,
        val_split: float = 0.1,
        preprocess_pipeline: Optional[
            List[Callable[[DemonstrationDataset], DemonstrationDataset]]
        ] = None,
        dataset_config: Optional[DatasetConfig] = None,
    ) -> Dict[str, List[float]]:
        if isinstance(demonstrations, DemonstrationDataset):
            dataset = demonstrations
        else:
            dataset = DemonstrationDataset(demonstrations, config=dataset_config)
        if dataset_config is not None:
            dataset.config = dataset_config

        if preprocess_pipeline:
            for step in preprocess_pipeline:
                dataset = step(dataset)

        if len(dataset) == 0:
            raise ValueError("Empty demonstration dataset after preprocessing")

        # Split data
        n_val = int(len(dataset) * val_split)
        train_dataset = DemonstrationDataset(
            [dataset[i] for i in range(n_val, len(dataset))],
            config=dataset.config,
        )
        val_dataset = DemonstrationDataset(
            [dataset[i] for i in range(0, n_val)], config=dataset.config
        )

        obs_train, act_train = self._prepare_dataset(train_dataset)

        history = {"train_loss": [], "val_loss": []}

        n_samples = len(obs_train)
        if n_samples == 0:
            return history

        for ep in range(epochs):
            # Shuffle
            indices = torch.randperm(n_samples)

            epoch_loss = 0.0
            steps = 0

            for start in range(0, n_samples, batch_size):
                end = start + batch_size
                batch_idx = indices[start:end]

                batch_obs = obs_train[batch_idx]
                batch_act = act_train[batch_idx]

                # Forward - predicting mean action from policy
                # Note: MLPPolicy outputs distribution. We take mean.
                pred_action, _, _, _ = self.policy.get_action_and_value(batch_obs)
                # Actually get_action_and_value samples.
                # For pure BC, we usually want deterministic mean or maximize log_prob correctly.
                # Let's use MSE on 'pred_action' sample for simplicity, or better:
                # get mean manually if possible.
                # MLPPolicy architecture exposes actor_mean.
                pred_mean = self.policy.actor_mean(batch_obs)

                loss = self.loss_fn(pred_mean, batch_act)

                self.optimizer.zero_grad()
                loss.backward()
                self.optimizer.step()

                epoch_loss += loss.item()
                steps += 1

            mean_loss = epoch_loss / max(1, steps)
            history["train_loss"].append(mean_loss)

        return history
