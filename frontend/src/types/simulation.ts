/**
 * Simulation-related types.
 */

import type { DeviceType, Timestamp, UUID, NumericArray } from './common';

/** Simulation backend types */
export type SimulationBackend = 'mujoco' | 'isaac' | 'pybullet' | 'dummy';

/** Available simulation tasks */
export type SimulationTask =
  | 'reach'
  | 'push'
  | 'pick_and_place'
  | 'insert'
  | 'custom';

/** Simulation session status */
export type SimulationStatus =
  | 'created'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed';

/** Configuration for creating a simulation session */
export interface SimulationConfig {
  task: SimulationTask;
  backend?: SimulationBackend;
  num_envs?: number;
  device?: DeviceType;
  seed?: number;
  render?: boolean;
  max_episode_steps?: number;
}

/** Simulation session response */
export interface SimulationSession {
  id: UUID;
  task: SimulationTask;
  backend: SimulationBackend;
  status: SimulationStatus;
  current_step: number;
  created_at?: Timestamp;
  metadata?: Record<string, unknown>;
}

/** Observation from simulation environment */
export interface Observation {
  joint_pos: NumericArray;
  joint_vel: NumericArray;
  ee_pos: [number, number, number];
  ee_quat: [number, number, number, number];
  goal_pos?: [number, number, number];
  object_pos?: [number, number, number];
  object_quat?: [number, number, number, number];
  gripper_state?: number;
  force_torque?: NumericArray;
  rgb?: string; // Base64 encoded image
  depth?: string; // Base64 encoded depth map
}

/** Full simulation state */
export interface SimulationState {
  time: number;
  qpos: NumericArray;
  qvel: NumericArray;
  qacc?: NumericArray;
  ctrl?: NumericArray;
  xpos?: Record<string, [number, number, number]>;
  xquat?: Record<string, [number, number, number, number]>;
  contact_forces?: NumericArray;
  sensor_data?: Record<string, number | NumericArray>;
}

/** Request to step the simulation */
export interface StepRequest {
  action: NumericArray;
  render?: boolean;
}

/** Result of stepping the simulation */
export interface StepResponse {
  observation: Observation;
  reward: number;
  terminated: boolean;
  truncated: boolean;
  info: StepInfo;
}

/** Additional info from simulation step */
export interface StepInfo {
  success?: boolean;
  is_success?: boolean;
  timeout?: boolean;
  collision?: boolean;
  distance_to_goal?: number;
  episode_length?: number;
  episode_reward?: number;
  [key: string]: unknown;
}

/** Request to reset the simulation */
export interface ResetRequest {
  seed?: number;
  options?: Record<string, unknown>;
}

/** Observation response wrapper */
export interface ObservationResponse {
  joint_pos: NumericArray;
  joint_vel: NumericArray;
  ee_pos: [number, number, number];
  ee_quat: [number, number, number, number];
  goal_pos?: [number, number, number];
}

/** State response wrapper */
export interface StateResponse {
  time: number;
  qpos: NumericArray;
  qvel: NumericArray;
}

/** Render configuration */
export interface RenderConfig {
  width?: number;
  height?: number;
  camera_id?: number | string;
  mode?: 'rgb' | 'depth' | 'segmentation';
}

/** Rendered frame */
export interface RenderedFrame {
  data: string; // Base64 encoded
  width: number;
  height: number;
  format: 'rgb' | 'rgba' | 'depth';
  timestamp: number;
}

/** Environment info */
export interface EnvironmentInfo {
  name: string;
  observation_space: SpaceInfo;
  action_space: SpaceInfo;
  reward_range: [number, number];
  max_episode_steps?: number;
}

/** Space specification */
export interface SpaceInfo {
  type: 'box' | 'discrete' | 'multi_discrete' | 'dict';
  shape?: number[];
  dtype?: string;
  low?: NumericArray;
  high?: NumericArray;
  n?: number;
  nvec?: number[];
  spaces?: Record<string, SpaceInfo>;
}

/** Batch step request for vectorized environments */
export interface BatchStepRequest {
  actions: NumericArray[]; // [num_envs, action_dim]
}

/** Batch step response */
export interface BatchStepResponse {
  observations: Observation[];
  rewards: number[];
  terminated: boolean[];
  truncated: boolean[];
  infos: StepInfo[];
}
