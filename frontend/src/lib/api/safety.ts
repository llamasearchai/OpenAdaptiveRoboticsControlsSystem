/**
 * Safety API client methods.
 */

import type {
  ApiResponse,
  SafetyConfig,
  SafetyStatusResponse,
  SafetyFilterRequest,
  SafetyFilterResponse,
} from '@/types';
import { getApiClient } from './client';
import { SAFETY } from './endpoints';

/** Safety API client */
export const safetyApi = {
  /** Get safety system status */
  async getStatus(): Promise<ApiResponse<SafetyStatusResponse>> {
    const client = getApiClient();
    return client.get<ApiResponse<SafetyStatusResponse>>(SAFETY.STATUS);
  },

  /** Configure the safety filter */
  async configure(
    config: SafetyConfig
  ): Promise<ApiResponse<SafetyStatusResponse>> {
    const client = getApiClient();
    return client.post<ApiResponse<SafetyStatusResponse>>(SAFETY.CONFIGURE, {
      body: config,
    });
  },

  /** Disable the safety filter */
  async disable(): Promise<ApiResponse<SafetyStatusResponse>> {
    const client = getApiClient();
    return client.post<ApiResponse<SafetyStatusResponse>>(SAFETY.DISABLE);
  },

  /** Filter an action through the safety system */
  async filterAction(
    request: SafetyFilterRequest
  ): Promise<ApiResponse<SafetyFilterResponse>> {
    const client = getApiClient();
    return client.post<ApiResponse<SafetyFilterResponse>>(SAFETY.FILTER, {
      body: request,
    });
  },

  /** Reset safety statistics */
  async resetStats(): Promise<ApiResponse<SafetyStatusResponse>> {
    const client = getApiClient();
    return client.post<ApiResponse<SafetyStatusResponse>>(SAFETY.RESET_STATS);
  },
};

export default safetyApi;
