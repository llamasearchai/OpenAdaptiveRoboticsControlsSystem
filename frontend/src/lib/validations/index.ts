/**
 * Validation schema exports.
 */

// Common schemas
export {
  uuidSchema,
  timestampSchema,
  filePathSchema,
  deviceTypeSchema,
  vector3Schema,
  quaternionSchema,
  tuple3Schema,
  tuple4Schema,
  matrix4x4Schema,
  se3PoseSchema,
  rangeSchema,
  workspaceBoundsSchema,
  numericArraySchema,
  createFixedLengthArraySchema,
  joint7ArraySchema,
  jointArraySchema,
  positiveNumberSchema,
  nonNegativeNumberSchema,
  percentageSchema,
  ratioSchema,
  connectionStateSchema,
  asyncStatusSchema,
} from './common';

// Simulation schemas
export {
  simulationBackendSchema,
  simulationTaskSchema,
  simulationStatusSchema,
  simulationConfigSchema,
  stepRequestSchema,
  resetRequestSchema,
  observationSchema,
  simulationStateSchema,
  stepInfoSchema,
  stepResponseSchema,
  renderConfigSchema,
  batchStepRequestSchema,
} from './simulation';

// Training schemas
export {
  algorithmSchema,
  trainingStatusSchema,
  ppoConfigSchema,
  sacConfigSchema,
  td3ConfigSchema,
  networkConfigSchema,
  trainingConfigSchema,
  startTrainingRequestSchema,
  trainingMetricsSchema,
  callbackConfigSchema,
} from './training';

// Kinematics schemas
export {
  fkRequestSchema,
  fkResponseSchema,
  ikRequestSchema,
  ikResponseSchema,
  jacobianRequestSchema,
  jacobianResponseSchema,
  jointLimitSchema,
  jointLimitsResponseSchema,
  jointLimitCheckRequestSchema,
  jointViolationSchema,
  jointLimitCheckResponseSchema,
  velocityKinematicsRequestSchema,
  velocityKinematicsResponseSchema,
  differentialIKRequestSchema,
  differentialIKResponseSchema,
  pathSegmentTypeSchema,
  cartesianPathSegmentSchema,
  cartesianPathRequestSchema,
  obstacleSchema,
  collisionCheckRequestSchema,
} from './kinematics';

// Dataset schemas
export {
  datasetFormatSchema,
  filterOptionsSchema,
  augmentationOptionsSchema,
  processDatasetRequestSchema,
  datasetConfigSchema,
  recordingCommandSchema,
  datasetSplitConfigSchema,
  dataLoaderConfigSchema,
  datasetMergeRequestSchema,
  datasetExportRequestSchema,
  datasetImportRequestSchema,
} from './dataset';

// Safety schemas
export {
  safetyJointLimitsSchema,
  safetyConfigSchema,
  safetyFilterRequestSchema,
  safetyViolationTypeSchema,
  safetyViolationSchema,
  safetyEventTypeSchema,
  safetyEventSeveritySchema,
  safetyEventSchema,
  collisionConfigSchema,
  forceTorqueLimitsSchema,
  powerForceLimitingConfigSchema,
  safetyZoneGeometrySchema,
  safetyZoneSchema,
  speedSeparationConfigSchema,
  compliantMotionConfigSchema,
  safetyInterlockSchema,
} from './safety';

// Re-export inferred types
export type {
  Vector3,
  Quaternion,
  Tuple3,
  Tuple4,
  Matrix4x4,
  SE3Pose,
  WorkspaceBounds,
} from './common';

export type {
  SimulationConfig,
  StepRequest,
  ResetRequest,
  Observation,
  SimulationState,
  StepInfo,
  StepResponse,
} from './simulation';

export type {
  PPOConfig,
  SACConfig,
  TD3Config,
  TrainingConfig,
  StartTrainingRequest,
  TrainingMetrics,
} from './training';

export type {
  FKRequest,
  FKResponse,
  IKRequest,
  IKResponse,
  JacobianRequest,
  JacobianResponse,
} from './kinematics';

export type {
  FilterOptions,
  AugmentationOptions,
  ProcessDatasetRequest,
  DatasetConfig,
  RecordingCommand,
  DatasetSplitConfig,
} from './dataset';

export type {
  SafetyJointLimits,
  SafetyConfig,
  SafetyFilterRequest,
  SafetyViolation,
  SafetyEvent,
  SafetyZone,
} from './safety';
