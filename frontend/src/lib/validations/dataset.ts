/**
 * Dataset Zod validation schemas.
 */

import { z } from 'zod';
import { filePathSchema, positiveNumberSchema, ratioSchema } from './common';

/** Dataset format schema */
export const datasetFormatSchema = z.enum(['hdf5', 'zarr', 'pickle', 'npz']);

/** Filter options schema */
export const filterOptionsSchema = z.object({
  success_filter: z.boolean().optional(),
  smoothness_filter: positiveNumberSchema.optional(),
  trim_idle: z.boolean().default(false),
  velocity_threshold: positiveNumberSchema.optional().default(0.01),
  min_length: z.number().int().positive().optional(),
  max_length: z.number().int().positive().optional(),
  reward_threshold: z.number().optional(),
});

/** Augmentation options schema */
export const augmentationOptionsSchema = z.object({
  pose_noise_std: positiveNumberSchema.default(0.01),
  action_noise_std: positiveNumberSchema.optional(),
  factor: z.number().int().positive().default(1),
  temporal_shift: z.boolean().optional().default(false),
  crop_length: z.number().int().positive().optional(),
});

/** Process dataset request schema */
export const processDatasetRequestSchema = z.object({
  filter_options: filterOptionsSchema,
  augmentation_options: augmentationOptionsSchema.optional(),
  output_path: filePathSchema.optional(),
  normalize: z.boolean().optional().default(true),
  shuffle: z.boolean().optional().default(true),
});

/** Dataset config schema */
export const datasetConfigSchema = z.object({
  name: z.string().min(1).max(100),
  output_path: filePathSchema,
  format: datasetFormatSchema.default('hdf5'),
  save_images: z.boolean().optional().default(false),
  image_format: z.enum(['png', 'jpeg', 'webp']).optional().default('jpeg'),
  compression: z.enum(['none', 'gzip', 'lz4']).optional().default('gzip'),
  chunk_size: z.number().int().positive().optional(),
  max_episodes: z.number().int().positive().optional(),
  auto_save: z.boolean().optional().default(true),
  save_frequency: z.number().int().positive().optional().default(10),
});

/** Recording command schema */
export const recordingCommandSchema = z.object({
  action: z.enum(['start', 'pause', 'resume', 'stop', 'discard_episode']),
  save_episode: z.boolean().optional(),
  episode_metadata: z.object({
    demonstrator_id: z.string().optional(),
    robot_id: z.string().optional(),
    task: z.string().optional(),
    notes: z.string().optional(),
    quality_score: z.number().min(0).max(10).optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
});

/** Dataset split config schema */
export const datasetSplitConfigSchema = z.object({
  train_ratio: ratioSchema.default(0.7),
  val_ratio: ratioSchema.default(0.15),
  test_ratio: ratioSchema.default(0.15),
  shuffle: z.boolean().default(true),
  seed: z.number().int().optional(),
  stratify_by_success: z.boolean().optional().default(false),
}).refine(
  (data) => Math.abs(data.train_ratio + data.val_ratio + data.test_ratio - 1) < 0.001,
  { message: 'Ratios must sum to 1' }
);

/** Data loader config schema */
export const dataLoaderConfigSchema = z.object({
  batch_size: z.number().int().positive().default(64),
  shuffle: z.boolean().default(true),
  num_workers: z.number().int().nonnegative().default(4),
  pin_memory: z.boolean().default(true),
  drop_last: z.boolean().default(false),
  prefetch_factor: z.number().int().positive().optional(),
});

/** Dataset merge request schema */
export const datasetMergeRequestSchema = z.object({
  dataset_ids: z.array(z.string().uuid()).min(2),
  output_name: z.string().min(1).max(100),
  output_path: filePathSchema,
  remove_duplicates: z.boolean().optional().default(false),
  balance_success: z.boolean().optional().default(false),
});

/** Dataset export request schema */
export const datasetExportRequestSchema = z.object({
  dataset_id: z.string().uuid(),
  format: datasetFormatSchema,
  output_path: filePathSchema,
  include_images: z.boolean().optional().default(true),
  compress: z.boolean().optional().default(true),
});

/** Dataset import request schema */
export const datasetImportRequestSchema = z.object({
  source_path: filePathSchema,
  source_format: datasetFormatSchema,
  dataset_name: z.string().min(1).max(100),
  validate: z.boolean().optional().default(true),
});

// Inferred types
export type FilterOptions = z.infer<typeof filterOptionsSchema>;
export type AugmentationOptions = z.infer<typeof augmentationOptionsSchema>;
export type ProcessDatasetRequest = z.infer<typeof processDatasetRequestSchema>;
export type DatasetConfig = z.infer<typeof datasetConfigSchema>;
export type RecordingCommand = z.infer<typeof recordingCommandSchema>;
export type DatasetSplitConfig = z.infer<typeof datasetSplitConfigSchema>;
