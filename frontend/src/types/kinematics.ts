/**
 * Kinematics-related types for robot control.
 */

import type {
  Vector3,
  Quaternion,
  Matrix4x4,
  SE3Pose,
  NumericArray,
  FilePath,
} from './common';

/** Forward kinematics request */
export interface FKRequest {
  joint_angles: NumericArray;
  urdf_path?: FilePath;
  link_name?: string;
}

/** Forward kinematics response */
export interface FKResponse {
  position: [number, number, number];
  quaternion: [number, number, number, number];
  matrix: Matrix4x4;
}

/** Inverse kinematics request */
export interface IKRequest {
  target_position: [number, number, number];
  target_quaternion?: [number, number, number, number];
  initial_joints?: NumericArray;
  urdf_path?: FilePath;
  max_iterations?: number;
  tolerance?: number;
}

/** Inverse kinematics response */
export interface IKResponse {
  joint_angles: NumericArray;
  converged: boolean;
  iterations: number;
  error: number;
}

/** Jacobian computation request */
export interface JacobianRequest {
  joint_angles: NumericArray;
  urdf_path?: FilePath;
}

/** Jacobian computation response */
export interface JacobianResponse {
  jacobian: number[][];
  condition_number: number;
  shape: [number, number];
}

/** Joint limits for a single joint */
export interface JointLimit {
  name: string;
  lower: number;
  upper: number;
  velocity: number;
  effort: number;
}

/** Joint limits response */
export interface JointLimitsResponse {
  joints: JointLimit[];
  num_joints: number;
}

/** Joint limit check request */
export interface JointLimitCheckRequest {
  joint_angles: NumericArray;
  urdf_path?: FilePath;
}

/** Joint limit violation */
export interface JointViolation {
  joint_index: number;
  joint_name: string;
  current_value: number;
  limit: number;
  violation_type: 'lower' | 'upper';
}

/** Joint limit check response */
export interface JointLimitCheckResponse {
  valid: boolean;
  violations: JointViolation[];
}

/** Velocity kinematics (Cartesian velocity from joint velocity) */
export interface VelocityKinematicsRequest {
  joint_angles: NumericArray;
  joint_velocities: NumericArray;
  urdf_path?: FilePath;
}

/** Velocity kinematics response */
export interface VelocityKinematicsResponse {
  linear_velocity: Vector3;
  angular_velocity: Vector3;
  twist: [number, number, number, number, number, number];
}

/** Differential IK request (Cartesian velocity to joint velocity) */
export interface DifferentialIKRequest {
  joint_angles: NumericArray;
  cartesian_velocity: [number, number, number, number, number, number];
  urdf_path?: FilePath;
  damping?: number;
}

/** Differential IK response */
export interface DifferentialIKResponse {
  joint_velocities: NumericArray;
  singularity_metric: number;
  is_singular: boolean;
}

/** Manipulability measures */
export interface ManipulabilityRequest {
  joint_angles: NumericArray;
  urdf_path?: FilePath;
}

/** Manipulability response */
export interface ManipulabilityResponse {
  yoshikawa: number;
  condition_number: number;
  min_singular_value: number;
  max_singular_value: number;
  singular_values: NumericArray;
}

/** Path segment types */
export type PathSegmentType = 'linear' | 'arc' | 'spline';

/** Cartesian path segment */
export interface CartesianPathSegment {
  type: PathSegmentType;
  start: SE3Pose;
  end: SE3Pose;
  via_points?: SE3Pose[];
  duration?: number;
}

/** Cartesian path planning request */
export interface CartesianPathRequest {
  segments: CartesianPathSegment[];
  initial_joints: NumericArray;
  urdf_path?: FilePath;
  max_velocity?: number;
  max_acceleration?: number;
  step_size?: number;
}

/** Cartesian path planning response */
export interface CartesianPathResponse {
  joint_trajectory: NumericArray[];
  cartesian_trajectory: SE3Pose[];
  times: NumericArray;
  success: boolean;
  planning_time: number;
}

/** Collision check request */
export interface CollisionCheckRequest {
  joint_angles: NumericArray;
  urdf_path?: FilePath;
  obstacles?: Obstacle[];
}

/** Obstacle definition */
export interface Obstacle {
  type: 'sphere' | 'box' | 'cylinder' | 'mesh';
  position: Vector3;
  orientation?: Quaternion;
  dimensions: NumericArray; // radius for sphere, [l,w,h] for box, [r,h] for cylinder
  mesh_path?: FilePath;
}

/** Collision check response */
export interface CollisionCheckResponse {
  in_collision: boolean;
  self_collision: boolean;
  environment_collision: boolean;
  collision_pairs?: CollisionPair[];
}

/** Collision pair */
export interface CollisionPair {
  link_a: string;
  link_b: string;
  distance: number;
  closest_point_a: Vector3;
  closest_point_b: Vector3;
}

/** URDF information */
export interface URDFInfo {
  name: string;
  num_joints: number;
  num_links: number;
  joint_names: string[];
  link_names: string[];
  base_link: string;
  end_effector_link: string;
}

/** DH parameters for a joint */
export interface DHParameter {
  joint_name: string;
  d: number;
  theta: number;
  a: number;
  alpha: number;
  joint_type: 'revolute' | 'prismatic' | 'fixed';
}

/** Chain kinematics info */
export interface ChainInfo {
  urdf_path: FilePath;
  chain_start: string;
  chain_end: string;
  dof: number;
  dh_parameters: DHParameter[];
  joint_limits: JointLimit[];
}
