/**
 * Safety TanStack Query hooks.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  SafetyConfig,
  SafetyFilterRequest,
} from '@/types';
import { safetyApi } from '@/lib/api';
import { safetyKeys } from './keys';

/** Hook to get safety status */
export function useSafetyStatus() {
  return useQuery({
    queryKey: safetyKeys.status(),
    queryFn: async () => {
      const response = await safetyApi.getStatus();
      return response.data;
    },
    refetchInterval: 5000, // Periodically check status
  });
}

/** Hook to configure safety filter */
export function useConfigureSafety() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: SafetyConfig) => {
      const response = await safetyApi.configure(config);
      return response.data;
    },
    onSuccess: (status) => {
      queryClient.setQueryData(safetyKeys.status(), status);
    },
  });
}

/** Hook to disable safety filter */
export function useDisableSafety() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await safetyApi.disable();
      return response.data;
    },
    onSuccess: (status) => {
      queryClient.setQueryData(safetyKeys.status(), status);
    },
  });
}

/** Hook to filter an action through safety */
export function useFilterAction() {
  return useMutation({
    mutationFn: async (request: SafetyFilterRequest) => {
      const response = await safetyApi.filterAction(request);
      return response.data;
    },
  });
}

/** Hook to reset safety statistics */
export function useResetSafetyStats() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await safetyApi.resetStats();
      return response.data;
    },
    onSuccess: (status) => {
      queryClient.setQueryData(safetyKeys.status(), status);
    },
  });
}

/** Hook for real-time action filtering */
export function useRealTimeSafetyFilter() {
  const filterMutation = useFilterAction();

  const filterAction = async (
    action: number[],
    jointPos: number[],
    jointVel?: number[],
    eePos?: [number, number, number]
  ) => {
    const request: SafetyFilterRequest = {
      action,
      joint_pos: jointPos,
    };
    if (jointVel) request.joint_vel = jointVel;
    if (eePos) request.ee_pos = eePos;
    return filterMutation.mutateAsync(request);
  };

  return {
    filterAction,
    data: filterMutation.data,
    isLoading: filterMutation.isPending,
    error: filterMutation.error,
    wasClipped: filterMutation.data
      ? filterMutation.data.clipped_joints.length > 0
      : false,
  };
}

/** Invalidate all safety queries */
export function useInvalidateSafetyQueries() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: safetyKeys.all });
  };
}
