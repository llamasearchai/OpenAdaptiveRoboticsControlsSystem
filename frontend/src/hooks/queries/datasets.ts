/**
 * Datasets TanStack Query hooks.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ProcessDatasetRequest,
  PaginationParams,
} from '@/types';
import { datasetsApi } from '@/lib/api';
import { datasetKeys } from './keys';

/** Hook to list datasets with pagination */
export function useDatasets(pagination: PaginationParams = { offset: 0, limit: 20 }) {
  return useQuery({
    queryKey: datasetKeys.list(pagination),
    queryFn: async () => {
      const response = await datasetsApi.listDatasets(pagination);
      return response.data;
    },
  });
}

/** Hook to get a dataset by ID */
export function useDataset(datasetId: string | undefined) {
  return useQuery({
    queryKey: datasetKeys.detail(datasetId ?? ''),
    queryFn: async () => {
      if (!datasetId) throw new Error('Dataset ID required');
      const response = await datasetsApi.getDataset(datasetId);
      return response.data;
    },
    enabled: !!datasetId,
  });
}

/** Hook to get dataset statistics */
export function useDatasetStatistics(datasetId: string | undefined) {
  return useQuery({
    queryKey: datasetKeys.statistics(datasetId ?? ''),
    queryFn: async () => {
      if (!datasetId) throw new Error('Dataset ID required');
      const response = await datasetsApi.getStatistics(datasetId);
      return response.data;
    },
    enabled: !!datasetId,
  });
}

/** Hook to register a dataset */
export function useRegisterDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ path, name }: { path: string; name?: string }) => {
      const response = await datasetsApi.registerDataset(path, name);
      return response.data;
    },
    onSuccess: (dataset) => {
      // Add to datasets list
      queryClient.invalidateQueries({ queryKey: datasetKeys.list() });
      // Set individual dataset cache
      queryClient.setQueryData(datasetKeys.detail(dataset.id), dataset);
    },
  });
}

/** Hook to unregister a dataset */
export function useUnregisterDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (datasetId: string) => {
      await datasetsApi.unregisterDataset(datasetId);
      return datasetId;
    },
    onSuccess: (datasetId) => {
      // Invalidate list
      queryClient.invalidateQueries({ queryKey: datasetKeys.list() });
      // Remove individual cache
      queryClient.removeQueries({ queryKey: datasetKeys.detail(datasetId) });
    },
  });
}

/** Hook to process a dataset */
export function useProcessDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      datasetId,
      request,
    }: {
      datasetId: string;
      request: ProcessDatasetRequest;
    }) => {
      const response = await datasetsApi.processDataset(datasetId, request);
      return response.data;
    },
    onSuccess: (newDataset) => {
      // Add new processed dataset to list
      queryClient.invalidateQueries({ queryKey: datasetKeys.list() });
      // Set individual dataset cache
      queryClient.setQueryData(datasetKeys.detail(newDataset.id), newDataset);
    },
  });
}

/** Prefetch dataset */
export function usePrefetchDataset() {
  const queryClient = useQueryClient();

  return async (datasetId: string) => {
    await queryClient.prefetchQuery({
      queryKey: datasetKeys.detail(datasetId),
      queryFn: async () => {
        const response = await datasetsApi.getDataset(datasetId);
        return response.data;
      },
    });
  };
}

/** Invalidate all dataset queries */
export function useInvalidateDatasetQueries() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: datasetKeys.all });
  };
}
