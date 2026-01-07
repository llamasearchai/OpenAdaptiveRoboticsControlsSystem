/**
 * Core API client with retry, timeout, and error handling.
 */

import type {
  ApiResponse,
  ApiError as ApiErrorInterface,
  RequestOptions,
  RetryOptions,
  ApiClientConfig,
  HttpMethod,
} from '@/types';
import { ApiError, NetworkError, TimeoutError, AbortError } from './errors';

/** Default retry configuration */
const DEFAULT_RETRY: RetryOptions = {
  maxRetries: 3,
  retryDelay: 1000,
  retryOn: [429, 500, 502, 503, 504],
};

/** Default timeout in milliseconds */
const DEFAULT_TIMEOUT = 30000;

/** Create URL with query parameters */
function buildUrl(
  baseUrl: string,
  path: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  const url = new URL(path, baseUrl);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  return url.toString();
}

/** Sleep for specified milliseconds */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Calculate exponential backoff delay */
function getBackoffDelay(attempt: number, baseDelay: number): number {
  return Math.min(baseDelay * Math.pow(2, attempt), 30000);
}

/** Core API client class */
export class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private defaultHeaders: Record<string, string>;
  private retry: RetryOptions;
  private onError: ((error: ApiErrorInterface) => void) | undefined;
  private onRequest: ((url: string, options: RequestOptions) => void) | undefined;
  private onResponse: (<T>(response: ApiResponse<T>) => void) | undefined;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
    this.retry = { ...DEFAULT_RETRY, ...config.retry };
    this.onError = config.onError;
    this.onRequest = config.onRequest;
    this.onResponse = config.onResponse;
  }

  /** Make a fetch request with timeout */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs: number,
    signal?: AbortSignal
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Combine signals if one was provided
    const combinedSignal = signal
      ? this.combineSignals(signal, controller.signal)
      : controller.signal;

    try {
      const response = await fetch(url, {
        ...options,
        signal: combinedSignal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          if (signal?.aborted) {
            throw new AbortError('Request was aborted by the user');
          }
          throw new TimeoutError(timeoutMs);
        }
        throw new NetworkError(error.message, error);
      }
      throw new NetworkError();
    }
  }

  /** Combine multiple abort signals */
  private combineSignals(
    userSignal: AbortSignal,
    timeoutSignal: AbortSignal
  ): AbortSignal {
    const controller = new AbortController();

    const onAbort = () => controller.abort();
    userSignal.addEventListener('abort', onAbort);
    timeoutSignal.addEventListener('abort', onAbort);

    return controller.signal;
  }

  /** Parse response body */
  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      return response.json();
    }

    // Handle non-JSON responses
    const text = await response.text();
    return text as unknown as T;
  }

  /** Handle error response */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: ApiErrorInterface;

    try {
      errorData = await response.json();
    } catch {
      errorData = {
        error: 'unknown_error',
        message: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const error = ApiError.fromResponse(errorData, response.status);

    if (this.onError) {
      this.onError(error);
    }

    throw error;
  }

  /** Execute request with retry logic */
  private async executeWithRetry<T>(
    method: HttpMethod,
    url: string,
    options: RequestOptions
  ): Promise<T> {
    const retryConfig = options.retry ?? this.retry;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        const fetchOptions: RequestInit = {
          method,
          headers: {
            ...this.defaultHeaders,
            ...options.headers,
          },
        };

        if (options.body !== undefined && method !== 'GET') {
          fetchOptions.body = JSON.stringify(options.body);
        }

        const response = await this.fetchWithTimeout(
          url,
          fetchOptions,
          options.timeout ?? this.timeout,
          options.signal
        );

        if (!response.ok) {
          // Check if we should retry this status code
          if (
            attempt < retryConfig.maxRetries &&
            retryConfig.retryOn?.includes(response.status)
          ) {
            lastError = new ApiError(
              `HTTP ${response.status}`,
              response.status
            );
            await sleep(getBackoffDelay(attempt, retryConfig.retryDelay));
            continue;
          }

          await this.handleErrorResponse(response);
        }

        const data = await this.parseResponse<T>(response);

        // Call onResponse callback if provided
        if (this.onResponse && this.isApiResponse(data)) {
          this.onResponse(data as ApiResponse<unknown>);
        }

        return data;
      } catch (error) {
        // Don't retry on abort
        if (error instanceof AbortError) {
          throw error;
        }

        // Retry on network errors and timeouts
        if (
          attempt < retryConfig.maxRetries &&
          (error instanceof NetworkError || error instanceof TimeoutError)
        ) {
          lastError = error;
          await sleep(getBackoffDelay(attempt, retryConfig.retryDelay));
          continue;
        }

        throw error;
      }
    }

    throw lastError ?? new NetworkError('Request failed after retries');
  }

  /** Check if response is an ApiResponse */
  private isApiResponse(data: unknown): boolean {
    return (
      typeof data === 'object' &&
      data !== null &&
      'data' in data &&
      'meta' in data
    );
  }

  /** GET request */
  async get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = buildUrl(this.baseUrl, path, options.params);

    if (this.onRequest) {
      this.onRequest(url, { ...options, method: 'GET' });
    }

    return this.executeWithRetry<T>('GET', url, options);
  }

  /** POST request */
  async post<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = buildUrl(this.baseUrl, path, options.params);

    if (this.onRequest) {
      this.onRequest(url, { ...options, method: 'POST' });
    }

    return this.executeWithRetry<T>('POST', url, options);
  }

  /** PUT request */
  async put<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = buildUrl(this.baseUrl, path, options.params);

    if (this.onRequest) {
      this.onRequest(url, { ...options, method: 'PUT' });
    }

    return this.executeWithRetry<T>('PUT', url, options);
  }

  /** PATCH request */
  async patch<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = buildUrl(this.baseUrl, path, options.params);

    if (this.onRequest) {
      this.onRequest(url, { ...options, method: 'PATCH' });
    }

    return this.executeWithRetry<T>('PATCH', url, options);
  }

  /** DELETE request */
  async delete<T = void>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = buildUrl(this.baseUrl, path, options.params);

    if (this.onRequest) {
      this.onRequest(url, { ...options, method: 'DELETE' });
    }

    return this.executeWithRetry<T>('DELETE', url, options);
  }
}

/** Get configured API client instance */
let clientInstance: ApiClient | null = null;

export function getApiClient(): ApiClient {
  if (!clientInstance) {
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL ??
      (typeof window !== 'undefined'
        ? window.location.origin
        : 'http://localhost:8000');

    clientInstance = new ApiClient({
      baseUrl,
      timeout: 30000,
      retry: {
        maxRetries: 3,
        retryDelay: 1000,
        retryOn: [429, 500, 502, 503, 504],
      },
    });
  }

  return clientInstance;
}

/** Create a new API client with custom config */
export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}

/** Reset the client instance (useful for testing) */
export function resetApiClient(): void {
  clientInstance = null;
}
