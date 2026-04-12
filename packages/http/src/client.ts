/**
 * HTTP client.
 *
 * A thin, typed wrapper around fetch with interceptor support.
 * Returns Promises, not Observables.
 */

import { buildInterceptorChain } from './interceptors.js';
import type {
  HttpClient,
  HttpClientConfig,
  HttpMethod,
  RequestConfig,
  InterceptorNext,
} from './types.js';

/**
 * Create an HTTP client instance.
 *
 * ```ts
 * const http = createHttpClient({
 *   baseUrl: '/api',
 *   headers: { 'Content-Type': 'application/json' },
 *   interceptors: [authInterceptor],
 * });
 *
 * const users = await http.get<User[]>('/users');
 * ```
 */
export function createHttpClient(config: HttpClientConfig = {}): HttpClient {
  const baseFetch = config.fetch ?? globalThis.fetch.bind(globalThis);
  const defaultHeaders = config.headers ?? {};
  const baseUrl = config.baseUrl ?? '';

  const executeFetch: InterceptorNext = config.interceptors?.length
    ? buildInterceptorChain(config.interceptors, baseFetch)
    : (request: Request) => baseFetch(request);

  function buildUrl(path: string, params?: Record<string, string>): string {
    let url = baseUrl + path;
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params);
      url += '?' + searchParams.toString();
    }
    return url;
  }

  function buildRequest(
    method: HttpMethod,
    path: string,
    body?: unknown,
    requestConfig?: RequestConfig,
  ): Request {
    const url = buildUrl(path, requestConfig?.params);

    const headers = new Headers(defaultHeaders);
    if (requestConfig?.headers) {
      for (const [key, value] of Object.entries(requestConfig.headers)) {
        headers.set(key, value);
      }
    }

    // Auto-set Content-Type for JSON bodies if not explicitly set
    if (body !== undefined && body !== null && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const init: RequestInit = {
      method,
      headers,
      signal: requestConfig?.signal,
      credentials: requestConfig?.credentials ?? config.credentials,
    };

    if (body !== undefined && body !== null) {
      init.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    return new Request(url, init);
  }

  async function parseResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new HttpError(response.status, response.statusText, errorBody, response);
    }

    // No content
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return undefined as T;
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      return response.json() as Promise<T>;
    }

    return response.text() as unknown as T;
  }

  async function request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    requestConfig?: RequestConfig,
  ): Promise<T> {
    const req = buildRequest(method, path, body, requestConfig);
    const response = await executeFetch(req);
    return parseResponse<T>(response);
  }

  async function raw(
    method: HttpMethod,
    path: string,
    body?: unknown,
    requestConfig?: RequestConfig,
  ): Promise<Response> {
    const req = buildRequest(method, path, body, requestConfig);
    return executeFetch(req);
  }

  return {
    get: <T>(path: string, cfg?: RequestConfig) => request<T>('GET', path, undefined, cfg),
    post: <T>(path: string, body?: unknown, cfg?: RequestConfig) => request<T>('POST', path, body, cfg),
    put: <T>(path: string, body?: unknown, cfg?: RequestConfig) => request<T>('PUT', path, body, cfg),
    patch: <T>(path: string, body?: unknown, cfg?: RequestConfig) => request<T>('PATCH', path, body, cfg),
    delete: <T = void>(path: string, cfg?: RequestConfig) => request<T>('DELETE', path, undefined, cfg),
    head: (path: string, cfg?: RequestConfig) => raw('HEAD', path, undefined, cfg),
    request,
    raw,
  };
}

// --- HttpError ---

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: string,
    public readonly response: Response,
  ) {
    super(`HTTP ${status}: ${statusText}`);
    this.name = 'HttpError';
  }
}
