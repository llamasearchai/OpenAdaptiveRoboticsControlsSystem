/**
 * Common types used across the application.
 */

/** 3D vector representation */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/** Quaternion for orientation representation (w, x, y, z) */
export interface Quaternion {
  w: number;
  x: number;
  y: number;
  z: number;
}

/** 4x4 transformation matrix (row-major) */
export type Matrix4x4 = [
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number]
];

/** SE(3) pose - position and orientation */
export interface SE3Pose {
  position: Vector3;
  quaternion: Quaternion;
  matrix?: Matrix4x4;
}

/** Range with min and max values */
export interface Range {
  min: number;
  max: number;
}

/** Workspace bounds in 3D space */
export interface WorkspaceBounds {
  lower: [number, number, number];
  upper: [number, number, number];
}

/** Joint state for a single joint */
export interface JointState {
  name: string;
  position: number;
  velocity?: number;
  effort?: number;
}

/** Timestamp in ISO 8601 format or Date object */
export type Timestamp = string | Date;

/** Unique identifier (UUID) */
export type UUID = string;

/** Status values for async operations */
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

/** Connection state for WebSocket */
export type ConnectionState =
  | 'connecting'
  | 'connected'
  | 'disconnecting'
  | 'disconnected';

/** Helper type for nullable values */
export type Nullable<T> = T | null;

/** Helper type for arrays */
export type NumericArray = number[];

/** Device type for computation */
export type DeviceType = 'cpu' | 'cuda' | 'mps';

/** File path string */
export type FilePath = string;
