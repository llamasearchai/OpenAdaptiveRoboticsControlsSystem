/**
 * Query key factory for TanStack Query.
 * Provides type-safe, consistent query keys.
 */

/** Simulation query keys */
export const simulationKeys = {
  all: ['simulation'] as const,
  sessions: () => [...simulationKeys.all, 'sessions'] as const,
  session: (id: string) => [...simulationKeys.sessions(), id] as const,
  state: (id: string) => [...simulationKeys.session(id), 'state'] as const,
  observation: (id: string) => [...simulationKeys.session(id), 'observation'] as const,
};

/** Training query keys */
export const trainingKeys = {
  all: ['training'] as const,
  runs: () => [...trainingKeys.all, 'runs'] as const,
  run: (id: string) => [...trainingKeys.runs(), id] as const,
  metrics: (id: string, pagination?: { offset?: number; limit?: number }) =>
    [...trainingKeys.run(id), 'metrics', pagination] as const,
};

/** Kinematics query keys */
export const kinematicsKeys = {
  all: ['kinematics'] as const,
  fk: (jointAngles: number[]) => [...kinematicsKeys.all, 'fk', jointAngles] as const,
  ik: (target: { position: number[]; quaternion?: number[] }) =>
    [...kinematicsKeys.all, 'ik', target] as const,
  jacobian: (jointAngles: number[]) => [...kinematicsKeys.all, 'jacobian', jointAngles] as const,
  jointLimits: (urdfPath?: string) => [...kinematicsKeys.all, 'limits', urdfPath] as const,
};

/** Dataset query keys */
export const datasetKeys = {
  all: ['datasets'] as const,
  list: (pagination?: { offset?: number; limit?: number }) =>
    [...datasetKeys.all, 'list', pagination] as const,
  detail: (id: string) => [...datasetKeys.all, 'detail', id] as const,
  statistics: (id: string) => [...datasetKeys.detail(id), 'statistics'] as const,
};

/** Safety query keys */
export const safetyKeys = {
  all: ['safety'] as const,
  status: () => [...safetyKeys.all, 'status'] as const,
  config: () => [...safetyKeys.all, 'config'] as const,
};

/** Health query keys */
export const healthKeys = {
  all: ['health'] as const,
  check: () => [...healthKeys.all, 'check'] as const,
};

/** All query keys */
export const queryKeys = {
  simulation: simulationKeys,
  training: trainingKeys,
  kinematics: kinematicsKeys,
  datasets: datasetKeys,
  safety: safetyKeys,
  health: healthKeys,
} as const;

export type QueryKeys = typeof queryKeys;
