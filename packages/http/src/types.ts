/**
 * HTTP client type definitions.
 */

// --- HTTP methods ---

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

// --- Client config ---

export interface HttpClientConfig {
  /** Base URL prepended to all request paths */
  baseUrl?: string;
  /** Default headers applied to every request */
  headers?: Record<string, string>;
  /** Interceptor middleware chain */
  interceptors?: HttpInterceptor[];
  /** Custom fetch implementation (defaults to globalThis.fetch) */
  fetch?: typeof globalThis.fetch;
}

// --- Request config ---

export interface RequestConfig {
  /** Additional headers for this request */
  headers?: Record<string, string>;
  /** Query string parameters */
  params?: Record<string, string>;
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
  /** Request credentials mode */
  credentials?: RequestCredentials;
}

// --- Interceptors ---

/** Next function in the interceptor chain */
export type InterceptorNext = (request: Request) => Promise<Response>;

/**
 * HTTP interceptor — async middleware for request/response transformation.
 *
 * ```ts
 * const auth: HttpInterceptor = async (request, next) => {
 *   request.headers.set('Authorization', `Bearer ${token}`);
 *   return next(request);
 * };
 * ```
 */
export type HttpInterceptor = (request: Request, next: InterceptorNext) => Promise<Response>;

// --- HTTP client instance ---

export interface HttpClient {
  /** GET request */
  get<T>(path: string, config?: RequestConfig): Promise<T>;
  /** POST request with JSON body */
  post<T>(path: string, body?: unknown, config?: RequestConfig): Promise<T>;
  /** PUT request with JSON body */
  put<T>(path: string, body?: unknown, config?: RequestConfig): Promise<T>;
  /** PATCH request with JSON body */
  patch<T>(path: string, body?: unknown, config?: RequestConfig): Promise<T>;
  /** DELETE request */
  delete<T = void>(path: string, config?: RequestConfig): Promise<T>;
  /** HEAD request */
  head(path: string, config?: RequestConfig): Promise<Response>;
  /** Raw request with full control */
  request<T>(method: HttpMethod, path: string, body?: unknown, config?: RequestConfig): Promise<T>;
  /** Raw request returning the full Response object */
  raw(method: HttpMethod, path: string, body?: unknown, config?: RequestConfig): Promise<Response>;
}

// --- Resource ---

export interface ResourceOptions<T> {
  /** Cache key — when this changes, the resource refetches */
  key?: () => unknown;
  /** Time in ms before cached data is considered stale (default: 0, no caching) */
  staleTime?: number;
  /** Refetch when the browser tab regains focus */
  refetchOnFocus?: boolean;
  /** Initial data to use before the first fetch */
  initialData?: T;
}

export interface Resource<T> {
  /** Read the current data (reactive signal) */
  (): T | undefined;
  /** Whether a fetch is in progress */
  loading: () => boolean;
  /** The last error, if any */
  error: () => Error | undefined;
  /** Manually trigger a refetch */
  refetch: () => void;
  /** Optimistically set the data without refetching */
  mutate: (data: T) => void;
  /** Dispose listeners and cancel in-flight requests */
  dispose: () => void;
}
