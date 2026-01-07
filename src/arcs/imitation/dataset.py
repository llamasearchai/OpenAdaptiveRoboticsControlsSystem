import json
from dataclasses import dataclass
from typing import Any, Callable, Dict, Iterable, List, Optional

import numpy as np

from arcs.imitation.teleop import Demonstration
from arcs.sim.interfaces import Observation
from arcs.utils.logging import log_event, new_correlation_id
from arcs.utils.path_validator import PathValidator

try:
    import h5py
except Exception:
    h5py = None


@dataclass
class DatasetConfig:
    min_success_rate: float = 1.0
    max_jerk: float = 10.0
    augmentation_factor: int = 0


class DemonstrationDataset:
    """Manage demonstration data with filtering, augmentation, and lazy loading."""

    def __init__(
        self,
        demonstrations: Optional[List[Demonstration]] = None,
        path: Optional[str] = None,
        lazy: bool = True,
        config: Optional[DatasetConfig] = None,
        allowlist: Optional[List[str]] = None,
        strict_paths: bool = False,
    ):
        self._demos = demonstrations or []
        self._path = path
        self._lazy = lazy
        self._h5 = None
        self._demo_keys: List[str] = []
        self.config = config or DatasetConfig()
        self.correlation_id = new_correlation_id()

        if path is not None:
            self._open_hdf5(path, allowlist=allowlist, strict_paths=strict_paths)

    def __len__(self) -> int:
        if self._h5 is not None:
            return len(self._demo_keys)
        return len(self._demos)

    def __getitem__(self, idx: int) -> Demonstration:
        if self._h5 is not None:
            return self._load_demo_from_h5(idx)
        return self._demos[idx]

    def iter_demos(self) -> Iterable[Demonstration]:
        for idx in range(len(self)):
            yield self[idx]

    def validate(self) -> None:
        obs_dim = None
        action_dim = None
        for demo in self.iter_demos():
            if len(demo.actions) == 0:
                continue
            current_obs = demo.observations[0].proprio
            current_act = demo.actions[0]
            if obs_dim is None:
                obs_dim = current_obs.shape[-1]
            if action_dim is None:
                action_dim = current_act.shape[-1]
            if current_obs.shape[-1] != obs_dim:
                raise ValueError("Inconsistent observation dimensions in dataset")
            if current_act.shape[-1] != action_dim:
                raise ValueError("Inconsistent action dimensions in dataset")

    def filter_by_success(self, min_success_rate: Optional[float] = None) -> "DemonstrationDataset":
        if min_success_rate is None:
            min_success_rate = self.config.min_success_rate
        filtered = []
        for demo in self.iter_demos():
            success_flag = bool(demo.metadata.get("success", False))
            success_rate = float(demo.metadata.get("success_rate", 1.0 if success_flag else 0.0))
            if success_rate >= min_success_rate:
                filtered.append(demo)
        if len(filtered) == 0:
            raise ValueError("All demonstrations failed success filter")
        log_event(
            "dataset.filtered",
            self.correlation_id,
            filter="success",
            kept=len(filtered),
            total=len(self),
        )
        return DemonstrationDataset(filtered, config=self.config)

    def filter_by_smoothness(self, jerk_threshold: Optional[float] = None) -> "DemonstrationDataset":
        if jerk_threshold is None:
            jerk_threshold = self.config.max_jerk
        filtered = []
        for demo in self.iter_demos():
            if len(demo.actions) < 3:
                filtered.append(demo)
                continue
            actions = np.asarray(demo.actions, dtype=np.float32)
            jerk = np.diff(actions, n=2, axis=0)
            if np.max(np.linalg.norm(jerk, axis=1)) <= jerk_threshold:
                filtered.append(demo)
        if len(filtered) == 0:
            raise ValueError("No demonstrations left after smoothness filter")
        log_event(
            "dataset.filtered",
            self.correlation_id,
            filter="smoothness",
            kept=len(filtered),
            total=len(self),
        )
        return DemonstrationDataset(filtered, config=self.config)

    def trim_idle_frames(self, velocity_threshold: float = 0.01) -> "DemonstrationDataset":
        trimmed = []
        for demo in self.iter_demos():
            actions = np.asarray(demo.actions, dtype=np.float32)
            speeds = np.linalg.norm(actions, axis=1)
            if len(speeds) == 0:
                continue
            if not np.any(speeds > velocity_threshold):
                continue
            start = int(np.argmax(speeds > velocity_threshold))
            end = len(speeds) - int(np.argmax(speeds[::-1] > velocity_threshold))
            if end <= start:
                continue
            observations = demo.observations[start : end + 1]
            actions_trim = demo.actions[start:end]
            rewards_trim = demo.rewards[start:end]
            trimmed.append(
                Demonstration(
                    observations=observations,
                    actions=actions_trim,
                    rewards=rewards_trim,
                    metadata=demo.metadata,
                )
            )
        if len(trimmed) == 0:
            raise ValueError("Empty dataset after trimming idle frames")
        log_event(
            "dataset.filtered",
            self.correlation_id,
            filter="trim_idle",
            kept=len(trimmed),
            total=len(self),
        )
        return DemonstrationDataset(trimmed, config=self.config)

    def augment_spatial(
        self, pose_noise_std: float = 0.01, factor: Optional[int] = None
    ) -> "DemonstrationDataset":
        if factor is None:
            factor = self.config.augmentation_factor
        if factor <= 0:
            return DemonstrationDataset(list(self.iter_demos()), config=self.config)
        augmented = list(self.iter_demos())
        for _ in range(factor):
            for demo in self.iter_demos():
                obs_noisy = []
                for obs in demo.observations:
                    noisy_proprio = obs.proprio + np.random.normal(
                        0.0, pose_noise_std, size=obs.proprio.shape
                    )
                    obs_noisy.append(
                        Observation(
                            proprio=noisy_proprio,
                            rgb=obs.rgb,
                            depth=obs.depth,
                            tactile=obs.tactile,
                            timestep=obs.timestep,
                            metadata=obs.metadata.copy(),
                        )
                    )
                augmented.append(
                    Demonstration(
                        observations=obs_noisy,
                        actions=demo.actions,
                        rewards=demo.rewards,
                        metadata=demo.metadata,
                    )
                )
        log_event(
            "dataset.augmented",
            self.correlation_id,
            factor=factor,
            total=len(augmented),
        )
        return DemonstrationDataset(augmented, config=self.config)

    def compute_statistics(self) -> Dict[str, np.ndarray]:
        obs_list = []
        act_list = []
        for demo in self.iter_demos():
            for obs in demo.observations[:-1]:
                obs_list.append(obs.proprio)
            for act in demo.actions:
                act_list.append(act)
        if len(obs_list) == 0 or len(act_list) == 0:
            raise ValueError("Empty dataset for statistics")
        obs_arr = np.asarray(obs_list, dtype=np.float32)
        act_arr = np.asarray(act_list, dtype=np.float32)
        return {
            "obs_mean": obs_arr.mean(axis=0),
            "obs_std": obs_arr.std(axis=0) + 1e-8,
            "act_mean": act_arr.mean(axis=0),
            "act_std": act_arr.std(axis=0) + 1e-8,
        }

    def to_hdf5(self, path: str, allowlist: Optional[List[str]] = None, strict_paths: bool = False) -> None:
        if h5py is None:
            raise ImportError("h5py is required for HDF5 storage")
        validator = PathValidator(allowlist=allowlist, strict=strict_paths)
        resolved = validator.validate(path)
        with h5py.File(resolved, "w") as f:
            demos_group = f.create_group("demos")
            for idx, demo in enumerate(self.iter_demos()):
                g = demos_group.create_group(f"demo_{idx}")
                obs = np.asarray([o.proprio for o in demo.observations], dtype=np.float32)
                g.create_dataset("proprio", data=obs)
                g.create_dataset("actions", data=np.asarray(demo.actions, dtype=np.float32))
                g.create_dataset("rewards", data=np.asarray(demo.rewards, dtype=np.float32))
                g.attrs["metadata_json"] = json.dumps(demo.metadata)

    def _open_hdf5(
        self, path: str, allowlist: Optional[List[str]], strict_paths: bool
    ) -> None:
        if h5py is None:
            raise ImportError("h5py is required for HDF5 storage")
        validator = PathValidator(allowlist=allowlist, strict=strict_paths)
        resolved = validator.validate(path)
        try:
            self._h5 = h5py.File(resolved, "r")
            self._demo_keys = list(self._h5["demos"].keys())
        except Exception as err:
            raise ValueError(f"Failed to open HDF5 file: {err}") from err

    def _load_demo_from_h5(self, idx: int) -> Demonstration:
        key = self._demo_keys[idx]
        g = self._h5["demos"][key]
        proprio = np.asarray(g["proprio"])
        actions = np.asarray(g["actions"])
        rewards = np.asarray(g["rewards"])
        metadata = json.loads(g.attrs.get("metadata_json", "{}"))
        observations = [
            Observation(proprio=proprio[i], timestep=i) for i in range(proprio.shape[0])
        ]
        return Demonstration(
            observations=observations,
            actions=list(actions),
            rewards=list(rewards),
            metadata=metadata,
        )
