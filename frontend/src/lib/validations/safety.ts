/**
 * Safety Zod validation schemas.
 */

import { z } from 'zod';
import {
  numericArraySchema,
  tuple3Schema,
  workspaceBoundsSchema,
  positiveNumberSchema,
} from './common';

/** Safety joint limits schema */
export const safetyJointLimitsSchema = z.object({
  pos_min: numericArraySchema.min(1),
  pos_max: numericArraySchema.min(1),
  vel_max: numericArraySchema.min(1),
  torque_max: numericArraySchema.min(1),
  acc_max: numericArraySchema.optional(),
});

/** Safety config schema */
export const safetyConfigSchema = z.object({
  joint_limits: safetyJointLimitsSchema,
  workspace_bounds: workspaceBoundsSchema.optional(),
  dt: positiveNumberSchema.default(0.001),
  use_qp: z.boolean().default(false),
  solver_timeout: positiveNumberSchema.optional().default(0.001),
  velocity_scaling: positiveNumberSchema.max(1).optional().default(1.0),
  acceleration_scaling: positiveNumberSchema.max(1).optional().default(1.0),
});

/** Safety filter request schema */
export const safetyFilterRequestSchema = z.object({
  action: numericArraySchema.min(1),
  joint_pos: numericArraySchema.min(1),
  joint_vel: numericArraySchema.optional(),
  ee_pos: tuple3Schema.optional(),
});

/** Safety violation type schema */
export const safetyViolationTypeSchema = z.enum([
  'position_limit',
  'velocity_limit',
  'torque_limit',
  'acceleration_limit',
  'workspace_bound',
  'collision',
  'singularity',
]);

/** Safety violation schema */
export const safetyViolationSchema = z.object({
  type: safetyViolationTypeSchema,
  joint_index: z.number().int().nonnegative().optional(),
  value: z.number(),
  limit: z.number(),
  timestamp: z.number(),
});

/** Safety event type schema */
export const safetyEventTypeSchema = z.enum([
  'filter_activated',
  'limit_reached',
  'emergency_stop',
  'protective_stop',
  'violation_cleared',
  'config_changed',
]);

/** Safety event severity schema */
export const safetyEventSeveritySchema = z.enum([
  'info',
  'warning',
  'error',
  'critical',
]);

/** Safety event schema */
export const safetyEventSchema = z.object({
  id: z.string(),
  type: safetyEventTypeSchema,
  severity: safetyEventSeveritySchema,
  message: z.string(),
  violations: z.array(safetyViolationSchema).optional(),
  timestamp: z.string(),
  action_taken: z.string().optional(),
});

/** Collision config schema */
export const collisionConfigSchema = z.object({
  enabled: z.boolean().default(true),
  self_collision: z.boolean().default(true),
  environment_collision: z.boolean().default(true),
  min_distance: positiveNumberSchema.default(0.01),
  check_frequency: positiveNumberSchema.default(100),
});

/** Force/torque limits schema */
export const forceTorqueLimitsSchema = z.object({
  force_max: z.tuple([z.number(), z.number(), z.number()]),
  torque_max: z.tuple([z.number(), z.number(), z.number()]),
  force_threshold_stop: positiveNumberSchema,
  torque_threshold_stop: positiveNumberSchema,
});

/** Power and force limiting config schema */
export const powerForceLimitingConfigSchema = z.object({
  enabled: z.boolean().default(false),
  max_power: positiveNumberSchema,
  max_momentum: positiveNumberSchema,
  max_force: positiveNumberSchema,
  reduced_speed: positiveNumberSchema,
  reduced_force: positiveNumberSchema,
});

/** Safety zone geometry schema */
export const safetyZoneGeometrySchema = z.object({
  type: z.enum(['box', 'sphere', 'cylinder', 'plane']),
  center: tuple3Schema,
  dimensions: numericArraySchema,
  orientation: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
});

/** Safety zone schema */
export const safetyZoneSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(50),
  type: z.enum(['warning', 'reduced_speed', 'stop']),
  geometry: safetyZoneGeometrySchema,
  active: z.boolean().default(true),
  speed_reduction: positiveNumberSchema.max(1).optional(),
});

/** Speed and separation monitoring config schema */
export const speedSeparationConfigSchema = z.object({
  enabled: z.boolean().default(false),
  min_separation_distance: positiveNumberSchema.default(0.5),
  max_speed_at_min_distance: positiveNumberSchema.default(0.25),
  speed_scaling_factor: positiveNumberSchema.default(1.0),
  human_detection_enabled: z.boolean().default(false),
});

/** Compliant motion config schema */
export const compliantMotionConfigSchema = z.object({
  enabled: z.boolean().default(false),
  stiffness: numericArraySchema,
  damping: numericArraySchema,
  force_limit: numericArraySchema,
  null_space_stiffness: numericArraySchema.optional(),
});

/** Safety interlock schema */
export const safetyInterlockSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(50),
  type: z.enum(['door', 'light_curtain', 'scanner', 'mat', 'custom']),
  state: z.enum(['triggered', 'clear', 'bypassed', 'fault']),
  can_bypass: z.boolean().default(false),
  bypass_password_required: z.boolean().default(true),
});

// Inferred types
export type SafetyJointLimits = z.infer<typeof safetyJointLimitsSchema>;
export type SafetyConfig = z.infer<typeof safetyConfigSchema>;
export type SafetyFilterRequest = z.infer<typeof safetyFilterRequestSchema>;
export type SafetyViolation = z.infer<typeof safetyViolationSchema>;
export type SafetyEvent = z.infer<typeof safetyEventSchema>;
export type SafetyZone = z.infer<typeof safetyZoneSchema>;
