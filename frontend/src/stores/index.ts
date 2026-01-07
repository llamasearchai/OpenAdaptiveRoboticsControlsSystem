/**
 * Store exports.
 */

// UI Store
export {
  useUIStore,
  useTheme,
  usePanels,
  useModal,
  useNotifications,
  useGlobalLoading,
} from './ui';
export type {
  ThemeMode,
  PanelState,
  ModalState,
  NotificationType,
  Notification,
  UIState,
  UIActions,
} from './ui';

// Robot Store
export {
  useRobotStore,
  useJointPositions,
  useJointLimits,
  useEEPose,
  useControlMode,
  useRobotConnection,
} from './robot';
export type { RobotState, RobotActions } from './robot';

// Training Store
export {
  useTrainingStore,
  useActiveRun,
  useMetricsBuffer,
  useLatestMetrics,
  useDraftConfig,
  useChartConfigs,
  useTrainingWsStatus,
  useChartMetrics,
} from './training';
export type {
  MetricsDataPoint,
  ChartConfig,
  TrainingState,
  TrainingActions,
} from './training';

// Scene Store
export {
  useSceneStore,
  useCamera,
  useCameraPreset,
  useSelectedObjects,
  useVisibilitySettings,
  useLightingSettings,
  usePostProcessing,
} from './scene';
export type {
  CameraPreset,
  CameraState,
  SelectionMode,
  SelectedObject,
  GridSettings,
  LightingSettings,
  PostProcessingSettings,
  SceneState,
  SceneActions,
} from './scene';

// Simulation Store
export {
  useSimulationStore,
  useActiveSimSession,
  useCurrentObservation,
  useStepHistory,
  useEpisodeStats,
  useSimulationControl,
  useSimWsStatus,
} from './simulation';
export type {
  StepHistoryEntry,
  EpisodeStats,
  SimulationStoreState,
  SimulationStoreActions,
} from './simulation';

// Connection Store
export {
  useConnectionStore,
  useApiHealth,
  useWsConnections,
  useWsConnection,
  useNetworkStatus,
  useReconnectSettings,
  useConnectedWsCount,
} from './connection';
export type {
  HealthStatus,
  ServiceStatus,
  WebSocketConnection,
  ConnectionStoreState,
  ConnectionStoreActions,
} from './connection';
