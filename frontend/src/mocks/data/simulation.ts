/**
 * Mock data factories for simulation.
 */

import type {
  SimulationSession,
  SimulationConfig,
  Observation,
  SimulationState,
  StepInfo,
} from '@/types';

let sessionCounter = 0;

/** Generate a unique session ID */
export function generateSessionId(): string {
  return `session-${++sessionCounter}-${Date.now().toString(36)}`;
}

/** Create mock simulation config */
export function createMockSimulationConfig(
  overrides?: Partial<SimulationConfig>
): SimulationConfig {
  return {
    task: 'reach',
    backend: 'mujoco',
    num_envs: 1,
    device: 'cpu',
    render: false,
    ...overrides,
  };
}

/** Create mock simulation session */
export function createMockSimulationSession(
  overrides?: Partial<SimulationSession>
): SimulationSession {
  return {
    id: generateSessionId(),
    task: 'reach',
    backend: 'mujoco',
    status: 'created',
    current_step: 0,
    ...overrides,
  };
}

/** Create mock observation */
export function createMockObservation(
  overrides?: Partial<Observation>
): Observation {
  return {
    joint_pos: [0, 0, 0, -1.57, 0, 1.57, 0],
    joint_vel: [0, 0, 0, 0, 0, 0, 0],
    ee_pos: [0.5, 0, 0.5],
    ee_quat: [1, 0, 0, 0],
    goal_pos: [0.6, 0.1, 0.4],
    ...overrides,
  };
}

/** Create mock simulation state */
export function createMockSimulationState(
  overrides?: Partial<SimulationState>
): SimulationState {
  return {
    time: 0,
    qpos: [0, 0, 0, -1.57, 0, 1.57, 0],
    qvel: [0, 0, 0, 0, 0, 0, 0],
    ...overrides,
  };
}

/** Create mock step info */
export function createMockStepInfo(overrides?: Partial<StepInfo>): StepInfo {
  return {
    success: false,
    is_success: false,
    timeout: false,
    collision: false,
    distance_to_goal: 0.15,
    ...overrides,
  };
}

/** Generate random observation with noise */
export function createRandomObservation(
  baseObs: Observation,
  noise: number = 0.01
): Observation {
  const addNoise = (arr: number[]) =>
    arr.map((v) => v + (Math.random() - 0.5) * 2 * noise);

  return {
    ...baseObs,
    joint_pos: addNoise(baseObs.joint_pos),
    joint_vel: addNoise(baseObs.joint_vel),
    ee_pos: addNoise(baseObs.ee_pos) as [number, number, number],
  };
}

/** In-memory session store for mocks */
export const mockSessionStore = new Map<string, SimulationSession>();

/** Reset mock store */
export function resetMockSessionStore(): void {
  mockSessionStore.clear();
  sessionCounter = 0;
}
