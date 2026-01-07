from __future__ import annotations

import hashlib
import json
import os
from typing import Any, Dict

from arcs.utils.logging import log_event, new_correlation_id

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
    from pydantic import BaseModel, Field
    _PYDANTIC_V2 = True
except Exception:
    from pydantic import BaseModel, BaseSettings, Field

    SettingsConfigDict = None
    _PYDANTIC_V2 = False

try:
    import yaml
except Exception:
    yaml = None


class PPOConfig(BaseModel):
    lr: float = 3e-4
    clip_ratio: float = 0.2
    gamma: float = 0.99
    gae_lambda: float = 0.95
    entropy_coef: float = 0.01
    vf_coef: float = 0.5
    update_epochs: int = 10
    batch_size: int = 64


class SACConfig(BaseModel):
    lr: float = 3e-4
    gamma: float = 0.99
    tau: float = 0.005
    alpha: float = 0.2


class EnvConfig(BaseModel):
    task: str = "Reach"
    backend: str = "dummy"
    num_envs: int = 1
    device: str = "cpu"


class ModelConfig(BaseModel):
    default_model: str = "gpt-5.2"
    fallback_chain: str = "gpt-5.2,gpt-4o,gpt-4o-mini"
    api_timeout_sec: int = 30
    api_max_retries: int = 3
    api_backoff_base_sec: float = 1.0


if _PYDANTIC_V2:

    class _TrainingConfigBase(BaseSettings):
        model_config = SettingsConfigDict(
            env_prefix="ARCS_", env_nested_delimiter="_", extra="ignore"
        )

        ppo: PPOConfig = Field(default_factory=PPOConfig)
        sac: SACConfig = Field(default_factory=SACConfig)
        env: EnvConfig = Field(default_factory=EnvConfig)
        model: ModelConfig = Field(default_factory=ModelConfig)
        version: str = "1"

else:

    class _TrainingConfigBase(BaseSettings):
        class Config:
            env_prefix = "ARCS_"
            env_nested_delimiter = "_"
            extra = "ignore"

        ppo: PPOConfig = Field(default_factory=PPOConfig)
        sac: SACConfig = Field(default_factory=SACConfig)
        env: EnvConfig = Field(default_factory=EnvConfig)
        model: ModelConfig = Field(default_factory=ModelConfig)
        version: str = "1"

    _TrainingConfigBase.__name__ = "_TrainingConfigBase"


def _model_dump(obj: BaseModel) -> Dict[str, Any]:
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    return obj.dict()


class ConfigIO:
    @staticmethod
    def load(path: str) -> TrainingConfig:
        if not os.path.exists(path):
            raise FileNotFoundError(path)
        if path.endswith((".yaml", ".yml")):
            if yaml is None:
                raise ImportError("pyyaml required for YAML support")
            with open(path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f) or {}
        elif path.endswith(".json"):
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f) or {}
        else:
            raise ValueError("Config must be .yaml, .yml, or .json")

        env_overrides = _env_to_dict(prefix="ARCS_")
        merged = _deep_merge(data, env_overrides)
        cfg = TrainingConfig(**merged)
        cfg.validate()
        log_event(
            "config.loaded",
            cfg.correlation_id,
            config_hash=cfg.hash(),
        )
        return cfg

    @staticmethod
    def save(config: TrainingConfig, path: str) -> None:
        data = config.to_dict(redact=False)
        if path.endswith((".yaml", ".yml")):
            if yaml is None:
                raise ImportError("pyyaml required for YAML support")
            with open(path, "w", encoding="utf-8") as f:
                yaml.safe_dump(data, f, sort_keys=False)
        elif path.endswith(".json"):
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        else:
            raise ValueError("Config must be .yaml, .yml, or .json")


def _env_to_dict(prefix: str) -> Dict[str, Any]:
    data: Dict[str, Any] = {}
    for key, value in os.environ.items():
        if not key.startswith(prefix):
            continue
        parts = key[len(prefix) :].lower().split("_")
        current = data
        for part in parts[:-1]:
            current = current.setdefault(part, {})
        current[parts[-1]] = _parse_env_value(value)
    return data


def _parse_env_value(value: str) -> Any:
    for cast in (int, float):
        try:
            return cast(value)
        except ValueError:
            continue
    if value.lower() in ("true", "false"):
        return value.lower() == "true"
    return value


def _deep_merge(base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
    result = dict(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = _deep_merge(result[key], value)
        else:
            result[key] = value
    return result


def _redact(data: Dict[str, Any]) -> Dict[str, Any]:
    redacted = {}
    for key, value in data.items():
        if isinstance(value, dict):
            redacted[key] = _redact(value)
        elif any(token in key.lower() for token in ("key", "token", "secret")):
            redacted[key] = "***"
        else:
            redacted[key] = value
    return redacted


class TrainingConfig(_TrainingConfigBase):
    def __init__(self, **data: Any):
        super().__init__(**data)
        self.correlation_id = new_correlation_id()

    def validate(self) -> None:
        if not (0.0 < self.ppo.clip_ratio < 1.0):
            raise ValueError("ppo.clip_ratio must be in (0, 1)")
        if not (0.0 < self.ppo.gamma <= 1.0):
            raise ValueError("ppo.gamma must be in (0, 1]")
        if not (0.0 <= self.ppo.gae_lambda <= 1.0):
            raise ValueError("ppo.gae_lambda must be in [0, 1]")
        log_event(
            "config.validated",
            self.correlation_id,
            config_hash=self.hash(),
        )

    def to_dict(self, redact: bool = True) -> Dict[str, Any]:
        data = _model_dump(self)
        return _redact(data) if redact else data

    def hash(self) -> str:
        payload = json.dumps(self.to_dict(redact=False), sort_keys=True).encode("utf-8")
        return hashlib.sha256(payload).hexdigest()
