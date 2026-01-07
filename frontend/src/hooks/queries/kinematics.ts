/**
 * Kinematics TanStack Query hooks.
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import type {
  FKRequest,
  IKRequest,
  JacobianRequest,
  JointLimitCheckRequest,
} from '@/types';
import { kinematicsApi } from '@/lib/api';
import { kinematicsKeys } from './keys';

/** Hook to compute forward kinematics */
export function useForwardKinematics(
  jointAngles: number[] | undefined,
  options?: { urdfPath?: string; linkName?: string; enabled?: boolean }
) {
  return useQuery({
    queryKey: kinematicsKeys.fk(jointAngles ?? []),
    queryFn: async () => {
      if (!jointAngles) throw new Error('Joint angles required');
      const request: FKRequest = { joint_angles: jointAngles };
      if (options?.urdfPath) request.urdf_path = options.urdfPath;
      if (options?.linkName) request.link_name = options.linkName;
      const response = await kinematicsApi.forwardKinematics(request);
      return response.data;
    },
    enabled: (options?.enabled ?? true) && !!jointAngles && jointAngles.length > 0,
    staleTime: 0, // FK results should not be cached as they depend on real-time joint positions
  });
}

/** Hook to compute forward kinematics on demand */
export function useForwardKinematicsMutation() {
  return useMutation({
    mutationFn: async (request: FKRequest) => {
      const response = await kinematicsApi.forwardKinematics(request);
      return response.data;
    },
  });
}

/** Hook to compute inverse kinematics */
export function useInverseKinematics(
  target: { position: number[]; quaternion?: number[] } | undefined,
  options?: {
    initialJoints?: number[];
    urdfPath?: string;
    maxIterations?: number;
    tolerance?: number;
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey: kinematicsKeys.ik(target ?? { position: [] }),
    queryFn: async () => {
      if (!target) throw new Error('Target position required');
      const request: IKRequest = { target_position: target.position as [number, number, number] };
      if (target.quaternion) request.target_quaternion = target.quaternion as [number, number, number, number];
      if (options?.initialJoints) request.initial_joints = options.initialJoints;
      if (options?.urdfPath) request.urdf_path = options.urdfPath;
      if (options?.maxIterations !== undefined) request.max_iterations = options.maxIterations;
      if (options?.tolerance !== undefined) request.tolerance = options.tolerance;
      const response = await kinematicsApi.inverseKinematics(request);
      return response.data;
    },
    enabled: (options?.enabled ?? true) && !!target && target.position.length === 3,
    staleTime: 0,
  });
}

/** Hook to compute inverse kinematics on demand */
export function useInverseKinematicsMutation() {
  return useMutation({
    mutationFn: async (request: IKRequest) => {
      const response = await kinematicsApi.inverseKinematics(request);
      return response.data;
    },
  });
}

/** Hook to compute Jacobian matrix */
export function useJacobian(
  jointAngles: number[] | undefined,
  options?: { urdfPath?: string; enabled?: boolean }
) {
  return useQuery({
    queryKey: kinematicsKeys.jacobian(jointAngles ?? []),
    queryFn: async () => {
      if (!jointAngles) throw new Error('Joint angles required');
      const request: JacobianRequest = { joint_angles: jointAngles };
      if (options?.urdfPath) request.urdf_path = options.urdfPath;
      const response = await kinematicsApi.computeJacobian(request);
      return response.data;
    },
    enabled: (options?.enabled ?? true) && !!jointAngles && jointAngles.length > 0,
    staleTime: 0,
  });
}

/** Hook to compute Jacobian on demand */
export function useJacobianMutation() {
  return useMutation({
    mutationFn: async (request: JacobianRequest) => {
      const response = await kinematicsApi.computeJacobian(request);
      return response.data;
    },
  });
}

/** Hook to get joint limits */
export function useJointLimits(urdfPath?: string) {
  return useQuery({
    queryKey: kinematicsKeys.jointLimits(urdfPath),
    queryFn: async () => {
      const response = await kinematicsApi.getJointLimits(urdfPath);
      return response.data;
    },
    staleTime: Infinity, // Joint limits don't change
  });
}

/** Hook to check joint limits */
export function useCheckJointLimits() {
  return useMutation({
    mutationFn: async (request: JointLimitCheckRequest) => {
      const response = await kinematicsApi.checkJointLimits(request);
      return response.data;
    },
  });
}

/** Combined hook for real-time FK updates */
export function useRealTimeFK(
  jointAngles: number[] | undefined,
  options?: { urdfPath?: string; enabled?: boolean; debounceMs?: number }
) {
  const fkMutation = useForwardKinematicsMutation();

  // Use mutation for debounced real-time updates
  const computeFK = async () => {
    if (!jointAngles || jointAngles.length === 0) return null;

    const request: FKRequest = { joint_angles: jointAngles };
    if (options?.urdfPath) request.urdf_path = options.urdfPath;
    return fkMutation.mutateAsync(request);
  };

  return {
    computeFK,
    data: fkMutation.data,
    isLoading: fkMutation.isPending,
    error: fkMutation.error,
  };
}

/** Combined hook for real-time IK updates */
export function useRealTimeIK(options?: {
  urdfPath?: string;
  maxIterations?: number;
  tolerance?: number;
}) {
  const ikMutation = useInverseKinematicsMutation();

  const computeIK = async (
    targetPosition: [number, number, number],
    targetQuaternion?: [number, number, number, number],
    initialJoints?: number[]
  ) => {
    const request: IKRequest = { target_position: targetPosition };
    if (targetQuaternion) request.target_quaternion = targetQuaternion;
    if (initialJoints) request.initial_joints = initialJoints;
    if (options?.urdfPath) request.urdf_path = options.urdfPath;
    if (options?.maxIterations !== undefined) request.max_iterations = options.maxIterations;
    if (options?.tolerance !== undefined) request.tolerance = options.tolerance;
    return ikMutation.mutateAsync(request);
  };

  return {
    computeIK,
    data: ikMutation.data,
    isLoading: ikMutation.isPending,
    error: ikMutation.error,
    converged: ikMutation.data?.converged,
  };
}
