/**
 * Simulation TanStack Query hooks.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  SimulationConfig,
  SimulationSession,
  StepRequest,
  ResetRequest,
} from '@/types';
import { simulationApi } from '@/lib/api';
import { simulationKeys } from './keys';

/** Hook to list all simulation sessions */
export function useSimulationSessions() {
  return useQuery({
    queryKey: simulationKeys.sessions(),
    queryFn: async () => {
      const response = await simulationApi.listSessions();
      return response.data;
    },
  });
}

/** Hook to get a simulation session by ID */
export function useSimulationSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: simulationKeys.session(sessionId ?? ''),
    queryFn: async () => {
      if (!sessionId) throw new Error('Session ID required');
      const response = await simulationApi.getSession(sessionId);
      return response.data;
    },
    enabled: !!sessionId,
  });
}

/** Hook to get simulation state */
export function useSimulationState(sessionId: string | undefined) {
  return useQuery({
    queryKey: simulationKeys.state(sessionId ?? ''),
    queryFn: async () => {
      if (!sessionId) throw new Error('Session ID required');
      const response = await simulationApi.getState(sessionId);
      return response.data;
    },
    enabled: !!sessionId,
    refetchInterval: false, // Use WebSocket for real-time updates
  });
}

/** Hook to get current observation */
export function useSimulationObservation(sessionId: string | undefined) {
  return useQuery({
    queryKey: simulationKeys.observation(sessionId ?? ''),
    queryFn: async () => {
      if (!sessionId) throw new Error('Session ID required');
      const response = await simulationApi.getObservation(sessionId);
      return response.data;
    },
    enabled: !!sessionId,
    refetchInterval: false, // Use WebSocket for real-time updates
  });
}

/** Hook to create a simulation session */
export function useCreateSimulationSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: SimulationConfig) => {
      const response = await simulationApi.createSession(config);
      return response.data;
    },
    onSuccess: (session) => {
      // Add to sessions list cache
      queryClient.setQueryData(
        simulationKeys.sessions(),
        (old: SimulationSession[] | undefined) =>
          old ? [...old, session] : [session]
      );
      // Set individual session cache
      queryClient.setQueryData(simulationKeys.session(session.id), session);
    },
  });
}

/** Hook to delete a simulation session */
export function useDeleteSimulationSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      await simulationApi.deleteSession(sessionId);
      return sessionId;
    },
    onSuccess: (sessionId) => {
      // Remove from sessions list
      queryClient.setQueryData(
        simulationKeys.sessions(),
        (old: SimulationSession[] | undefined) =>
          old?.filter((s) => s.id !== sessionId) ?? []
      );
      // Remove individual session cache
      queryClient.removeQueries({ queryKey: simulationKeys.session(sessionId) });
    },
  });
}

/** Hook to step the simulation */
export function useStepSimulation(sessionId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: StepRequest) => {
      if (!sessionId) throw new Error('Session ID required');
      const response = await simulationApi.step(sessionId, request);
      return response.data;
    },
    onSuccess: (data) => {
      if (!sessionId) return;

      // Update observation cache
      queryClient.setQueryData(
        simulationKeys.observation(sessionId),
        data.observation
      );

      // Update session step count
      queryClient.setQueryData(
        simulationKeys.session(sessionId),
        (old: SimulationSession | undefined) =>
          old ? { ...old, current_step: old.current_step + 1 } : old
      );
    },
  });
}

/** Hook to reset the simulation */
export function useResetSimulation(sessionId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: ResetRequest = {}) => {
      if (!sessionId) throw new Error('Session ID required');
      const response = await simulationApi.reset(sessionId, request);
      return response.data;
    },
    onSuccess: (observation) => {
      if (!sessionId) return;

      // Update observation cache
      queryClient.setQueryData(simulationKeys.observation(sessionId), observation);

      // Reset session step count
      queryClient.setQueryData(
        simulationKeys.session(sessionId),
        (old: SimulationSession | undefined) =>
          old ? { ...old, current_step: 0 } : old
      );

      // Invalidate state
      queryClient.invalidateQueries({ queryKey: simulationKeys.state(sessionId) });
    },
  });
}

/** Prefetch simulation session */
export function usePrefetchSimulationSession() {
  const queryClient = useQueryClient();

  return async (sessionId: string) => {
    await queryClient.prefetchQuery({
      queryKey: simulationKeys.session(sessionId),
      queryFn: async () => {
        const response = await simulationApi.getSession(sessionId);
        return response.data;
      },
    });
  };
}

/** Invalidate all simulation queries */
export function useInvalidateSimulationQueries() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: simulationKeys.all });
  };
}
