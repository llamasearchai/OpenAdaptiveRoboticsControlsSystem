/**
 * Training TanStack Query hooks.
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import type {
  StartTrainingRequest,
  TrainingRun,
  TrainingMetrics,
  PaginationParams,
} from '@/types';
import { trainingApi } from '@/lib/api';
import { trainingKeys } from './keys';

/** Hook to list all training runs */
export function useTrainingRuns() {
  return useQuery({
    queryKey: trainingKeys.runs(),
    queryFn: async () => {
      const response = await trainingApi.listRuns();
      return response.data;
    },
  });
}

/** Hook to get a training run by ID */
export function useTrainingRun(runId: string | undefined) {
  return useQuery({
    queryKey: trainingKeys.run(runId ?? ''),
    queryFn: async () => {
      if (!runId) throw new Error('Run ID required');
      const response = await trainingApi.getRun(runId);
      return response.data;
    },
    enabled: !!runId,
    refetchInterval: (query) => {
      // Poll while training
      const data = query.state.data;
      if (data?.status === 'training') {
        return 5000; // Refetch every 5 seconds while training
      }
      return false;
    },
  });
}

/** Hook to get training metrics with pagination */
export function useTrainingMetrics(
  runId: string | undefined,
  pagination: PaginationParams = { offset: 0, limit: 100 }
) {
  return useQuery({
    queryKey: trainingKeys.metrics(runId ?? '', pagination),
    queryFn: async () => {
      if (!runId) throw new Error('Run ID required');
      const response = await trainingApi.getMetrics(runId, pagination);
      return response;
    },
    enabled: !!runId,
  });
}

/** Hook to get training metrics with infinite scroll */
export function useInfiniteTrainingMetrics(
  runId: string | undefined,
  pageSize: number = 100
) {
  return useInfiniteQuery({
    queryKey: trainingKeys.metrics(runId ?? '', { limit: pageSize }),
    queryFn: async ({ pageParam = 0 }) => {
      if (!runId) throw new Error('Run ID required');
      const response = await trainingApi.getMetrics(runId, {
        offset: pageParam,
        limit: pageSize,
      });
      return response;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.has_next) {
        return lastPage.pagination.page * lastPage.pagination.page_size + lastPage.pagination.page_size;
      }
      return undefined;
    },
    enabled: !!runId,
  });
}

/** Hook to create a training run */
export function useCreateTrainingRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: StartTrainingRequest) => {
      const response = await trainingApi.createRun(request);
      return response.data;
    },
    onSuccess: (run) => {
      // Add to runs list
      queryClient.setQueryData(
        trainingKeys.runs(),
        (old: TrainingRun[] | undefined) => (old ? [...old, run] : [run])
      );
      // Set individual run cache
      queryClient.setQueryData(trainingKeys.run(run.id), run);
    },
  });
}

/** Hook to start a training run */
export function useStartTrainingRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (runId: string) => {
      const response = await trainingApi.startRun(runId);
      return response.data;
    },
    onSuccess: (run) => {
      // Update run in cache
      queryClient.setQueryData(trainingKeys.run(run.id), run);
      // Update in list
      queryClient.setQueryData(
        trainingKeys.runs(),
        (old: TrainingRun[] | undefined) =>
          old?.map((r) => (r.id === run.id ? run : r)) ?? []
      );
    },
  });
}

/** Hook to stop a training run */
export function useStopTrainingRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (runId: string) => {
      const response = await trainingApi.stopRun(runId);
      return response.data;
    },
    onSuccess: (run) => {
      // Update run in cache
      queryClient.setQueryData(trainingKeys.run(run.id), run);
      // Update in list
      queryClient.setQueryData(
        trainingKeys.runs(),
        (old: TrainingRun[] | undefined) =>
          old?.map((r) => (r.id === run.id ? run : r)) ?? []
      );
    },
  });
}

/** Hook to delete a training run */
export function useDeleteTrainingRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (runId: string) => {
      await trainingApi.deleteRun(runId);
      return runId;
    },
    onSuccess: (runId) => {
      // Remove from list
      queryClient.setQueryData(
        trainingKeys.runs(),
        (old: TrainingRun[] | undefined) =>
          old?.filter((r) => r.id !== runId) ?? []
      );
      // Remove individual cache
      queryClient.removeQueries({ queryKey: trainingKeys.run(runId) });
    },
  });
}

/** Prefetch training run */
export function usePrefetchTrainingRun() {
  const queryClient = useQueryClient();

  return async (runId: string) => {
    await queryClient.prefetchQuery({
      queryKey: trainingKeys.run(runId),
      queryFn: async () => {
        const response = await trainingApi.getRun(runId);
        return response.data;
      },
    });
  };
}

/** Update training run in cache (for WebSocket updates) */
export function useUpdateTrainingRunCache() {
  const queryClient = useQueryClient();

  return (run: TrainingRun) => {
    queryClient.setQueryData(trainingKeys.run(run.id), run);
    queryClient.setQueryData(
      trainingKeys.runs(),
      (old: TrainingRun[] | undefined) =>
        old?.map((r) => (r.id === run.id ? run : r)) ?? []
    );
  };
}

/** Add metrics to cache (for WebSocket updates) */
export function useAddMetricsToCache() {
  const queryClient = useQueryClient();

  return (runId: string, _metrics: TrainingMetrics[]) => {
    // This is a simplified approach - in production, you'd want to
    // properly merge with existing paginated data
    queryClient.invalidateQueries({
      queryKey: trainingKeys.metrics(runId, {}),
    });
  };
}

/** Invalidate all training queries */
export function useInvalidateTrainingQueries() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: trainingKeys.all });
  };
}
