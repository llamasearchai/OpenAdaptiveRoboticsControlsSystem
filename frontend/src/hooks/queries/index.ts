/**
 * Query hooks exports.
 */

// Query keys
export { queryKeys, simulationKeys, trainingKeys, kinematicsKeys, datasetKeys, safetyKeys, healthKeys } from './keys';
export type { QueryKeys } from './keys';

// Simulation hooks
export {
  useSimulationSessions,
  useSimulationSession,
  useSimulationState,
  useSimulationObservation,
  useCreateSimulationSession,
  useDeleteSimulationSession,
  useStepSimulation,
  useResetSimulation,
  usePrefetchSimulationSession,
  useInvalidateSimulationQueries,
} from './simulation';

// Training hooks
export {
  useTrainingRuns,
  useTrainingRun,
  useTrainingMetrics,
  useInfiniteTrainingMetrics,
  useCreateTrainingRun,
  useStartTrainingRun,
  useStopTrainingRun,
  useDeleteTrainingRun,
  usePrefetchTrainingRun,
  useUpdateTrainingRunCache,
  useAddMetricsToCache,
  useInvalidateTrainingQueries,
} from './training';

// Kinematics hooks
export {
  useForwardKinematics,
  useForwardKinematicsMutation,
  useInverseKinematics,
  useInverseKinematicsMutation,
  useJacobian,
  useJacobianMutation,
  useJointLimits,
  useCheckJointLimits,
  useRealTimeFK,
  useRealTimeIK,
} from './kinematics';

// Dataset hooks
export {
  useDatasets,
  useDataset,
  useDatasetStatistics,
  useRegisterDataset,
  useUnregisterDataset,
  useProcessDataset,
  usePrefetchDataset,
  useInvalidateDatasetQueries,
} from './datasets';

// Safety hooks
export {
  useSafetyStatus,
  useConfigureSafety,
  useDisableSafety,
  useFilterAction,
  useResetSafetyStats,
  useRealTimeSafetyFilter,
  useInvalidateSafetyQueries,
} from './safety';
