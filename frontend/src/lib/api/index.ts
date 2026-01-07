/**
 * API client exports.
 */

// Core client
export { ApiClient, getApiClient, createApiClient, resetApiClient } from './client';

// Error classes and utilities
export {
  ApiError,
  NetworkError,
  TimeoutError,
  AbortError,
  WebSocketError,
  isApiError,
  isNetworkError,
  isTimeoutError,
  isAbortError,
  isWebSocketError,
  getErrorMessage,
} from './errors';

// Endpoints
export { ENDPOINTS, SIMULATION, TRAINING, KINEMATICS, DATASETS, SAFETY, HEALTH, WS } from './endpoints';
export type { Endpoints } from './endpoints';

// Domain API clients
export { simulationApi } from './simulation';
export { trainingApi } from './training';
export { kinematicsApi } from './kinematics';
export { datasetsApi } from './datasets';
export { safetyApi } from './safety';

// WebSocket client
export {
  WebSocketClient,
  createSimulationWebSocket,
  createTrainingWebSocket,
} from './websocket';
export type { WebSocketHandlers, WebSocketClientOptions } from './websocket';
