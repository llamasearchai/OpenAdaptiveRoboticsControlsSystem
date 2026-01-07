/**
 * Dataset-related types for imitation learning.
 */

import type { NumericArray, Timestamp, UUID, FilePath } from './common';
import type { Observation, StepInfo } from './simulation';

/** Dataset format */
export type DatasetFormat = 'hdf5' | 'zarr' | 'pickle' | 'npz';

/** Dataset summary */
export interface DatasetSummary {
  id: UUID;
  name: string;
  path: FilePath;
  num_demonstrations: number;
  total_transitions: number;
  success_rate: number;
  created_at?: Timestamp;
  updated_at?: Timestamp;
  format?: DatasetFormat;
  size_bytes?: number;
  tags?: string[];
}

/** Dataset list response */
export interface DatasetListResponse {
  datasets: DatasetSummary[];
  total: number;
}

/** Dataset statistics */
export interface DatasetStatistics {
  obs_mean: NumericArray;
  obs_std: NumericArray;
  act_mean: NumericArray;
  act_std: NumericArray;
  obs_min?: NumericArray;
  obs_max?: NumericArray;
  act_min?: NumericArray;
  act_max?: NumericArray;
  reward_mean?: number;
  reward_std?: number;
  episode_length_mean?: number;
  episode_length_std?: number;
}

/** Single demonstration */
export interface Demonstration {
  id: UUID;
  observations: Observation[];
  actions: NumericArray[];
  rewards: NumericArray;
  terminals: boolean[];
  truncateds?: boolean[];
  infos?: StepInfo[];
  success: boolean;
  length: number;
  total_reward: number;
  metadata?: DemonstrationMetadata;
}

/** Demonstration metadata */
export interface DemonstrationMetadata {
  demonstrator_id?: string;
  robot_id?: string;
  task?: string;
  timestamp?: Timestamp;
  duration_seconds?: number;
  notes?: string;
  quality_score?: number;
  tags?: string[];
}

/** Demonstration response */
export interface DemonstrationResponse {
  demonstration: Demonstration;
  dataset_id: UUID;
  index: number;
}

/** Filter options for dataset processing */
export interface FilterOptions {
  success_filter?: boolean;
  smoothness_filter?: number;
  trim_idle: boolean;
  velocity_threshold?: number;
  min_length?: number;
  max_length?: number;
  reward_threshold?: number;
}

/** Augmentation options */
export interface AugmentationOptions {
  pose_noise_std: number;
  action_noise_std?: number;
  factor: number;
  temporal_shift?: boolean;
  crop_length?: number;
}

/** Process dataset request */
export interface ProcessDatasetRequest {
  filter_options: FilterOptions;
  augmentation_options?: AugmentationOptions;
  output_path?: FilePath;
  normalize?: boolean;
  shuffle?: boolean;
}

/** Dataset configuration for recording */
export interface DatasetConfig {
  name: string;
  output_path: FilePath;
  format: DatasetFormat;
  save_images?: boolean;
  image_format?: 'png' | 'jpeg' | 'webp';
  compression?: 'none' | 'gzip' | 'lz4';
  chunk_size?: number;
  max_episodes?: number;
  auto_save?: boolean;
  save_frequency?: number;
}

/** Recording session */
export interface RecordingSession {
  id: UUID;
  dataset_id: UUID;
  status: 'idle' | 'recording' | 'paused' | 'stopped';
  current_episode: number;
  current_step: number;
  start_time?: Timestamp;
  config: DatasetConfig;
}

/** Recording control command */
export interface RecordingCommand {
  action: 'start' | 'pause' | 'resume' | 'stop' | 'discard_episode';
  save_episode?: boolean;
  episode_metadata?: DemonstrationMetadata;
}

/** Transition for replay buffer */
export interface Transition {
  observation: NumericArray;
  action: NumericArray;
  reward: number;
  next_observation: NumericArray;
  done: boolean;
  truncated?: boolean;
  info?: Record<string, unknown>;
}

/** Batch of transitions */
export interface TransitionBatch {
  observations: NumericArray[]; // [batch, obs_dim]
  actions: NumericArray[]; // [batch, act_dim]
  rewards: NumericArray; // [batch]
  next_observations: NumericArray[]; // [batch, obs_dim]
  dones: boolean[]; // [batch]
  truncateds?: boolean[]; // [batch]
}

/** Replay buffer info */
export interface ReplayBufferInfo {
  capacity: number;
  size: number;
  position: number;
  observation_shape: number[];
  action_shape: number[];
  device: string;
}

/** Dataset split configuration */
export interface DatasetSplitConfig {
  train_ratio: number;
  val_ratio: number;
  test_ratio: number;
  shuffle: boolean;
  seed?: number;
  stratify_by_success?: boolean;
}

/** Dataset split result */
export interface DatasetSplitResult {
  train_indices: number[];
  val_indices: number[];
  test_indices: number[];
  train_size: number;
  val_size: number;
  test_size: number;
}

/** Data loader configuration */
export interface DataLoaderConfig {
  batch_size: number;
  shuffle: boolean;
  num_workers: number;
  pin_memory: boolean;
  drop_last: boolean;
  prefetch_factor?: number;
}

/** Dataset merge request */
export interface DatasetMergeRequest {
  dataset_ids: UUID[];
  output_name: string;
  output_path: FilePath;
  remove_duplicates?: boolean;
  balance_success?: boolean;
}

/** Dataset export request */
export interface DatasetExportRequest {
  dataset_id: UUID;
  format: DatasetFormat;
  output_path: FilePath;
  include_images?: boolean;
  compress?: boolean;
}

/** Dataset import request */
export interface DatasetImportRequest {
  source_path: FilePath;
  source_format: DatasetFormat;
  dataset_name: string;
  validate?: boolean;
}

/** Validation result */
export interface DatasetValidationResult {
  valid: boolean;
  num_episodes: number;
  num_transitions: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/** Validation error */
export interface ValidationError {
  episode_index?: number;
  step_index?: number;
  field: string;
  message: string;
}

/** Validation warning */
export interface ValidationWarning {
  episode_index?: number;
  message: string;
  suggestion?: string;
}
