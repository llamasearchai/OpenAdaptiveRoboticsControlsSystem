/**
 * Simulation store for simulation session state.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  SimulationSession,
  SimulationConfig,
  Observation,
  SimulationState as SimState,
  StepInfo,
} from '@/types';

/** Step history entry */
export interface StepHistoryEntry {
  step: number;
  timestamp: number;
  observation: Observation;
  action: number[];
  reward: number;
  terminated: boolean;
  truncated: boolean;
  info?: StepInfo;
}

/** Episode statistics */
export interface EpisodeStats {
  episodeNumber: number;
  totalReward: number;
  length: number;
  success?: boolean;
  startTime: number;
  endTime?: number;
}

/** Simulation store state */
export interface SimulationStoreState {
  // Active session
  activeSessionId: string | null;
  activeSession: SimulationSession | null;

  // All sessions
  sessions: Map<string, SimulationSession>;

  // Current state
  currentObservation: Observation | null;
  currentState: SimState | null;

  // Step history (ring buffer)
  stepHistory: StepHistoryEntry[];
  stepHistorySize: number;

  // Episode tracking
  currentEpisode: number;
  episodeStats: EpisodeStats[];
  currentEpisodeReward: number;
  currentEpisodeLength: number;

  // Configuration
  draftConfig: SimulationConfig | null;

  // Control state
  isSteppingSingle: boolean;
  isRunningLoop: boolean;
  stepDelay: number; // ms between steps in loop mode
  autoReset: boolean;

  // WebSocket
  wsConnected: boolean;

  // Performance
  stepsPerSecond: number;
  lastStepTime: number;
}

/** Simulation store actions */
export interface SimulationStoreActions {
  // Session management
  setActiveSession: (session: SimulationSession | null) => void;
  updateSession: (sessionId: string, update: Partial<SimulationSession>) => void;
  addSession: (session: SimulationSession) => void;
  removeSession: (sessionId: string) => void;
  clearSessions: () => void;

  // State updates
  setCurrentObservation: (observation: Observation | null) => void;
  setCurrentState: (state: SimState | null) => void;

  // Step history
  addStepToHistory: (entry: Omit<StepHistoryEntry, 'step' | 'timestamp'>) => void;
  clearStepHistory: () => void;
  setStepHistorySize: (size: number) => void;

  // Episode tracking
  startNewEpisode: () => void;
  endCurrentEpisode: (success?: boolean) => void;
  addReward: (reward: number) => void;
  resetEpisodeStats: () => void;

  // Configuration
  setDraftConfig: (config: SimulationConfig | null) => void;
  updateDraftConfig: (update: Partial<SimulationConfig>) => void;

  // Control
  setIsSteppingSingle: (stepping: boolean) => void;
  setIsRunningLoop: (running: boolean) => void;
  setStepDelay: (delay: number) => void;
  setAutoReset: (autoReset: boolean) => void;

  // WebSocket
  setWsConnected: (connected: boolean) => void;

  // Performance
  updateStepsPerSecond: () => void;

  // Reset
  resetSimulationState: () => void;
}

/** Default simulation config */
const DEFAULT_SIM_CONFIG: SimulationConfig = {
  task: 'reach',
  backend: 'mujoco',
  num_envs: 1,
  device: 'cpu',
  render: true,
};

/** Create initial state */
function createInitialState(): SimulationStoreState {
  return {
    activeSessionId: null,
    activeSession: null,
    sessions: new Map(),
    currentObservation: null,
    currentState: null,
    stepHistory: [],
    stepHistorySize: 1000,
    currentEpisode: 0,
    episodeStats: [],
    currentEpisodeReward: 0,
    currentEpisodeLength: 0,
    draftConfig: { ...DEFAULT_SIM_CONFIG },
    isSteppingSingle: false,
    isRunningLoop: false,
    stepDelay: 50,
    autoReset: true,
    wsConnected: false,
    stepsPerSecond: 0,
    lastStepTime: 0,
  };
}

