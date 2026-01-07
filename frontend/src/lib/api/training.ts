/**
 * Training API client methods.
 */

import type {
  ApiResponse,
  PaginatedResponse,
  StartTrainingRequest,
  TrainingRun,
  TrainingMetrics,
  PaginationParams,
} from '@/types';
import { getApiClient } from './client';
import { TRAINING } from './endpoints';

/** Training run response type */
export type TrainingRunResponse = TrainingRun;

/** Training metrics response type */
export type TrainingMetricsResponse = TrainingMetrics;

/** Training API client */
export const trainingApi = {
  /** Create a new training run */
  async createRun(
    request: StartTrainingRequest
  ): Promise<ApiResponse<TrainingRunResponse>> {
    const client = getApiClient();
    return client.post<ApiResponse<TrainingRunResponse>>(TRAINING.RUNS, {
      body: request,
    });
  },

  /** List all training runs */
  async listRuns(): Promise<ApiResponse<TrainingRunResponse[]>> {
    const client = getApiClient();
    return client.get<ApiResponse<TrainingRunResponse[]>>(TRAINING.RUNS);
  },

  /** Get a training run by ID */
  async getRun(runId: string): Promise<ApiResponse<TrainingRunResponse>> {
    const client = getApiClient();
    return client.get<ApiResponse<TrainingRunResponse>>(TRAINING.RUN(runId));
  },

  /** Start a training run */
  async startRun(runId: string): Promise<ApiResponse<TrainingRunResponse>> {
    const client = getApiClient();
    return client.post<ApiResponse<TrainingRunResponse>>(TRAINING.START(runId));
  },

  /** Stop a training run */
  async stopRun(runId: string): Promise<ApiResponse<TrainingRunResponse>> {
    const client = getApiClient();
    return client.post<ApiResponse<TrainingRunResponse>>(TRAINING.STOP(runId));
  },

  /** Delete a training run */
  async deleteRun(runId: string): Promise<void> {
    const client = getApiClient();
    await client.delete(TRAINING.RUN(runId));
  },

  /** Get training metrics with pagination */
  async getMetrics(
    runId: string,
    pagination: PaginationParams = {}
  ): Promise<PaginatedResponse<TrainingMetricsResponse>> {
    const client = getApiClient();
    return client.get<PaginatedResponse<TrainingMetricsResponse>>(
      TRAINING.METRICS(runId),
      {
        params: {
          offset: pagination.offset,
          limit: pagination.limit,
        },
      }
    );
  },
};

export default trainingApi;
