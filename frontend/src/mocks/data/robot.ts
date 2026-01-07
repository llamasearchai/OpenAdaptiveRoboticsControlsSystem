/**
 * Mock data factories for robot state.
 */

import type { Vector3, Quaternion, JointLimits, RobotArmState, ControlMode } from '@/types';

/** Default 7-DOF joint positions (home position) */
export const DEFAULT_JOINT_POSITIONS = [0, 0, 0, -1.57, 0, 1.57, 0];

/** Default 7-DOF joint limits (Franka Emika Panda-like) */
export const DEFAULT_JOINT_LIMITS: JointLimits = {
  pos_min: [-2.8973, -1.7628, -2.8973, -3.0718, -2.8973, -0.0175, -2.8973],
  pos_max: [2.8973, 1.7628, 2.8973, -0.0698, 2.8973, 3.7525, 2.8973],
  vel_max: [2.175, 2.175, 2.175, 2.175, 2.61, 2.61, 2.61],
  torque_max: [87, 87, 87, 87, 12, 12, 12],
};

/** Create mock joint limits */
export function createMockJointLimits(
  overrides?: Partial<JointLimits>
): JointLimits {
  return {
    ...DEFAULT_JOINT_LIMITS,
    ...overrides,
  };
}

/** Create mock robot arm state */
export function createMockRobotArmState(
  overrides?: Partial<RobotArmState>
): RobotArmState {
  return {
    joint_positions: [...DEFAULT_JOINT_POSITIONS],
    joint_velocities: [0, 0, 0, 0, 0, 0, 0],
    joint_efforts: [0, 0, 0, 0, 0, 0, 0],
    ee_position: { x: 0.5, y: 0, z: 0.5 },
    ee_orientation: { w: 1, x: 0, y: 0, z: 0 },
    gripper_position: 1.0,
    gripper_state: 'open',
    control_mode: 'idle' as ControlMode,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

/** Create mock end-effector position */
export function createMockEEPosition(overrides?: Partial<Vector3>): Vector3 {
  return {
    x: 0.5,
    y: 0,
    z: 0.5,
    ...overrides,
  };
}

/** Create mock quaternion */
export function createMockQuaternion(overrides?: Partial<Quaternion>): Quaternion {
  return {
    w: 1,
    x: 0,
    y: 0,
    z: 0,
    ...overrides,
  };
}

/** Generate random joint positions within limits */
export function generateRandomJointPositions(
  limits: JointLimits = DEFAULT_JOINT_LIMITS
): number[] {
  return limits.pos_min.map((min, i) => {
    const max = limits.pos_max[i] ?? min;
    return min + Math.random() * (max - min);
  });
}

/** Interpolate between two joint configurations */
export function interpolateJoints(
  start: number[],
  end: number[],
  t: number
): number[] {
  return start.map((s, i) => s + ((end[i] ?? s) - s) * t);
}