/** Simulation store */
export const useSimulationStore = create<SimulationStoreState & SimulationStoreActions>()(
  immer((set) => ({
    ...createInitialState(),

    // Session management
    setActiveSession: (session) =>
      set((state) => {
        state.activeSession = session;
        state.activeSessionId = session?.id ?? null;
        if (session) {
          state.sessions.set(session.id, session);
        }
        // Clear state when changing session
        state.currentObservation = null;
        state.currentState = null;
        state.stepHistory = [];
        state.currentEpisodeReward = 0;
        state.currentEpisodeLength = 0;
      }),

    updateSession: (sessionId, update) =>
      set((state) => {
        const existing = state.sessions.get(sessionId);
        if (existing) {
          state.sessions.set(sessionId, { ...existing, ...update });
          if (state.activeSessionId === sessionId && state.activeSession) {
            Object.assign(state.activeSession, update);
          }
        }
      }),

    addSession: (session) =>
      set((state) => {
        state.sessions.set(session.id, session);
      }),

    removeSession: (sessionId) =>
      set((state) => {
        state.sessions.delete(sessionId);
        if (state.activeSessionId === sessionId) {
          state.activeSessionId = null;
          state.activeSession = null;
          state.currentObservation = null;
          state.currentState = null;
        }
      }),

    clearSessions: () =>
      set((state) => {
        state.sessions.clear();
        state.activeSessionId = null;
        state.activeSession = null;
        state.currentObservation = null;
        state.currentState = null;
      }),

    // State updates
    setCurrentObservation: (observation) =>
      set((state) => {
        state.currentObservation = observation;
      }),

    setCurrentState: (simState) =>
      set((state) => {
        state.currentState = simState;
      }),

    // Step history
    addStepToHistory: (entry) =>
      set((state) => {
        const now = Date.now();
        const step = state.stepHistory.length > 0
          ? state.stepHistory[state.stepHistory.length - 1].step + 1
          : 0;

        state.stepHistory.push({
          ...entry,
          step,
          timestamp: now,
        });

        // Trim if too large
        if (state.stepHistory.length > state.stepHistorySize) {
          state.stepHistory = state.stepHistory.slice(-state.stepHistorySize);
        }

        // Update episode tracking
        state.currentEpisodeReward += entry.reward;
        state.currentEpisodeLength += 1;
        state.currentObservation = entry.observation;

        // Update steps per second
        if (state.lastStepTime > 0) {
          const dt = (now - state.lastStepTime) / 1000;
          if (dt > 0) {
            state.stepsPerSecond = 1 / dt;
          }
        }
        state.lastStepTime = now;
      }),

    clearStepHistory: () =>
      set((state) => {
        state.stepHistory = [];
      }),

    setStepHistorySize: (size) =>
      set((state) => {
        state.stepHistorySize = size;
        if (state.stepHistory.length > size) {
          state.stepHistory = state.stepHistory.slice(-size);
        }
      }),

    // Episode tracking
    startNewEpisode: () =>
      set((state) => {
        state.currentEpisode += 1;
        state.currentEpisodeReward = 0;
        state.currentEpisodeLength = 0;
        state.episodeStats.push({
          episodeNumber: state.currentEpisode,
          totalReward: 0,
          length: 0,
          startTime: Date.now(),
        });
      }),

    endCurrentEpisode: (success) =>
      set((state) => {
        const currentStats = state.episodeStats[state.episodeStats.length - 1];
        if (currentStats) {
          currentStats.totalReward = state.currentEpisodeReward;
          currentStats.length = state.currentEpisodeLength;
          currentStats.success = success;
          currentStats.endTime = Date.now();
        }
      }),

    addReward: (reward) =>
      set((state) => {
        state.currentEpisodeReward += reward;
      }),

    resetEpisodeStats: () =>
      set((state) => {
        state.currentEpisode = 0;
        state.episodeStats = [];
        state.currentEpisodeReward = 0;
        state.currentEpisodeLength = 0;
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

    // Control
    setIsSteppingSingle: (stepping) =>
      set((state) => {
        state.isSteppingSingle = stepping;
      }),

    setIsRunningLoop: (running) =>
      set((state) => {
        state.isRunningLoop = running;
      }),

    setStepDelay: (delay) =>
      set((state) => {
        state.stepDelay = Math.max(0, delay);
      }),

    setAutoReset: (autoReset) =>
      set((state) => {
        state.autoReset = autoReset;
      }),

    // WebSocket
    setWsConnected: (connected) =>
      set((state) => {
        state.wsConnected = connected;
      }),

    // Performance
    updateStepsPerSecond: () =>
      set((state) => {
        const now = Date.now();
        if (state.lastStepTime > 0) {
          const dt = (now - state.lastStepTime) / 1000;
          if (dt > 0) {
            state.stepsPerSecond = 1 / dt;
          }
        }
        state.lastStepTime = now;
      }),

    // Reset
    resetSimulationState: () =>
      set(() => createInitialState()),
  }))
);

// Selector hooks
export const useActiveSimSession = () => useSimulationStore((state) => state.activeSession);
export const useCurrentObservation = () => useSimulationStore((state) => state.currentObservation);
export const useStepHistory = () => useSimulationStore((state) => state.stepHistory);
export const useEpisodeStats = () => useSimulationStore((state) => state.episodeStats);
export const useSimulationControl = () =>
  useSimulationStore((state) => ({
    isSteppingSingle: state.isSteppingSingle,
    isRunningLoop: state.isRunningLoop,
    stepDelay: state.stepDelay,
    autoReset: state.autoReset,
    stepsPerSecond: state.stepsPerSecond,
  }));
export const useSimWsStatus = () => useSimulationStore((state) => state.wsConnected);
