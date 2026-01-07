import time
from typing import Dict, Optional

import numpy as np
import torch

from arcs.utils.logging import log_event, new_correlation_id


class BufferNotFullError(RuntimeError):
    pass


class BufferOverflowError(RuntimeError):
    pass


class RolloutBuffer:
    """Buffer for storing on-policy rollouts."""

    def __init__(
        self,
        buffer_size: int,
        obs_dim: int,
        action_dim: int,
        gamma: float = 0.99,
        gae_lambda: float = 0.95,
        normalize_advantages: bool = False,
        allow_overwrite: bool = False,
        raise_on_overflow: bool = False,
        reward_clip: float = 1e3,
    ):
        if not (0.0 < gamma <= 1.0):
            raise ValueError("gamma must be in (0, 1]")
        if not (0.0 <= gae_lambda <= 1.0):
            raise ValueError("gae_lambda must be in [0, 1]")
        self.obs = np.zeros((buffer_size, obs_dim), dtype=np.float32)
        self.actions = np.zeros((buffer_size, action_dim), dtype=np.float32)
        self.rewards = np.zeros(buffer_size, dtype=np.float32)
        self.dones = np.zeros(buffer_size, dtype=np.float32)
        self.values = np.zeros(buffer_size, dtype=np.float32)
        self.log_probs = np.zeros(buffer_size, dtype=np.float32)
        self.episode_starts = np.zeros(buffer_size, dtype=bool)

        self.ptr = 0
        self.max_size = buffer_size
        self.full = False
        self.gamma = gamma
        self.gae_lambda = gae_lambda
        self.normalize_advantages = normalize_advantages
        self.allow_overwrite = allow_overwrite
        self.raise_on_overflow = raise_on_overflow
        self.reward_clip = float(reward_clip)
        self.correlation_id = new_correlation_id()

        self.advantages = np.zeros(buffer_size, dtype=np.float32)
        self.returns = np.zeros(buffer_size, dtype=np.float32)

        self._sample_indices = None
        self._sample_pos = 0
        self._last_done = True
        self._full_emitted = False
        self._normalized_advantages = None

    @property
    def size(self) -> int:
        return self.max_size if self.full else self.ptr

    def is_full(self) -> bool:
        return self.full

    def add(
        self,
        obs,
        action,
        reward,
        done,
        value,
        log_prob,
        episode_start: Optional[bool] = None,
    ) -> None:
        if self.ptr >= self.max_size and not self.allow_overwrite:
            log_event(
                "buffer.overflow",
                self.correlation_id,
                size=self.size,
                max_size=self.max_size,
            )
            if self.raise_on_overflow:
                raise BufferOverflowError("RolloutBuffer overflow")
            return

        idx = self.ptr
        if self.full and self.allow_overwrite:
            idx = self.ptr % self.max_size

        reward = float(np.nan_to_num(reward, nan=0.0))
        reward = float(np.clip(reward, -self.reward_clip, self.reward_clip))

        self.obs[idx] = np.asarray(obs, dtype=np.float32)
        self.actions[idx] = np.asarray(action, dtype=np.float32)
        self.rewards[idx] = np.float32(reward)
        self.dones[idx] = np.float32(done)
        self.values[idx] = np.float32(value)
        self.log_probs[idx] = np.float32(log_prob)

        if episode_start is None:
            episode_start = self._last_done
        self.episode_starts[idx] = bool(episode_start)
        self._last_done = bool(done)

        self.ptr += 1
        if self.ptr >= self.max_size:
            if self.allow_overwrite:
                self.full = True
                self.ptr = 0
            else:
                self.full = True
                self.ptr = self.max_size
            if not self._full_emitted:
                log_event(
                    "buffer.full",
                    self.correlation_id,
                    size=self.size,
                    max_size=self.max_size,
                )
                self._full_emitted = True

    def compute_returns_and_advantage(
        self,
        last_value: float,
        episode_starts: Optional[np.ndarray] = None,
        normalize_advantages: Optional[bool] = None,
    ) -> None:
        if self.size == 0:
            return

        start_time = time.perf_counter()
        indices = self._ordered_indices()
        rewards = torch.tensor(self.rewards[indices], dtype=torch.float32)
        values = torch.tensor(self.values[indices], dtype=torch.float32)
        dones = torch.tensor(self.dones[indices], dtype=torch.float32)
        if episode_starts is None:
            episode_starts_t = torch.tensor(
                self.episode_starts[indices], dtype=torch.bool
            )
        else:
            episode_starts_t = torch.tensor(episode_starts, dtype=torch.bool)

        if episode_starts_t.numel() > 0:
            episode_starts_t[0] = True

        next_values = torch.cat([values[1:], torch.tensor([last_value])])
        next_non_terminal = 1.0 - dones
        if episode_starts_t.numel() > 1:
            next_non_terminal[:-1] = 1.0 - episode_starts_t[1:].float()

        deltas = rewards + self.gamma * next_values * next_non_terminal - values

        advantages = torch.zeros_like(deltas)
        discount = self.gamma * self.gae_lambda
        starts = torch.nonzero(episode_starts_t, as_tuple=False).flatten().tolist()
        if len(starts) == 0:
            starts = [0]
        ends = starts[1:] + [len(deltas)]
        for start, end in zip(starts, ends):
            segment = deltas[start:end]
            if segment.numel() == 0:
                continue
            advantages[start:end] = self._discounted_cumsum(segment, discount)

        returns = advantages + values

        self.advantages[indices] = advantages.detach().cpu().numpy()
        self.returns[indices] = returns.detach().cpu().numpy()

        adv_mean = advantages.mean().item()
        adv_std = advantages.std(unbiased=False).item()
        compute_time_us = (time.perf_counter() - start_time) * 1e6
        log_event(
            "buffer.gae",
            self.correlation_id,
            gae_compute_time_us=compute_time_us,
            advantage_mean=adv_mean,
            advantage_std=adv_std,
        )

        if normalize_advantages is None:
            normalize_advantages = self.normalize_advantages
        self._normalized_advantages = None
        if normalize_advantages:
            normed = (advantages - adv_mean) / (adv_std + 1e-8)
            normalized = np.zeros_like(self.advantages)
            normalized[indices] = normed.detach().cpu().numpy()
            self._normalized_advantages = normalized

    def get(
        self,
        require_full: bool = True,
        normalize_advantages: Optional[bool] = None,
        reset_buffer: bool = True,
    ):
        """Return gathered data as tensors."""
        if require_full and not self.full:
            raise BufferNotFullError("RolloutBuffer not full")

        indices = self._ordered_indices()
        if normalize_advantages is None:
            normalize_advantages = self.normalize_advantages
        if normalize_advantages:
            if getattr(self, "_normalized_advantages", None) is None:
                adv_slice = self.advantages[indices]
                adv_mean = adv_slice.mean()
                adv_std = adv_slice.std()
                normalized = np.zeros_like(self.advantages)
                normalized[indices] = (adv_slice - adv_mean) / (adv_std + 1e-8)
                self._normalized_advantages = normalized
            advantages = self._normalized_advantages
        else:
            advantages = self.advantages

        data = {
            "obs": torch.tensor(self.obs[indices], dtype=torch.float32),
            "actions": torch.tensor(self.actions[indices], dtype=torch.float32),
            "returns": torch.tensor(self.returns[indices], dtype=torch.float32),
            "advantages": torch.tensor(advantages[indices], dtype=torch.float32),
            "log_probs": torch.tensor(self.log_probs[indices], dtype=torch.float32),
            "values": torch.tensor(self.values[indices], dtype=torch.float32),
        }
        if reset_buffer:
            self.reset()
        return data

    def sample_batch(self, batch_size: int, replace: bool = False) -> Dict[str, torch.Tensor]:
        size = self.size
        if size == 0:
            raise BufferNotFullError("RolloutBuffer empty")
        if not replace and batch_size > size:
            raise ValueError("batch_size exceeds buffer size without replacement")

        if replace:
            indices = np.random.randint(0, size, size=batch_size)
        else:
            if self._sample_indices is None or self._sample_pos + batch_size > size:
                self._sample_indices = np.random.permutation(size)
                self._sample_pos = 0
            start = self._sample_pos
            end = start + batch_size
            indices = self._sample_indices[start:end]
            self._sample_pos = end

        log_event(
            "buffer.sample",
            self.correlation_id,
            batch_size=batch_size,
        )
        ordered_indices = self._ordered_indices()
        data_idx = ordered_indices[indices]
        if self.normalize_advantages and getattr(self, "_normalized_advantages", None) is None:
            adv_slice = self.advantages[ordered_indices]
            adv_mean = adv_slice.mean()
            adv_std = adv_slice.std()
            normalized = np.zeros_like(self.advantages)
            normalized[ordered_indices] = (adv_slice - adv_mean) / (adv_std + 1e-8)
            self._normalized_advantages = normalized
        advantages = (
            self._normalized_advantages
            if getattr(self, "_normalized_advantages", None) is not None
            else self.advantages
        )
        return {
            "obs": torch.tensor(self.obs[data_idx], dtype=torch.float32),
            "actions": torch.tensor(self.actions[data_idx], dtype=torch.float32),
            "returns": torch.tensor(self.returns[data_idx], dtype=torch.float32),
            "advantages": torch.tensor(advantages[data_idx], dtype=torch.float32),
            "log_probs": torch.tensor(self.log_probs[data_idx], dtype=torch.float32),
            "values": torch.tensor(self.values[data_idx], dtype=torch.float32),
        }

    def _ordered_indices(self) -> np.ndarray:
        if not self.full or not self.allow_overwrite:
            return np.arange(self.size)
        return np.concatenate(
            (np.arange(self.ptr, self.max_size), np.arange(0, self.ptr))
        )

    def reset(self) -> None:
        self.ptr = 0
        self.full = False
        self._sample_indices = None
        self._sample_pos = 0
        self._last_done = True
        self._full_emitted = False
        self._normalized_advantages = None

    def reset_sampling(self) -> None:
        self._sample_indices = None
        self._sample_pos = 0

    @staticmethod
    def _discounted_cumsum(x: torch.Tensor, discount: float) -> torch.Tensor:
        if discount == 0.0:
            return x
        discounts = discount ** torch.arange(
            x.shape[0], device=x.device, dtype=x.dtype
        )
        reversed_x = torch.flip(x, dims=[0])
        reversed_discounted = torch.cumsum(reversed_x * discounts, dim=0)
        return torch.flip(reversed_discounted / discounts, dims=[0])
