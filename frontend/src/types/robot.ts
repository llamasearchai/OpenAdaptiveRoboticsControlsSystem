/**
 * Robot-related types for arm state and control.
 */

import type {
  Vector3,
  Quaternion,
  NumericArray,
  Range,
  Timestamp,
  UUID,
  FilePath,
} from './common';

/** Robot control modes */
export type ControlMode =
  | 'position'
  | 'velocity'
  | 'torque'
  | 'impedance'
  | 'cartesian'
  | 'idle';

/** Gripper state */
export type GripperState = 'open' | 'closed' | 'moving';

/** Robot connection status */
export type RobotConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

/** Robot arm state */
export interface RobotArmState {
  joint_positions: NumericArray;
  joint_velocities: NumericArray;
  joint_efforts: NumericArray;
  ee_position: Vector3;
  ee_orientation: Quaternion;
  gripper_position?: number;
  gripper_state?: GripperState;
  control_mode: ControlMode;
  timestamp: Timestamp;
}

/** Joint limits for robot arm */
export interface JointLimits {
  pos_min: NumericArray;
  pos_max: NumericArray;
  vel_max: NumericArray;
  torque_max: NumericArray;
  acc_max?: NumericArray;
  jerk_max?: NumericArray;
}

/** Robot configuration */
export interface RobotConfig {
  name: string;
  urdf_path: FilePath;
  num_joints: number;
  joint_names: string[];
  base_link: string;
  ee_link: string;
  joint_limits: JointLimits;
  default_pose?: NumericArray;
}

/** Robot metadata */
export interface RobotInfo {
  id: UUID;
  name: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  firmware_version?: string;
  config: RobotConfig;
  status: RobotConnectionStatus;
  last_seen?: Timestamp;
}

/** Command to set joint positions */
export interface JointPositionCommand {
  positions: NumericArray;
  duration?: number;
  interpolation?: 'linear' | 'cubic' | 'quintic';
}

/** Command to set joint velocities */
export interface JointVelocityCommand {
  velocities: NumericArray;
  acceleration_limits?: NumericArray;
}

/** Command to set joint torques */
export interface JointTorqueCommand {
  torques: NumericArray;
}

/** Cartesian pose command */
export interface CartesianPoseCommand {
  position: Vector3;
  orientation: Quaternion;
  duration?: number;
  linear_velocity?: number;
  angular_velocity?: number;
}

/** Impedance control parameters */
export interface ImpedanceParams {
  stiffness: NumericArray; // 6 DOF: [x, y, z, rx, ry, rz]
  damping: NumericArray;
  inertia?: NumericArray;
  desired_wrench?: NumericArray;
}

/** Impedance control command */
export interface ImpedanceCommand {
  target_pose: CartesianPoseCommand;
  params: ImpedanceParams;
}

/** Gripper command */
export interface GripperCommand {
  action: 'open' | 'close' | 'move';
  position?: number; // 0.0 (closed) to 1.0 (open)
  force?: number;
  speed?: number;
}

/** Motion command union type */
export type MotionCommand =
  | { type: 'joint_position'; command: JointPositionCommand }
  | { type: 'joint_velocity'; command: JointVelocityCommand }
  | { type: 'joint_torque'; command: JointTorqueCommand }
  | { type: 'cartesian'; command: CartesianPoseCommand }
  | { type: 'impedance'; command: ImpedanceCommand }
  | { type: 'gripper'; command: GripperCommand }
  | { type: 'stop'; command: Record<string, never> };

/** Robot error/fault */
export interface RobotError {
  code: string;
  message: string;
  severity: 'warning' | 'error' | 'critical';
  joint_index?: number;
  timestamp: Timestamp;
  recoverable: boolean;
}

/** Robot status update */
export interface RobotStatusUpdate {
  state: RobotArmState;
  errors: RobotError[];
  control_mode: ControlMode;
  is_moving: boolean;
  is_homed: boolean;
  is_enabled: boolean;
  uptime_seconds: number;
}

/** Telemetry data */
export interface RobotTelemetry {
  joint_temperatures?: NumericArray;
  motor_currents?: NumericArray;
  joint_torques_measured?: NumericArray;
  joint_torques_external?: NumericArray;
  collision_detected?: boolean;
  safety_status: SafetyStatus;
}

/** Safety status */
export interface SafetyStatus {
  estop_active: boolean;
  protective_stop: boolean;
  reduced_mode: boolean;
  safety_faults: string[];
}

/** Trajectory point */
export interface TrajectoryPoint {
  positions: NumericArray;
  velocities?: NumericArray;
  accelerations?: NumericArray;
  effort?: NumericArray;
  time_from_start: number;
}

/** Joint trajectory */
export interface JointTrajectory {
  joint_names: string[];
  points: TrajectoryPoint[];
}

/** Trajectory execution status */
export type TrajectoryStatus =
  | 'pending'
  | 'executing'
  | 'succeeded'
  | 'aborted'
  | 'preempted';

/** Trajectory execution result */
export interface TrajectoryResult {
  trajectory_id: UUID;
  status: TrajectoryStatus;
  error_code?: string;
  error_string?: string;
  actual_trajectory?: JointTrajectory;
  execution_time: number;
}

/** Teach mode (gravity compensation) settings */
export interface TeachModeConfig {
  enabled: boolean;
  stiffness_scale?: number;
  damping_scale?: number;
  force_threshold?: number;
  velocity_limit?: number;
}

/** Robot workspace definition */
export interface Workspace {
  type: 'box' | 'sphere' | 'cylinder' | 'custom';
  center: Vector3;
  dimensions: NumericArray;
  is_exclusion?: boolean;
  name?: string;
}

/** Digital I/O state */
export interface DigitalIO {
  inputs: boolean[];
  outputs: boolean[];
  configurable: boolean[];
}

/** Analog I/O state */
export interface AnalogIO {
  inputs: NumericArray;
  outputs: NumericArray;
  input_ranges: Range[];
  output_ranges: Range[];
}

/** Tool configuration */
export interface ToolConfig {
  mass: number;
  center_of_mass: Vector3;
  inertia: [number, number, number, number, number, number]; // Ixx, Iyy, Izz, Ixy, Ixz, Iyz
  tcp_offset: {
    position: Vector3;
    orientation: Quaternion;
  };
}

/** Payload estimation result */
export interface PayloadEstimation {
  mass: number;
  center_of_mass: Vector3;
  confidence: number;
}
