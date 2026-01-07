/**
 * Simulation API client methods.
 */

import type {
  ApiResponse,
  SimulationConfig,
  SimulationSession,
  StepRequest,
  StepResponse,
  ResetRequest,
  ObservationResponse,
  StateResponse,
} from '@/types';
import { getApiClient } from './client';
import { SIMULATION } from './endpoints';

/** Simulation API client */
export const simulationApi = {
  /** Create a new simulation session */
  async createSession(
    config: SimulationConfig
  ): Promise<ApiResponse<SimulationSession>> {
    const client = getApiClient();
    return client.post<ApiResponse<SimulationSession>>(SIMULATION.SESSIONS, {
      body: config,
    });
  },

  /** List all simulation sessions */
  async listSessions(): Promise<ApiResponse<SimulationSession[]>> {
    const client = getApiClient();
    return client.get<ApiResponse<SimulationSession[]>>(SIMULATION.SESSIONS);
  },

  /** Get a simulation session by ID */
  async getSession(sessionId: string): Promise<ApiResponse<SimulationSession>> {
    const client = getApiClient();
    return client.get<ApiResponse<SimulationSession>>(
      SIMULATION.SESSION(sessionId)
    );
  },

  /** Delete a simulation session */
  async deleteSession(sessionId: string): Promise<void> {
    const client = getApiClient();
    await client.delete(SIMULATION.SESSION(sessionId));
  },

  /** Step the simulation */
  async step(
    sessionId: string,
    request: StepRequest
  ): Promise<ApiResponse<StepResponse>> {
    const client = getApiClient();
    return client.post<ApiResponse<StepResponse>>(SIMULATION.STEP(sessionId), {
      body: request,
    });
  },

  /** Reset the simulation */
  async reset(
    sessionId: string,
    request: ResetRequest = {}
  ): Promise<ApiResponse<ObservationResponse>> {
    const client = getApiClient();
    return client.post<ApiResponse<ObservationResponse>>(
      SIMULATION.RESET(sessionId),
      { body: request }
    );
  },

  /** Get current simulation state */
  async getState(sessionId: string): Promise<ApiResponse<StateResponse>> {
    const client = getApiClient();
    return client.get<ApiResponse<StateResponse>>(SIMULATION.STATE(sessionId));
  },

  /** Get current observation */
  async getObservation(
    sessionId: string
  ): Promise<ApiResponse<ObservationResponse>> {
    const client = getApiClient();
    return client.get<ApiResponse<ObservationResponse>>(
      SIMULATION.OBSERVATION(sessionId)
    );
  },
};

export default simulationApi;
