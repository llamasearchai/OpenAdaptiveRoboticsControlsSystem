/**
 * Training-related types for RL algorithms.
 */

import type { DeviceType, Timestamp, UUID, FilePath } from './common';

/** Supported RL algorithms */
export type Algorithm = 'ppo' | 'sac' | 'td3' | 'ddpg' | 'dqn';

/** Training run status */
export type TrainingStatus =
  | 'pending'
  | 'training'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'stopped';

/** PPO algorithm configuration */
export interface PPOConfig {
  learning_rate: number;
  gamma: number;
  gae_lambda: number;
  clip_range: number;
  clip_range_vf?: number;
  entropy_coef: number;
  value_coef: number;
  max_grad_norm: number;
  n_steps: number;
  n_epochs: number;
  batch_size: number;
  normalize_advantage: boolean;
  target_kl?: number;
  use_sde?: boolean;
  sde_sample_freq?: number;
}

/** SAC algorithm configuration */
export interface SACConfig {
  learning_rate: number;
  gamma: number;
  tau: number;
  buffer_size: number;
  learning_starts: number;
  batch_size: number;
  train_freq: number;
  gradient_steps: number;
  ent_coef: 'auto' | number;
  target_update_interval: number;
  target_entropy?: 'auto' | number;
  use_sde?: boolean;
  sde_sample_freq?: number;
}

/** TD3 algorithm configuration */
export interface TD3Config {
  learning_rate: number;
  gamma: number;
  tau: number;
  buffer_size: number;
  learning_starts: number;
  batch_size: number;
  train_freq: number;
  gradient_steps: number;
  policy_delay: number;
  target_policy_noise: number;
  target_noise_clip: number;
}

/** Network architecture configuration */
export interface NetworkConfig {
  policy_layers: number[];
  value_layers: number[];
  activation: 'relu' | 'tanh' | 'elu' | 'gelu';
  ortho_init: boolean;
  log_std_init?: number;
}

/** Training configuration */
export interface TrainingConfig {
  algorithm: Algorithm;
  ppo?: PPOConfig;
  sac?: SACConfig;
  td3?: TD3Config;
  network?: NetworkConfig;
  total_timesteps?: number;
  device?: DeviceType;
  seed?: number;
  verbose?: number;
}

/** Request to start training */
export interface StartTrainingRequest {
  config: TrainingConfig;
  total_steps: number;
  checkpoint_path?: FilePath;
  log_dir?: FilePath;
  experiment_name?: string;
  tags?: string[];
}

/** Training run response */
export interface TrainingRun {
  id: UUID;
  config: Record<string, unknown>;
  status: TrainingStatus;
  current_step: number;
  total_steps: number;
  metrics_count: number;
  start_time?: Timestamp;
  end_time?: Timestamp;
  error_message?: string;
  checkpoint_path?: FilePath;
  experiment_name?: string;
  tags?: string[];
}

/** Training metrics for a single step */
export interface TrainingMetrics {
  step: number;
  policy_loss?: number;
  value_loss?: number;
  kl?: number;
  entropy?: number;
  explained_variance?: number;
  episode_reward?: number;
  episode_length?: number;
  learning_rate?: number;
  clip_fraction?: number;
  approx_kl?: number;
  loss?: number;
  actor_loss?: number;
  critic_loss?: number;
  ent_coef?: number;
  fps?: number;
  time_elapsed?: number;
  total_timesteps?: number;
  timestamp?: Timestamp;
}

/** Aggregated training statistics */
export interface TrainingStats {
  total_episodes: number;
  total_timesteps: number;
  mean_reward: number;
  std_reward: number;
  min_reward: number;
  max_reward: number;
  mean_episode_length: number;
  success_rate?: number;
  training_time_seconds: number;
}

/** Checkpoint information */
export interface Checkpoint {
  id: UUID;
  run_id: UUID;
  step: number;
  path: FilePath;
  size_bytes: number;
  created_at: Timestamp;
  metrics?: TrainingMetrics;
}

/** Evaluation result */
export interface EvaluationResult {
  n_episodes: number;
  mean_reward: number;
  std_reward: number;
  mean_length: number;
  std_length: number;
  success_rate?: number;
  episodes: EpisodeSummary[];
}

/** Episode summary */
export interface EpisodeSummary {
  episode_id: number;
  reward: number;
  length: number;
  success?: boolean;
  info?: Record<string, unknown>;
}

/** Hyperparameter search configuration */
export interface HyperparameterSearchConfig {
  algorithm: Algorithm;
  n_trials: number;
  n_jobs: number;
  study_name: string;
  search_space: Record<string, SearchSpace>;
  pruner?: 'median' | 'hyperband' | 'none';
  sampler?: 'tpe' | 'random' | 'grid';
}

/** Search space definition */
export interface SearchSpace {
  type: 'float' | 'int' | 'categorical';
  low?: number;
  high?: number;
  log?: boolean;
  choices?: (string | number | boolean)[];
}

/** Trial result */
export interface TrialResult {
  trial_id: number;
  params: Record<string, unknown>;
  value: number;
  state: 'complete' | 'pruned' | 'fail';
  datetime_start: Timestamp;
  datetime_complete?: Timestamp;
}

/** Learning curve data point */
export interface LearningCurvePoint {
  timestep: number;
  mean_reward: number;
  std_reward?: number;
  min_reward?: number;
  max_reward?: number;
}

/** Callback configuration */
export interface CallbackConfig {
  eval_freq?: number;
  n_eval_episodes?: number;
  log_freq?: number;
  save_freq?: number;
  early_stopping?: EarlyStoppingConfig;
}

/** Early stopping configuration */
export interface EarlyStoppingConfig {
  reward_threshold: number;
  n_eval_episodes: number;
  patience?: number;
  min_improvement?: number;
}

/** Wandb/MLflow logging config */
export interface ExperimentLoggerConfig {
  provider: 'wandb' | 'mlflow' | 'tensorboard';
  project?: string;
  entity?: string;
  run_name?: string;
  tags?: string[];
  config?: Record<string, unknown>;
}
