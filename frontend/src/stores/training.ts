/**
 * Training store for RL training state management.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  TrainingRun,
  TrainingMetrics,
  TrainingConfig,
  Algorithm,
} from '@/types';

/** Training metrics with timestamp for charting */
export interface MetricsDataPoint {
  step: number;
  timestamp: number;
  policy_loss: number | undefined;
  value_loss: number | undefined;
  kl: number | undefined;
  entropy: number | undefined;
  explained_variance: number | undefined;
  episode_reward: number | undefined;
  episode_length: number | undefined;
}

/** Chart display configuration */
export interface ChartConfig {
  metric: keyof Omit<MetricsDataPoint, 'step' | 'timestamp'>;
  label: string;
  color: string;
  visible: boolean;
}

/** Training store state */
export interface TrainingState {
  // Active run
  activeRunId: string | null;
  activeRun: TrainingRun | null;

  // All runs
  runs: Map<string, TrainingRun>;

  // Metrics buffer (ring buffer for performance)
  metricsBuffer: MetricsDataPoint[];
  metricsBufferSize: number;
  latestMetrics: TrainingMetrics | null;

  // Draft configuration
  draftConfig: TrainingConfig | null;

  // UI state
  selectedAlgorithm: Algorithm;
  isConfiguring: boolean;
  showAdvancedOptions: boolean;

  // Chart config
  chartConfigs: ChartConfig[];
  chartTimeWindow: number; // Steps to show

  // WebSocket
  wsConnected: boolean;
}

/** Training store actions */
export interface TrainingActions {
  // Run management
  setActiveRun: (run: TrainingRun | null) => void;
  updateRun: (runId: string, update: Partial<TrainingRun>) => void;
  addRun: (run: TrainingRun) => void;
  removeRun: (runId: string) => void;
  clearRuns: () => void;

  // Metrics
  addMetrics: (metrics: TrainingMetrics | TrainingMetrics[]) => void;
  clearMetrics: () => void;
  setMetricsBufferSize: (size: number) => void;

  // Configuration
  setDraftConfig: (config: TrainingConfig | null) => void;
  updateDraftConfig: (update: Partial<TrainingConfig>) => void;
  setSelectedAlgorithm: (algorithm: Algorithm) => void;
  setIsConfiguring: (configuring: boolean) => void;
  setShowAdvancedOptions: (show: boolean) => void;

  // Chart
  setChartConfigs: (configs: ChartConfig[]) => void;
  toggleChartMetric: (metric: string) => void;
  setChartTimeWindow: (steps: number) => void;

  // WebSocket
  setWsConnected: (connected: boolean) => void;

  // Reset
  resetTrainingState: () => void;
}

/** Default chart configurations */
const DEFAULT_CHART_CONFIGS: ChartConfig[] = [
  { metric: 'episode_reward', label: 'Episode Reward', color: '#3b82f6', visible: true },
  { metric: 'policy_loss', label: 'Policy Loss', color: '#ef4444', visible: true },
  { metric: 'value_loss', label: 'Value Loss', color: '#f59e0b', visible: true },
  { metric: 'entropy', label: 'Entropy', color: '#10b981', visible: false },
  { metric: 'kl', label: 'KL Divergence', color: '#8b5cf6', visible: false },
  { metric: 'explained_variance', label: 'Explained Variance', color: '#ec4899', visible: false },
];

/** Default training config */
const DEFAULT_TRAINING_CONFIG: TrainingConfig = {
  algorithm: 'ppo',
  ppo: {
    learning_rate: 3e-4,
    gamma: 0.99,
    gae_lambda: 0.95,
    clip_range: 0.2,
    entropy_coef: 0.01,
    value_coef: 0.5,
    max_grad_norm: 0.5,
    n_steps: 2048,
    n_epochs: 10,
    batch_size: 64,
    normalize_advantage: true,
  },
};

/** Create initial state */
function createInitialState(): TrainingState {
  return {
    activeRunId: null,
    activeRun: null,
    runs: new Map(),
    metricsBuffer: [],
    metricsBufferSize: 10000,
    latestMetrics: null,
    draftConfig: { ...DEFAULT_TRAINING_CONFIG },
    selectedAlgorithm: 'ppo',
    isConfiguring: false,
    showAdvancedOptions: false,
    chartConfigs: [...DEFAULT_CHART_CONFIGS],
    chartTimeWindow: 1000,
    wsConnected: false,
  };
}

