/**
 * Kinematics Zod validation schemas.
 */

import { z } from 'zod';
import {
  filePathSchema,
  numericArraySchema,
  tuple3Schema,
  tuple4Schema,
  positiveNumberSchema,
  vector3Schema,
  quaternionSchema,
  se3PoseSchema,
} from './common';

/** FK request schema */
export const fkRequestSchema = z.object({
  joint_angles: numericArraySchema.min(1),
  urdf_path: filePathSchema.optional(),
  link_name: z.string().optional(),
});

/** FK response schema */
export const fkResponseSchema = z.object({
  position: tuple3Schema,
  quaternion: tuple4Schema,
  matrix: z.array(z.array(z.number())),
});

/** IK request schema */
export const ikRequestSchema = z.object({
  target_position: tuple3Schema,
  target_quaternion: tuple4Schema.optional(),
  initial_joints: numericArraySchema.optional(),
  urdf_path: filePathSchema.optional(),
  max_iterations: z.number().int().positive().optional().default(100),
  tolerance: positiveNumberSchema.optional().default(1e-6),
});

/** IK response schema */
export const ikResponseSchema = z.object({
  joint_angles: numericArraySchema,
  converged: z.boolean(),
  iterations: z.number().int().nonnegative(),
  error: z.number().nonnegative(),
});

/** Jacobian request schema */
export const jacobianRequestSchema = z.object({
  joint_angles: numericArraySchema.min(1),
  urdf_path: filePathSchema.optional(),
});

/** Jacobian response schema */
export const jacobianResponseSchema = z.object({
  jacobian: z.array(z.array(z.number())),
  condition_number: z.number().nonnegative(),
  shape: z.tuple([z.number().int(), z.number().int()]),
});

/** Joint limit schema */
export const jointLimitSchema = z.object({
  name: z.string(),
  lower: z.number(),
  upper: z.number(),
  velocity: z.number().nonnegative(),
  effort: z.number().nonnegative(),
});

/** Joint limits response schema */
export const jointLimitsResponseSchema = z.object({
  joints: z.array(jointLimitSchema),
  num_joints: z.number().int().positive(),
});

/** Joint limit check request schema */
export const jointLimitCheckRequestSchema = z.object({
  joint_angles: numericArraySchema.min(1),
  urdf_path: filePathSchema.optional(),
});

/** Joint violation schema */
export const jointViolationSchema = z.object({
  joint_index: z.number().int().nonnegative(),
  joint_name: z.string(),
  current_value: z.number(),
  limit: z.number(),
  violation_type: z.enum(['lower', 'upper']),
});

/** Joint limit check response schema */
export const jointLimitCheckResponseSchema = z.object({
  valid: z.boolean(),
  violations: z.array(jointViolationSchema),
});

/** Velocity kinematics request schema */
export const velocityKinematicsRequestSchema = z.object({
  joint_angles: numericArraySchema.min(1),
  joint_velocities: numericArraySchema.min(1),
  urdf_path: filePathSchema.optional(),
});

/** Velocity kinematics response schema */
export const velocityKinematicsResponseSchema = z.object({
  linear_velocity: vector3Schema,
  angular_velocity: vector3Schema,
  twist: z.tuple([
    z.number(),
    z.number(),
    z.number(),
    z.number(),
    z.number(),
    z.number(),
  ]),
});

/** Differential IK request schema */
export const differentialIKRequestSchema = z.object({
  joint_angles: numericArraySchema.min(1),
  cartesian_velocity: z.tuple([
    z.number(),
    z.number(),
    z.number(),
    z.number(),
    z.number(),
    z.number(),
  ]),
  urdf_path: filePathSchema.optional(),
  damping: positiveNumberSchema.optional(),
});

/** Differential IK response schema */
export const differentialIKResponseSchema = z.object({
  joint_velocities: numericArraySchema,
  singularity_metric: z.number().nonnegative(),
  is_singular: z.boolean(),
});

/** Path segment type schema */
export const pathSegmentTypeSchema = z.enum(['linear', 'arc', 'spline']);

/** Cartesian path segment schema */
export const cartesianPathSegmentSchema = z.object({
  type: pathSegmentTypeSchema,
  start: se3PoseSchema,
  end: se3PoseSchema,
  via_points: z.array(se3PoseSchema).optional(),
  duration: positiveNumberSchema.optional(),
});

/** Cartesian path request schema */
export const cartesianPathRequestSchema = z.object({
  segments: z.array(cartesianPathSegmentSchema).min(1),
  initial_joints: numericArraySchema.min(1),
  urdf_path: filePathSchema.optional(),
  max_velocity: positiveNumberSchema.optional(),
  max_acceleration: positiveNumberSchema.optional(),
  step_size: positiveNumberSchema.optional(),
});

/** Obstacle schema */
export const obstacleSchema = z.object({
  type: z.enum(['sphere', 'box', 'cylinder', 'mesh']),
  position: vector3Schema,
  orientation: quaternionSchema.optional(),
  dimensions: numericArraySchema,
  mesh_path: filePathSchema.optional(),
});

/** Collision check request schema */
export const collisionCheckRequestSchema = z.object({
  joint_angles: numericArraySchema.min(1),
  urdf_path: filePathSchema.optional(),
  obstacles: z.array(obstacleSchema).optional(),
});

// Inferred types
export type FKRequest = z.infer<typeof fkRequestSchema>;
export type FKResponse = z.infer<typeof fkResponseSchema>;
export type IKRequest = z.infer<typeof ikRequestSchema>;
export type IKResponse = z.infer<typeof ikResponseSchema>;
export type JacobianRequest = z.infer<typeof jacobianRequestSchema>;
export type JacobianResponse = z.infer<typeof jacobianResponseSchema>;
