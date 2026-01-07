/**
 * API endpoint constants.
 */

/** Base API path */
export const API_PREFIX = '/api';

/** WebSocket path */
export const WS_PREFIX = '/ws';

/** Simulation endpoints */
export const SIMULATION = {
  SESSIONS: `${API_PREFIX}/simulation/sessions`,
  SESSION: (id: string) => `${API_PREFIX}/simulation/sessions/${id}`,
  STEP: (id: string) => `${API_PREFIX}/simulation/sessions/${id}/step`,
  RESET: (id: string) => `${API_PREFIX}/simulation/sessions/${id}/reset`,
  STATE: (id: string) => `${API_PREFIX}/simulation/sessions/${id}/state`,
  OBSERVATION: (id: string) => `${API_PREFIX}/simulation/sessions/${id}/observation`,
} as const;

/** Training endpoints */
export const TRAINING = {
  RUNS: `${API_PREFIX}/training/runs`,
  RUN: (id: string) => `${API_PREFIX}/training/runs/${id}`,
  START: (id: string) => `${API_PREFIX}/training/runs/${id}/start`,
  STOP: (id: string) => `${API_PREFIX}/training/runs/${id}/stop`,
  METRICS: (id: string) => `${API_PREFIX}/training/runs/${id}/metrics`,
} as const;

/** Kinematics endpoints */
export const KINEMATICS = {
  FK: `${API_PREFIX}/kinematics/fk`,
  IK: `${API_PREFIX}/kinematics/ik`,
  JACOBIAN: `${API_PREFIX}/kinematics/jacobian`,
  JOINT_LIMITS: `${API_PREFIX}/kinematics/joint-limits`,
  CHECK_LIMITS: `${API_PREFIX}/kinematics/check-limits`,
} as const;

/** Dataset endpoints */
export const DATASETS = {
  LIST: `${API_PREFIX}/datasets`,
  GET: (id: string) => `${API_PREFIX}/datasets/${id}`,
  REGISTER: `${API_PREFIX}/datasets/register`,
  UNREGISTER: (id: string) => `${API_PREFIX}/datasets/${id}`,
  STATISTICS: (id: string) => `${API_PREFIX}/datasets/${id}/statistics`,
  PROCESS: (id: string) => `${API_PREFIX}/datasets/${id}/process`,
} as const;

/** Safety endpoints */
export const SAFETY = {
  STATUS: `${API_PREFIX}/safety/status`,
  CONFIGURE: `${API_PREFIX}/safety/configure`,
  DISABLE: `${API_PREFIX}/safety/disable`,
  FILTER: `${API_PREFIX}/safety/filter`,
  RESET_STATS: `${API_PREFIX}/safety/reset-stats`,
} as const;

/** Health endpoint */
export const HEALTH = '/health';

/** WebSocket endpoints */
export const WS = {
  SIMULATION: (id: string) => `${WS_PREFIX}/simulation/${id}`,
  TRAINING: (id: string) => `${WS_PREFIX}/training/${id}`,
} as const;

/** All endpoints for type safety */
export const ENDPOINTS = {
  SIMULATION,
  TRAINING,
  KINEMATICS,
  DATASETS,
  SAFETY,
  HEALTH,
  WS,
} as const;

export type Endpoints = typeof ENDPOINTS;
