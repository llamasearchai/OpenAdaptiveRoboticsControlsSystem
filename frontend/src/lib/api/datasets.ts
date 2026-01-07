/**
 * Datasets API client methods.
 */

import type {
  ApiResponse,
  DatasetSummary,
  DatasetListResponse,
  DatasetStatistics,
  ProcessDatasetRequest,
  PaginationParams,
} from '@/types';
import { getApiClient } from './client';
import { DATASETS } from './endpoints';

/** Datasets API client */
export const datasetsApi = {
  /** List all datasets */
  async listDatasets(
    pagination: PaginationParams = {}
  ): Promise<ApiResponse<DatasetListResponse>> {
    const client = getApiClient();
    return client.get<ApiResponse<DatasetListResponse>>(DATASETS.LIST, {
      params: {
        offset: pagination.offset,
        limit: pagination.limit,
      },
    });
  },

  /** Get a dataset by ID */
  async getDataset(datasetId: string): Promise<ApiResponse<DatasetSummary>> {
    const client = getApiClient();
    return client.get<ApiResponse<DatasetSummary>>(DATASETS.GET(datasetId));
  },

  /** Register an existing dataset file */
  async registerDataset(
    path: string,
    name?: string
  ): Promise<ApiResponse<DatasetSummary>> {
    const client = getApiClient();
    return client.post<ApiResponse<DatasetSummary>>(DATASETS.REGISTER, {
      params: {
        path,
        name,
      },
    });
  },

  /** Unregister a dataset (does not delete file) */
  async unregisterDataset(datasetId: string): Promise<void> {
    const client = getApiClient();
    await client.delete(DATASETS.UNREGISTER(datasetId));
  },

  /** Get dataset statistics */
  async getStatistics(
    datasetId: string
  ): Promise<ApiResponse<DatasetStatistics>> {
    const client = getApiClient();
    return client.get<ApiResponse<DatasetStatistics>>(
      DATASETS.STATISTICS(datasetId)
    );
  },

  /** Process/filter a dataset */
  async processDataset(
    datasetId: string,
    request: ProcessDatasetRequest
  ): Promise<ApiResponse<DatasetSummary>> {
    const client = getApiClient();
    return client.post<ApiResponse<DatasetSummary>>(
      DATASETS.PROCESS(datasetId),
      { body: request }
    );
  },
};

export default datasetsApi;
