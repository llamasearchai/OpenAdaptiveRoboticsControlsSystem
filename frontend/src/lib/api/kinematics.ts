/**
 * Kinematics API client methods.
 */

import type {
  ApiResponse,
  FKRequest,
  FKResponse,
  IKRequest,
  IKResponse,
  JacobianRequest,
  JacobianResponse,
  JointLimitsResponse,
  JointLimitCheckRequest,
  JointLimitCheckResponse,
} from '@/types';
import { getApiClient } from './client';
import { KINEMATICS } from './endpoints';

/** Kinematics API client */
export const kinematicsApi = {
  /** Compute forward kinematics */
  async forwardKinematics(
    request: FKRequest
  ): Promise<ApiResponse<FKResponse>> {
    const client = getApiClient();
    return client.post<ApiResponse<FKResponse>>(KINEMATICS.FK, {
      body: request,
    });
  },

  /** Compute inverse kinematics */
  async inverseKinematics(
    request: IKRequest
  ): Promise<ApiResponse<IKResponse>> {
    const client = getApiClient();
    return client.post<ApiResponse<IKResponse>>(KINEMATICS.IK, {
      body: request,
    });
  },

  /** Compute Jacobian matrix */
  async computeJacobian(
    request: JacobianRequest
  ): Promise<ApiResponse<JacobianResponse>> {
    const client = getApiClient();
    return client.post<ApiResponse<JacobianResponse>>(KINEMATICS.JACOBIAN, {
      body: request,
    });
  },

  /** Get joint limits from URDF */
  async getJointLimits(
    urdfPath?: string
  ): Promise<ApiResponse<JointLimitsResponse>> {
    const client = getApiClient();
    return client.get<ApiResponse<JointLimitsResponse>>(KINEMATICS.JOINT_LIMITS,
      urdfPath ? { params: { urdf_path: urdfPath } } : {}
    );
  },

  /** Check if joint angles are within limits */
  async checkJointLimits(
    request: JointLimitCheckRequest
  ): Promise<ApiResponse<JointLimitCheckResponse>> {
    const client = getApiClient();
    return client.post<ApiResponse<JointLimitCheckResponse>>(
      KINEMATICS.CHECK_LIMITS,
      { body: request }
    );
  },
};

export default kinematicsApi;
