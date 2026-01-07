/**
 * Robot store for robot arm state and control.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  Vector3,
  Quaternion,
  ControlMode,
  GripperState,
  JointLimits,
  NumericArray,
} from '@/types';

/** Default 7-DOF joint positions (home position) */
const DEFAULT_JOINT_POSITIONS = [0, 0, 0, -1.57, 0, 1.57, 0];

/** Default 7-DOF joint limits */
const DEFAULT_JOINT_LIMITS: JointLimits = {
  pos_min: [-2.9, -1.76, -2.9, -3.07, -2.9, -0.02, -2.9],
  pos_max: [2.9, 1.76, 2.9, -0.07, 2.9, 3.75, 2.9],
  vel_max: [2.175, 2.175, 2.175, 2.175, 2.61, 2.61, 2.61],
  torque_max: [87, 87, 87, 87, 12, 12, 12],
};

/** Robot store state */
export interface RobotState {
  // Connection
  connected: boolean;
  connecting: boolean;
  connectionError: string | undefined;

  // Joint state
  jointPositions: NumericArray;
  jointVelocities: NumericArray;
  jointEfforts: NumericArray;
  jointLimits: JointLimits;

  // End-effector state
  eePosition: Vector3;
  eeOrientation: Quaternion;

  // Target state (for visualization)
  targetJointPositions: NumericArray;
  targetEEPosition: Vector3;
  targetEEOrientation: Quaternion;
  showTarget: boolean;

  // Gripper
  gripperPosition: number;
  gripperState: GripperState;

  // Control
  controlMode: ControlMode;
  isMoving: boolean;
  isHomed: boolean;
  isEnabled: boolean;

  // Selection
  selectedJoint: number | null;

  // Visualization options
  showJointAxes: boolean;
  showCoordinateFrames: boolean;
  showTrajectory: boolean;
  ghostOpacity: number;
}

/** Robot store actions */
export interface RobotActions {
  // Connection
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setConnectionError: (error?: string) => void;

  // Joint state
  setJointPositions: (positions: NumericArray) => void;
  setJointVelocities: (velocities: NumericArray) => void;
  setJointEfforts: (efforts: NumericArray) => void;
  setJointLimits: (limits: JointLimits) => void;
  setJointPosition: (index: number, value: number) => void;

  // End-effector state
  setEEPosition: (position: Vector3) => void;
  setEEOrientation: (orientation: Quaternion) => void;
  setEEPose: (position: Vector3, orientation: Quaternion) => void;

  // Target state
  setTargetJointPositions: (positions: NumericArray) => void;
  setTargetEEPosition: (position: Vector3) => void;
  setTargetEEOrientation: (orientation: Quaternion) => void;
  setTargetEEPose: (position: Vector3, orientation: Quaternion) => void;
  setShowTarget: (show: boolean) => void;
  syncTargetWithCurrent: () => void;

  // Gripper
  setGripperPosition: (position: number) => void;
  setGripperState: (state: GripperState) => void;

  // Control
  setControlMode: (mode: ControlMode) => void;
  setIsMoving: (moving: boolean) => void;
  setIsHomed: (homed: boolean) => void;
  setIsEnabled: (enabled: boolean) => void;

  // Selection
  selectJoint: (index: number | null) => void;

  // Visualization
  setShowJointAxes: (show: boolean) => void;
  setShowCoordinateFrames: (show: boolean) => void;
  setShowTrajectory: (show: boolean) => void;
  setGhostOpacity: (opacity: number) => void;

  // Bulk update
  updateState: (update: Partial<RobotState>) => void;

  // Reset
  resetToHome: () => void;
  resetAll: () => void;
}

/** Create initial state */
function createInitialState(): RobotState {
  return {
    // Connection
    connected: false,
    connecting: false,
    connectionError: undefined,

    // Joint state
    jointPositions: [...DEFAULT_JOINT_POSITIONS],
    jointVelocities: new Array(7).fill(0),
    jointEfforts: new Array(7).fill(0),
    jointLimits: { ...DEFAULT_JOINT_LIMITS },

    // End-effector state
    eePosition: { x: 0.5, y: 0, z: 0.5 },
    eeOrientation: { w: 1, x: 0, y: 0, z: 0 },

    // Target state
    targetJointPositions: [...DEFAULT_JOINT_POSITIONS],
    targetEEPosition: { x: 0.5, y: 0, z: 0.5 },
    targetEEOrientation: { w: 1, x: 0, y: 0, z: 0 },
    showTarget: false,

    // Gripper
    gripperPosition: 1.0,
    gripperState: 'open',

    // Control
    controlMode: 'idle',
    isMoving: false,
    isHomed: false,
    isEnabled: false,

    // Selection
    selectedJoint: null,

    // Visualization
    showJointAxes: false,
    showCoordinateFrames: true,
    showTrajectory: true,
    ghostOpacity: 0.3,
  };
}

