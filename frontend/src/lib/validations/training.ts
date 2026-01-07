/**
 * Training Zod validation schemas.
 */

import { z } from 'zod';
import { deviceTypeSchema, filePathSchema, positiveNumberSchema, ratioSchema } from './common';

/** Algorithm schema */
export const algorithmSchema = z.enum(['ppo', 'sac', 'td3', 'ddpg', 'dqn']);

/** Training status schema */
export const trainingStatusSchema = z.enum([
  'pending',
  'training',
  'paused',
  'completed',
  'failed',
  'stopped',
]);

/** PPO config schema */
export const ppoConfigSchema = z.object({
  learning_rate: positiveNumberSchema.default(3e-4),
  gamma: ratioSchema.default(0.99),
  gae_lambda: ratioSchema.default(0.95),
  clip_range: positiveNumberSchema.max(1).default(0.2),
  clip_range_vf: positiveNumberSchema.max(1).optional(),
  entropy_coef: z.number().nonnegative().default(0.01),
  value_coef: positiveNumberSchema.default(0.5),
  max_grad_norm: positiveNumberSchema.default(0.5),
  n_steps: z.number().int().positive().default(2048),
  n_epochs: z.number().int().positive().default(10),
  batch_size: z.number().int().positive().default(64),
  normalize_advantage: z.boolean().default(true),
  target_kl: positiveNumberSchema.optional(),
  use_sde: z.boolean().optional().default(false),
  sde_sample_freq: z.number().int().positive().optional(),
});

/** SAC config schema */
export const sacConfigSchema = z.object({
  learning_rate: positiveNumberSchema.default(3e-4),
  gamma: ratioSchema.default(0.99),
  tau: positiveNumberSchema.max(1).default(0.005),
  buffer_size: z.number().int().positive().default(1000000),
  learning_starts: z.number().int().nonnegative().default(100),
  batch_size: z.number().int().positive().default(256),
  train_freq: z.number().int().positive().default(1),
  gradient_steps: z.number().int().positive().default(1),
  ent_coef: z.union([z.literal('auto'), z.number()]).default('auto'),
  target_update_interval: z.number().int().positive().default(1),
  target_entropy: z.union([z.literal('auto'), z.number()]).optional(),
  use_sde: z.boolean().optional().default(false),
  sde_sample_freq: z.number().int().positive().optional(),
});

/** TD3 config schema */
export const td3ConfigSchema = z.object({
  learning_rate: positiveNumberSchema.default(3e-4),
  gamma: ratioSchema.default(0.99),
  tau: positiveNumberSchema.max(1).default(0.005),
  buffer_size: z.number().int().positive().default(1000000),
  learning_starts: z.number().int().nonnegative().default(100),
  batch_size: z.number().int().positive().default(256),
  train_freq: z.number().int().positive().default(1),
  gradient_steps: z.number().int().positive().default(1),
  policy_delay: z.number().int().positive().default(2),
  target_policy_noise: positiveNumberSchema.default(0.2),
  target_noise_clip: positiveNumberSchema.default(0.5),
});

/** Network config schema */
export const networkConfigSchema = z.object({
  policy_layers: z.array(z.number().int().positive()).default([256, 256]),
  value_layers: z.array(z.number().int().positive()).default([256, 256]),
  activation: z.enum(['relu', 'tanh', 'elu', 'gelu']).default('relu'),
  ortho_init: z.boolean().default(true),
  log_std_init: z.number().optional(),
});

/** Training config schema */
export const trainingConfigSchema = z.object({
  algorithm: algorithmSchema,
  ppo: ppoConfigSchema.optional(),
  sac: sacConfigSchema.optional(),
  td3: td3ConfigSchema.optional(),
  network: networkConfigSchema.optional(),
  total_timesteps: z.number().int().positive().optional(),
  device: deviceTypeSchema.optional(),
  seed: z.number().int().optional(),
  verbose: z.number().int().min(0).max(2).optional(),
});

/** Start training request schema */
export const startTrainingRequestSchema = z.object({
  config: trainingConfigSchema,
  total_steps: z.number().int().positive(),
  checkpoint_path: filePathSchema.optional(),
  log_dir: filePathSchema.optional(),
  experiment_name: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
});

/** Training metrics schema */
export const trainingMetricsSchema = z.object({
  step: z.number().int().nonnegative(),
  policy_loss: z.number().optional(),
  value_loss: z.number().optional(),
  kl: z.number().optional(),
  entropy: z.number().optional(),
  explained_variance: z.number().optional(),
  episode_reward: z.number().optional(),
  episode_length: z.number().optional(),
  learning_rate: z.number().optional(),
  clip_fraction: z.number().optional(),
  approx_kl: z.number().optional(),
  loss: z.number().optional(),
  actor_loss: z.number().optional(),
  critic_loss: z.number().optional(),
  ent_coef: z.number().optional(),
  fps: z.number().optional(),
  time_elapsed: z.number().optional(),
  total_timesteps: z.number().optional(),
  timestamp: z.string().optional(),
});

/** Callback config schema */
export const callbackConfigSchema = z.object({
  eval_freq: z.number().int().positive().optional(),
  n_eval_episodes: z.number().int().positive().optional(),
  log_freq: z.number().int().positive().optional(),
  save_freq: z.number().int().positive().optional(),
  early_stopping: z.object({
    reward_threshold: z.number(),
    n_eval_episodes: z.number().int().positive(),
    patience: z.number().int().positive().optional(),
    min_improvement: positiveNumberSchema.optional(),
  }).optional(),
});

// Inferred types
export type PPOConfig = z.infer<typeof ppoConfigSchema>;
export type SACConfig = z.infer<typeof sacConfigSchema>;
export type TD3Config = z.infer<typeof td3ConfigSchema>;
export type TrainingConfig = z.infer<typeof trainingConfigSchema>;
export type StartTrainingRequest = z.infer<typeof startTrainingRequestSchema>;
export type TrainingMetrics = z.infer<typeof trainingMetricsSchema>;
