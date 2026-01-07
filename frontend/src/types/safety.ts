/**
 * Safety-related types for robot safety filtering.
 */

import type { NumericArray, WorkspaceBounds } from './common';

/** Joint limits for safety filtering */
export interface SafetyJointLimits {
  pos_min: NumericArray;
  pos_max: NumericArray;
  vel_max: NumericArray;
  torque_max: NumericArray;
  acc_max?: NumericArray;
}

/** Safety filter configuration */
export interface SafetyConfig {
  joint_limits: SafetyJointLimits;
  workspace_bounds?: WorkspaceBounds;
  dt: number;
  use_qp: boolean;
  solver_timeout?: number;
  velocity_scaling?: number;
  acceleration_scaling?: number;
}

/** Safety filter request */
export interface SafetyFilterRequest {
  action: NumericArray;
  joint_pos: NumericArray;
  joint_vel?: NumericArray;
  ee_pos?: [number, number, number];
}

/** Safety filter response */
export interface SafetyFilterResponse {
  safe_action: NumericArray;
  original_action: NumericArray;
  clipped_joints: number[];
  constraint_violations_count: number;
  filter_time_us: number;
  qp_iterations?: number;
}

/** Safety system status */
export interface SafetyStatusResponse {
  enabled: boolean;
  config: SafetyConfig | null;
  total_filtered: number;
  total_violations: number;
}

/** Safety violation details */
export interface SafetyViolation {
  type: SafetyViolationType;
  joint_index?: number;
  value: number;
  limit: number;
  timestamp: number;
}

/** Types of safety violations */
export type SafetyViolationType =
  | 'position_limit'
  | 'velocity_limit'
  | 'torque_limit'
  | 'acceleration_limit'
  | 'workspace_bound'
  | 'collision'
  | 'singularity';

/** Safety event */
export interface SafetyEvent {
  id: string;
  type: SafetyEventType;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  violations?: SafetyViolation[];
  timestamp: string;
  action_taken?: string;
}

/** Types of safety events */
export type SafetyEventType =
  | 'filter_activated'
  | 'limit_reached'
  | 'emergency_stop'
  | 'protective_stop'
  | 'violation_cleared'
  | 'config_changed';

/** Collision detection config */
export interface CollisionConfig {
  enabled: boolean;
  self_collision: boolean;
  environment_collision: boolean;
  min_distance: number;
  check_frequency: number;
}

/** Force/torque limits */
export interface ForceTorqueLimits {
  force_max: [number, number, number];
  torque_max: [number, number, number];
  force_threshold_stop: number;
  torque_threshold_stop: number;
}

/** Power and force limiting (PFL) config for cobots */
export interface PowerForceLimitingConfig {
  enabled: boolean;
  max_power: number;
  max_momentum: number;
  max_force: number;
  reduced_speed: number;
  reduced_force: number;
}

/** Safety zone definition */
export interface SafetyZone {
  id: string;
  name: string;
  type: 'warning' | 'reduced_speed' | 'stop';
  geometry: SafetyZoneGeometry;
  active: boolean;
  speed_reduction?: number;
}

/** Safety zone geometry */
export interface SafetyZoneGeometry {
  type: 'box' | 'sphere' | 'cylinder' | 'plane';
  center: [number, number, number];
  dimensions: NumericArray;
  orientation?: [number, number, number, number];
}

/** Speed and separation monitoring */
export interface SpeedSeparationConfig {
  enabled: boolean;
  min_separation_distance: number;
  max_speed_at_min_distance: number;
  speed_scaling_factor: number;
  human_detection_enabled: boolean;
}

/** Safety monitoring statistics */
export interface SafetyStats {
  uptime_seconds: number;
  total_actions_filtered: number;
  total_violations: number;
  violations_by_type: Record<SafetyViolationType, number>;
  emergency_stops: number;
  protective_stops: number;
  avg_filter_time_us: number;
  max_filter_time_us: number;
  last_violation_time?: string;
}

/** Safety audit log entry */
export interface SafetyAuditEntry {
  timestamp: string;
  event_type: SafetyEventType;
  details: Record<string, unknown>;
  user_id?: string;
  acknowledged?: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
}

/** Emergency stop state */
export interface EmergencyStopState {
  active: boolean;
  source?: 'software' | 'hardware' | 'external';
  triggered_at?: string;
  reset_required: boolean;
  reset_procedure?: string;
}

/** Safety system health */
export interface SafetySystemHealth {
  status: 'ok' | 'degraded' | 'fault';
  sensors_ok: boolean;
  plc_connected: boolean;
  estop_circuit_ok: boolean;
  last_self_test?: string;
  faults: string[];
}

/** Compliant motion config */
export interface CompliantMotionConfig {
  enabled: boolean;
  stiffness: NumericArray;
  damping: NumericArray;
  force_limit: NumericArray;
  null_space_stiffness?: NumericArray;
}

/** Recovery action */
export interface RecoveryAction {
  type: 'reset' | 'move_to_safe' | 'reduce_speed' | 'disable_axis';
  parameters?: Record<string, unknown>;
  requires_confirmation: boolean;
}

/** Safety interlock */
export interface SafetyInterlock {
  id: string;
  name: string;
  type: 'door' | 'light_curtain' | 'scanner' | 'mat' | 'custom';
  state: 'triggered' | 'clear' | 'bypassed' | 'fault';
  can_bypass: boolean;
  bypass_password_required: boolean;
}