/** Robot store */
export const useRobotStore = create<RobotState & RobotActions>()(
  immer((set) => ({
    ...createInitialState(),

    // Connection actions
    setConnected: (connected) =>
      set((state) => {
        state.connected = connected;
        if (!connected) {
          state.isEnabled = false;
        }
      }),

    setConnecting: (connecting) =>
      set((state) => {
        state.connecting = connecting;
      }),

    setConnectionError: (error) =>
      set((state) => {
        state.connectionError = error;
      }),

    // Joint state actions
    setJointPositions: (positions) =>
      set((state) => {
        state.jointPositions = positions;
      }),

    setJointVelocities: (velocities) =>
      set((state) => {
        state.jointVelocities = velocities;
      }),

    setJointEfforts: (efforts) =>
      set((state) => {
        state.jointEfforts = efforts;
      }),

    setJointLimits: (limits) =>
      set((state) => {
        state.jointLimits = limits;
      }),

    setJointPosition: (index, value) =>
      set((state) => {
        if (index >= 0 && index < state.jointPositions.length) {
          // Clamp to limits
          const min = state.jointLimits.pos_min[index];
          const max = state.jointLimits.pos_max[index];
          state.jointPositions[index] = Math.max(min, Math.min(max, value));
        }
      }),

    // End-effector actions
    setEEPosition: (position) =>
      set((state) => {
        state.eePosition = position;
      }),

    setEEOrientation: (orientation) =>
      set((state) => {
        state.eeOrientation = orientation;
      }),

    setEEPose: (position, orientation) =>
      set((state) => {
        state.eePosition = position;
        state.eeOrientation = orientation;
      }),

    // Target state actions
    setTargetJointPositions: (positions) =>
      set((state) => {
        state.targetJointPositions = positions;
      }),

    setTargetEEPosition: (position) =>
      set((state) => {
        state.targetEEPosition = position;
      }),

    setTargetEEOrientation: (orientation) =>
      set((state) => {
        state.targetEEOrientation = orientation;
      }),

    setTargetEEPose: (position, orientation) =>
      set((state) => {
        state.targetEEPosition = position;
        state.targetEEOrientation = orientation;
      }),

    setShowTarget: (show) =>
      set((state) => {
        state.showTarget = show;
      }),

    syncTargetWithCurrent: () =>
      set((state) => {
        state.targetJointPositions = [...state.jointPositions];
        state.targetEEPosition = { ...state.eePosition };
        state.targetEEOrientation = { ...state.eeOrientation };
      }),

    // Gripper actions
    setGripperPosition: (position) =>
      set((state) => {
        state.gripperPosition = Math.max(0, Math.min(1, position));
      }),

    setGripperState: (gripperState) =>
      set((state) => {
        state.gripperState = gripperState;
      }),

    // Control actions
    setControlMode: (mode) =>
      set((state) => {
        state.controlMode = mode;
      }),

    setIsMoving: (moving) =>
      set((state) => {
        state.isMoving = moving;
      }),

    setIsHomed: (homed) =>
      set((state) => {
        state.isHomed = homed;
      }),

    setIsEnabled: (enabled) =>
      set((state) => {
        state.isEnabled = enabled;
      }),

    // Selection actions
    selectJoint: (index) =>
      set((state) => {
        state.selectedJoint = index;
      }),

    // Visualization actions
    setShowJointAxes: (show) =>
      set((state) => {
        state.showJointAxes = show;
      }),

    setShowCoordinateFrames: (show) =>
      set((state) => {
        state.showCoordinateFrames = show;
      }),

    setShowTrajectory: (show) =>
      set((state) => {
        state.showTrajectory = show;
      }),

    setGhostOpacity: (opacity) =>
      set((state) => {
        state.ghostOpacity = Math.max(0, Math.min(1, opacity));
      }),

    // Bulk update
    updateState: (update) =>
      set((state) => {
        Object.assign(state, update);
      }),

    // Reset actions
    resetToHome: () =>
      set((state) => {
        state.jointPositions = [...DEFAULT_JOINT_POSITIONS];
        state.targetJointPositions = [...DEFAULT_JOINT_POSITIONS];
        state.jointVelocities = new Array(7).fill(0);
        state.jointEfforts = new Array(7).fill(0);
      }),

    resetAll: () =>
      set(() => createInitialState()),
  }))
);

// Selector hooks
export const useJointPositions = () => useRobotStore((state) => state.jointPositions);
export const useJointLimits = () => useRobotStore((state) => state.jointLimits);
export const useEEPose = () =>
  useRobotStore((state) => ({
    position: state.eePosition,
    orientation: state.eeOrientation,
  }));
export const useControlMode = () => useRobotStore((state) => state.controlMode);
export const useRobotConnection = () =>
  useRobotStore((state) => ({
    connected: state.connected,
    connecting: state.connecting,
    error: state.connectionError,
  }));
