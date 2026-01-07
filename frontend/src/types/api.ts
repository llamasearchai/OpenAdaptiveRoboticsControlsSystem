/**
 * API-related types for request/response handling.
 */

import type { Timestamp } from './common';

/** Standard API response wrapper */
export interface ApiResponse<T> {
  data: T;
  meta: ApiMeta;
}

/** API response metadata */
export interface ApiMeta {
  request_id: string;
  timestamp?: Timestamp;
}

/** API error response */
export interface ApiError {
  error: string;
  message: string;
  detail?: string | undefined;
  field_errors?: Record<string, string[]> | undefined;
  status_code?: number | undefined;
}

/** Paginated response wrapper */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

/** Pagination metadata */
export interface PaginationMeta {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

/** Pagination request parameters */
export interface PaginationParams {
  offset?: number;
  limit?: number;
}

/** Sort direction */
export type SortDirection = 'asc' | 'desc';

/** Sort parameters */
export interface SortParams {
  field: string;
  direction: SortDirection;
}

/** Filter operator */
export type FilterOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'contains';

/** Filter condition */
export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

/** HTTP methods */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Request options for API client */
export interface RequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  timeout?: number;
  signal?: AbortSignal;
  retry?: RetryOptions;
}

/** Retry configuration */
export interface RetryOptions {
  maxRetries: number;
  retryDelay: number;
  retryOn?: number[];
}

/** API client configuration */
export interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
  retry?: RetryOptions;
  onError?: (error: ApiError) => void;
  onRequest?: (url: string, options: RequestOptions) => void;
  onResponse?: <T>(response: ApiResponse<T>) => void;
}

/** WebSocket message types */
export type WebSocketMessageType =
  | 'ping'
  | 'pong'
  | 'subscribe'
  | 'unsubscribe'
  | 'error'
  | 'sim_state'
  | 'sim_observation'
  | 'sim_step'
  | 'sim_reset'
  | 'train_metrics'
  | 'train_status'
  | 'train_checkpoint'
  | 'train_complete';

/** WebSocket message structure */
export interface WebSocketMessage<T = unknown> {
  type: WebSocketMessageType;
  topic?: string;
  data: T;
  timestamp: string;
}

/** WebSocket subscription request */
export interface SubscribeMessage {
  type: 'subscribe';
  data: {
    topic: string;
  };
}

/** WebSocket unsubscribe request */
export interface UnsubscribeMessage {
  type: 'unsubscribe';
  data: {
    topic: string;
  };
}

/** Health check response */
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime?: number;
  services?: Record<string, ServiceHealth>;
}

/** Individual service health */
export interface ServiceHealth {
  status: 'up' | 'down';
  latency_ms?: number;
  message?: string;
}
