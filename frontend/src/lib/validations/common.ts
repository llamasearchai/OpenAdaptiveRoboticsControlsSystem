/**
 * Common Zod validation schemas.
 */

import { z } from 'zod';

/** UUID string schema */
export const uuidSchema = z.string().uuid();

/** Timestamp schema (ISO 8601 or Date) */
export const timestampSchema = z.union([z.string().datetime(), z.date()]);

/** File path schema */
export const filePathSchema = z.string().min(1);

/** Device type schema */
export const deviceTypeSchema = z.enum(['cpu', 'cuda', 'mps']);

/** 3D vector schema */
export const vector3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

/** Quaternion schema (w, x, y, z) */
export const quaternionSchema = z.object({
  w: z.number(),
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

/** Tuple3 schema for [x, y, z] */
export const tuple3Schema = z.tuple([z.number(), z.number(), z.number()]);

/** Tuple4 schema for quaternion [w, x, y, z] */
export const tuple4Schema = z.tuple([
  z.number(),
  z.number(),
  z.number(),
  z.number(),
]);

/** 4x4 matrix schema */
export const matrix4x4Schema = z.tuple([
  z.tuple([z.number(), z.number(), z.number(), z.number()]),
  z.tuple([z.number(), z.number(), z.number(), z.number()]),
  z.tuple([z.number(), z.number(), z.number(), z.number()]),
  z.tuple([z.number(), z.number(), z.number(), z.number()]),
]);

/** SE(3) pose schema */
export const se3PoseSchema = z.object({
  position: vector3Schema,
  quaternion: quaternionSchema,
  matrix: matrix4x4Schema.optional(),
});

/** Range schema */
export const rangeSchema = z.object({
  min: z.number(),
  max: z.number(),
});

/** Workspace bounds schema */
export const workspaceBoundsSchema = z.object({
  lower: tuple3Schema,
  upper: tuple3Schema,
});

/** Numeric array schema (with optional length validation) */
export const numericArraySchema = z.array(z.number());

/** Create a fixed-length numeric array schema */
export function createFixedLengthArraySchema(length: number) {
  return z.array(z.number()).length(length);
}

/** Joint array schema for 7-DOF robot */
export const joint7ArraySchema = createFixedLengthArraySchema(7);

/** Joint array schema (flexible length) */
export const jointArraySchema = numericArraySchema.min(1);

/** Positive number schema */
export const positiveNumberSchema = z.number().positive();

/** Non-negative number schema */
export const nonNegativeNumberSchema = z.number().nonnegative();

/** Percentage schema (0-100) */
export const percentageSchema = z.number().min(0).max(100);

/** Ratio schema (0-1) */
export const ratioSchema = z.number().min(0).max(1);

/** Connection state schema */
export const connectionStateSchema = z.enum([
  'connecting',
  'connected',
  'disconnecting',
  'disconnected',
]);

/** Async status schema */
export const asyncStatusSchema = z.enum(['idle', 'loading', 'success', 'error']);

// Inferred types
export type Vector3 = z.infer<typeof vector3Schema>;
export type Quaternion = z.infer<typeof quaternionSchema>;
export type Tuple3 = z.infer<typeof tuple3Schema>;
export type Tuple4 = z.infer<typeof tuple4Schema>;
export type Matrix4x4 = z.infer<typeof matrix4x4Schema>;
export type SE3Pose = z.infer<typeof se3PoseSchema>;
export type WorkspaceBounds = z.infer<typeof workspaceBoundsSchema>;
