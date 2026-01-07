/**
 * Connection store for WebSocket and API connection state.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ConnectionState } from '@/types';

/** API health status */
export type HealthStatus = 'unknown' | 'healthy' | 'degraded' | 'unhealthy';

/** Service status */
export interface ServiceStatus {
  name: string;
  status: 'up' | 'down' | 'unknown';
  latency?: number;
  lastChecked?: number;
  error?: string;
}

/** WebSocket connection info */
export interface WebSocketConnection {
  id: string;
  type: 'simulation' | 'training';
  resourceId: string;
  state: ConnectionState;
  connectedAt?: number;
  lastMessage?: number;
  reconnectAttempts: number;
}

/** Connection store state */
export interface ConnectionStoreState {
  // API health
  apiHealthStatus: HealthStatus;
  apiVersion: string | undefined;
  lastHealthCheck: number | undefined;
  services: ServiceStatus[];

  // WebSocket connections
  wsConnections: Map<string, WebSocketConnection>;

  // Reconnection
  autoReconnect: boolean;
  reconnectDelay: number;
  maxReconnectAttempts: number;

  // Network status
  isOnline: boolean;
  lastOnlineChange: number | undefined;
}

/** Connection store actions */
export interface ConnectionStoreActions {
  // API health
  setApiHealthStatus: (status: HealthStatus, version?: string) => void;
  setServiceStatus: (name: string, status: ServiceStatus) => void;
  updateLastHealthCheck: () => void;

  // WebSocket connections
  addWsConnection: (connection: Omit<WebSocketConnection, 'reconnectAttempts'>) => void;
  updateWsConnection: (id: string, update: Partial<WebSocketConnection>) => void;
  removeWsConnection: (id: string) => void;
  setWsConnectionState: (id: string, state: ConnectionState) => void;
  incrementReconnectAttempts: (id: string) => void;
  resetReconnectAttempts: (id: string) => void;

  // Reconnection settings
  setAutoReconnect: (enabled: boolean) => void;
  setReconnectDelay: (delay: number) => void;
  setMaxReconnectAttempts: (max: number) => void;

  // Network status
  setIsOnline: (online: boolean) => void;

  // Bulk operations
  disconnectAll: () => void;
  clearAllConnections: () => void;

  // Reset
  resetConnectionState: () => void;
}

/** Create initial state */
function createInitialState(): ConnectionStoreState {
  return {
    apiHealthStatus: 'unknown',
    apiVersion: undefined,
    lastHealthCheck: undefined,
    services: [],
    wsConnections: new Map(),
    autoReconnect: true,
    reconnectDelay: 1000,
    maxReconnectAttempts: 10,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastOnlineChange: undefined,
  };
}

/** Connection store */
export const useConnectionStore = create<ConnectionStoreState & ConnectionStoreActions>()(
  immer((set) => ({
    ...createInitialState(),

    // API health
    setApiHealthStatus: (status, version) =>
      set((state) => {
        state.apiHealthStatus = status;
        if (version) state.apiVersion = version;
        state.lastHealthCheck = Date.now();
      }),

    setServiceStatus: (name, serviceStatus) =>
      set((state) => {
        const index = state.services.findIndex((s: ServiceStatus) => s.name === name);
        if (index >= 0) {
          state.services[index] = serviceStatus;
        } else {
          state.services.push(serviceStatus);
        }
      }),

    updateLastHealthCheck: () =>
      set((state) => {
        state.lastHealthCheck = Date.now();
      }),

    // WebSocket connections
    addWsConnection: (connection) =>
      set((state) => {
        state.wsConnections.set(connection.id, {
          ...connection,
          reconnectAttempts: 0,
        });
      }),

    updateWsConnection: (id, update) =>
      set((state) => {
        const existing = state.wsConnections.get(id);
        if (existing) {
          state.wsConnections.set(id, { ...existing, ...update });
        }
      }),

    removeWsConnection: (id) =>
      set((state) => {
        state.wsConnections.delete(id);
      }),

    setWsConnectionState: (id, connectionState) =>
      set((state) => {
        const existing = state.wsConnections.get(id);
        if (existing) {
          existing.state = connectionState;
          if (connectionState === 'connected') {
            existing.connectedAt = Date.now();
            existing.reconnectAttempts = 0;
          }
        }
      }),

    incrementReconnectAttempts: (id) =>
      set((state) => {
        const existing = state.wsConnections.get(id);
        if (existing) {
          existing.reconnectAttempts += 1;
        }
      }),

    resetReconnectAttempts: (id) =>
      set((state) => {
        const existing = state.wsConnections.get(id);
        if (existing) {
          existing.reconnectAttempts = 0;
        }
      }),

    // Reconnection settings
    setAutoReconnect: (enabled) =>
      set((state) => {
        state.autoReconnect = enabled;
      }),

    setReconnectDelay: (delay) =>
      set((state) => {
        state.reconnectDelay = Math.max(100, delay);
      }),

    setMaxReconnectAttempts: (max) =>
      set((state) => {
        state.maxReconnectAttempts = Math.max(1, max);
      }),

    // Network status
    setIsOnline: (online) =>
      set((state) => {
        state.isOnline = online;
        state.lastOnlineChange = Date.now();
      }),

    // Bulk operations
    disconnectAll: () =>
      set((state) => {
        state.wsConnections.forEach((conn: WebSocketConnection) => {
          conn.state = 'disconnected';
        });
      }),

    clearAllConnections: () =>
      set((state) => {
        state.wsConnections.clear();
      }),

    // Reset
    resetConnectionState: () =>
      set(() => createInitialState()),
  }))
);

// Selector hooks
export const useApiHealth = () =>
  useConnectionStore((state) => ({
    status: state.apiHealthStatus,
    version: state.apiVersion,
    lastCheck: state.lastHealthCheck,
  }));

export const useWsConnections = () =>
  useConnectionStore((state) => Array.from(state.wsConnections.values()));

export const useWsConnection = (id: string) =>
  useConnectionStore((state) => state.wsConnections.get(id));

export const useNetworkStatus = () =>
  useConnectionStore((state) => ({
    isOnline: state.isOnline,
    lastChange: state.lastOnlineChange,
  }));

export const useReconnectSettings = () =>
  useConnectionStore((state) => ({
    autoReconnect: state.autoReconnect,
    delay: state.reconnectDelay,
    maxAttempts: state.maxReconnectAttempts,
  }));

/** Get all connected WebSocket count */
export const useConnectedWsCount = () =>
  useConnectionStore(
    (state) => Array.from(state.wsConnections.values()).filter((c) => c.state === 'connected').length
  );