/** Training store */
export const useTrainingStore = create<TrainingState & TrainingActions>()(
  immer((set) => ({
    ...createInitialState(),

    // Run management
    setActiveRun: (run) =>
      set((state) => {
        state.activeRun = run;
        state.activeRunId = run?.id ?? null;
        if (run) {
          state.runs.set(run.id, run);
        }
      }),

    updateRun: (runId, update) =>
      set((state) => {
        const existing = state.runs.get(runId);
        if (existing) {
          state.runs.set(runId, { ...existing, ...update });
          if (state.activeRunId === runId && state.activeRun) {
            Object.assign(state.activeRun, update);
          }
        }
      }),

    addRun: (run) =>
      set((state) => {
        state.runs.set(run.id, run);
      }),

    removeRun: (runId) =>
      set((state) => {
        state.runs.delete(runId);
        if (state.activeRunId === runId) {
          state.activeRunId = null;
          state.activeRun = null;
        }
      }),

    clearRuns: () =>
      set((state) => {
        state.runs.clear();
        state.activeRunId = null;
        state.activeRun = null;
      }),

    // Metrics
    addMetrics: (metrics) =>
      set((state) => {
        const metricsArray = Array.isArray(metrics) ? metrics : [metrics];

        for (const m of metricsArray) {
          const dataPoint: MetricsDataPoint = {
            step: m.step,
            timestamp: m.timestamp ? new Date(m.timestamp).getTime() : Date.now(),
            policy_loss: m.policy_loss,
            value_loss: m.value_loss,
            kl: m.kl,
            entropy: m.entropy,
            explained_variance: m.explained_variance,
            episode_reward: m.episode_reward,
            episode_length: m.episode_length,
          };

          state.metricsBuffer.push(dataPoint);
          state.latestMetrics = m;
        }

        // Trim buffer if too large
        if (state.metricsBuffer.length > state.metricsBufferSize) {
          state.metricsBuffer = state.metricsBuffer.slice(-state.metricsBufferSize);
        }
      }),

    clearMetrics: () =>
      set((state) => {
        state.metricsBuffer = [];
        state.latestMetrics = null;
      }),

    setMetricsBufferSize: (size) =>
      set((state) => {
        state.metricsBufferSize = size;
        if (state.metricsBuffer.length > size) {
          state.metricsBuffer = state.metricsBuffer.slice(-size);
        }
      }),

    // Configuration
    setDraftConfig: (config) =>
      set((state) => {
        state.draftConfig = config;
      }),

    updateDraftConfig: (update) =>
      set((state) => {
        if (state.draftConfig) {
          Object.assign(state.draftConfig, update);
        }
      }),

    setSelectedAlgorithm: (algorithm) =>
      set((state) => {
        state.selectedAlgorithm = algorithm;
        if (state.draftConfig) {
          state.draftConfig.algorithm = algorithm;
        }
      }),

    setIsConfiguring: (configuring) =>
      set((state) => {
        state.isConfiguring = configuring;
      }),

    setShowAdvancedOptions: (show) =>
      set((state) => {
        state.showAdvancedOptions = show;
      }),

    // Chart
    setChartConfigs: (configs) =>
      set((state) => {
        state.chartConfigs = configs;
      }),

    toggleChartMetric: (metric) =>
      set((state) => {
        const config = state.chartConfigs.find((c: ChartConfig) => c.metric === metric);
        if (config) {
          config.visible = !config.visible;
        }
      }),

    setChartTimeWindow: (steps) =>
      set((state) => {
        state.chartTimeWindow = steps;
      }),

    // WebSocket
    setWsConnected: (connected) =>
      set((state) => {
        state.wsConnected = connected;
      }),

    // Reset
    resetTrainingState: () =>
      set(() => createInitialState()),
  }))
);

// Selector hooks
export const useActiveRun = () => useTrainingStore((state) => state.activeRun);
export const useMetricsBuffer = () => useTrainingStore((state) => state.metricsBuffer);
export const useLatestMetrics = () => useTrainingStore((state) => state.latestMetrics);
export const useDraftConfig = () => useTrainingStore((state) => state.draftConfig);
export const useChartConfigs = () =>
  useTrainingStore((state) => state.chartConfigs.filter((c) => c.visible));
export const useTrainingWsStatus = () => useTrainingStore((state) => state.wsConnected);

/** Get metrics for charting (within time window) */
export const useChartMetrics = () => {
  const buffer = useTrainingStore((state) => state.metricsBuffer);
  const timeWindow = useTrainingStore((state) => state.chartTimeWindow);

  if (buffer.length === 0) return [];

  const lastItem = buffer[buffer.length - 1];
  if (!lastItem) return [];
  const latestStep = lastItem.step;
  const minStep = latestStep - timeWindow;

  return buffer.filter((m) => m.step >= minStep);
};
