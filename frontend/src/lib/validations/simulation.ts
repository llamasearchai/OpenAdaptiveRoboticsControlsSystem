/**
 * Simulation Zod validation schemas.
 */

import { z } from 'zod';
import { deviceTypeSchema, numericArraySchema, tuple3Schema, tuple4Schema } from './common';

/** Simulation backend schema */
export const simulationBackendSchema = z.enum(['mujoco', 'isaac', 'pybullet', 'dummy']);

/** Simulation task schema */
export const simulationTaskSchema = z.enum([
  'reach',
  'push',
  'pick_and_place',
  'insert',
  'custom',
]);

/** Simulation status schema */
export const simulationStatusSchema = z.enum([
  'created',
  'running',
  'paused',
  'completed',
  'failed',
]);

/** Simulation config schema */
export const simulationConfigSchema = z.object({
  task: simulationTaskSchema,
  backend: simulationBackendSchema.optional().default('mujoco'),
  num_envs: z.number().int().positive().optional().default(1),
  device: deviceTypeSchema.optional().default('cpu'),
  seed: z.number().int().optional(),
  render: z.boolean().optional().default(false),
  max_episode_steps: z.number().int().positive().optional(),
});

/** Step request schema */
export const stepRequestSchema = z.object({
  action: numericArraySchema.min(1),
  render: z.boolean().optional(),
});

/** Reset request schema */
export const resetRequestSchema = z.object({
  seed: z.number().int().optional(),
  options: z.record(z.unknown()).optional(),
});

/** Observation schema */
export const observationSchema = z.object({
  joint_pos: numericArraySchema,
  joint_vel: numericArraySchema,
  ee_pos: tuple3Schema,
  ee_quat: tuple4Schema,
  goal_pos: tuple3Schema.optional(),
  object_pos: tuple3Schema.optional(),
  object_quat: tuple4Schema.optional(),
  gripper_state: z.number().optional(),
  force_torque: numericArraySchema.optional(),
  rgb: z.string().optional(),
  depth: z.string().optional(),
});

/** Simulation state schema */
export const simulationStateSchema = z.object({
  time: z.number(),
  qpos: numericArraySchema,
  qvel: numericArraySchema,
  qacc: numericArraySchema.optional(),
  ctrl: numericArraySchema.optional(),
  xpos: z.record(tuple3Schema).optional(),
  xquat: z.record(tuple4Schema).optional(),
  contact_forces: numericArraySchema.optional(),
  sensor_data: z.record(z.union([z.number(), numericArraySchema])).optional(),
});

/** Step info schema */
export const stepInfoSchema = z.object({
  success: z.boolean().optional(),
  is_success: z.boolean().optional(),
  timeout: z.boolean().optional(),
  collision: z.boolean().optional(),
  distance_to_goal: z.number().optional(),
  episode_length: z.number().optional(),
  episode_reward: z.number().optional(),
}).passthrough();

/** Step response schema */
export const stepResponseSchema = z.object({
  observation: observationSchema,
  reward: z.number(),
  terminated: z.boolean(),
  truncated: z.boolean(),
  info: stepInfoSchema,
});

/** Render config schema */
export const renderConfigSchema = z.object({
  width: z.number().int().positive().optional().default(640),
  height: z.number().int().positive().optional().default(480),
  camera_id: z.union([z.number().int(), z.string()]).optional(),
  mode: z.enum(['rgb', 'depth', 'segmentation']).optional().default('rgb'),
});

/** Batch step request schema */
export const batchStepRequestSchema = z.object({
  actions: z.array(numericArraySchema),
});

// Inferred types
export type SimulationConfig = z.infer<typeof simulationConfigSchema>;
export type StepRequest = z.infer<typeof stepRequestSchema>;
export type ResetRequest = z.infer<typeof resetRequestSchema>;
export type Observation = z.infer<typeof observationSchema>;
export type SimulationState = z.infer<typeof simulationStateSchema>;
export type StepInfo = z.infer<typeof stepInfoSchema>;
export type StepResponse = z.infer<typeof stepResponseSchema>;
