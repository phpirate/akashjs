# @akashjs/http API

## createHttpClient(config?)

Create a typed HTTP client.

```ts
function createHttpClient(config?: HttpClientConfig): HttpClient;

interface HttpClientConfig {
  baseUrl?: string;
  headers?: Record<string, string>;
  interceptors?: HttpInterceptor[];
  fetch?: typeof globalThis.fetch;
}

interface HttpClient {
  get<T>(path: string, config?: RequestConfig): Promise<T>;
  post<T>(path: string, body?: unknown, config?: RequestConfig): Promise<T>;
  put<T>(path: string, body?: unknown, config?: RequestConfig): Promise<T>;
  patch<T>(path: string, body?: unknown, config?: RequestConfig): Promise<T>;
  delete<T = void>(path: string, config?: RequestConfig): Promise<T>;
  head(path: string, config?: RequestConfig): Promise<Response>;
  request<T>(method, path, body?, config?): Promise<T>;
  raw(method, path, body?, config?): Promise<Response>;
}
```

## RequestConfig

```ts
interface RequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, string>;
  signal?: AbortSignal;
  credentials?: RequestCredentials;
}
```

## HttpError

Thrown for non-2xx responses.

```ts
class HttpError extends Error {
  status: number;
  statusText: string;
  body: string;
  response: Response;
}
```

## HttpInterceptor

```ts
type HttpInterceptor = (request: Request, next: InterceptorNext) => Promise<Response>;
type InterceptorNext = (request: Request) => Promise<Response>;
```

## createResource(fetcher, options?)

Create a reactive async data signal.

```ts
function createResource<T>(
  fetcher: () => Promise<T>,
  options?: ResourceOptions<T>,
): Resource<T>;

interface ResourceOptions<T> {
  key?: () => unknown;
  staleTime?: number;
  refetchOnFocus?: boolean;
  initialData?: T;
}

interface Resource<T> {
  (): T | undefined;
  loading: () => boolean;
  error: () => Error | undefined;
  refetch: () => void;
  mutate: (data: T) => void;
  dispose: () => void;
}
```

## Actions

### createAction(mutationFn, options?)

Create a reactive wrapper around an async mutation (POST, PUT, DELETE, etc.).

```ts
function createAction<T, A extends unknown[] = []>(
  mutationFn: (...args: A) => Promise<T>,
  options?: {
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  },
): Action<T, A>;

interface Action<T, A extends unknown[]> {
  execute(...args: A): Promise<T>;
  loading: () => boolean;
  error: () => Error | undefined;
  data: () => T | undefined;
  reset(): void;
}
```

## WebSocket

### createSocket(url, options?)

Create a reactive WebSocket connection with auto-reconnect.

```ts
function createSocket(url: string, options?: {
  protocols?: string | string[];
  reconnect?: boolean;
  maxRetries?: number;
  retryInterval?: number;
}): Socket;

interface Socket {
  status: () => 'connecting' | 'open' | 'closed' | 'error';
  send(data: string | ArrayBuffer): void;
  on(event: string, handler: (data: any) => void): () => void;
  close(): void;
  reconnect(): void;
  dispose(): void;
}
```

## Pagination

### createPagination(options)

Offset-based pagination helper with reactive state.

```ts
function createPagination<T>(options: {
  fetcher: (params: { page: number; pageSize: number }) => Promise<{ data: T[]; total: number }>;
  pageSize?: number;
}): {
  data: () => T[];
  page: () => number;
  pageSize: () => number;
  total: () => number;
  totalPages: () => number;
  loading: () => boolean;
  next(): void;
  prev(): void;
  goTo(page: number): void;
};
```

### createCursorPagination(options)

Cursor-based pagination helper for infinite-scroll patterns.

```ts
function createCursorPagination<T>(options: {
  fetcher: (cursor: string | null) => Promise<{ data: T[]; nextCursor: string | null }>;
}): {
  data: () => T[];
  loading: () => boolean;
  hasMore: () => boolean;
  loadMore(): void;
  reset(): void;
};
```

## Auth

### createAuth(config?)

Create a reactive authentication manager with token handling, user fetching, and HTTP integration.

```ts
function createAuth(config?: AuthConfig): Auth;

interface AuthConfig {
  loginUrl?: string;
  logoutUrl?: string;
  userUrl?: string;
  refreshUrl?: string;
  tokenKey?: string;
  storage?: Storage;
}

interface Auth {
  user: () => Record<string, unknown> | null;
  token: () => string | null;
  isLoggedIn: () => boolean;
  loading: () => boolean;
  login(credentials: Record<string, unknown>): Promise<void>;
  logout(): Promise<void>;
  setToken(token: string): void;
  fetchUser(): Promise<void>;
  refreshToken(): Promise<void>;
  interceptor: HttpInterceptor;
  guard(redirectTo?: string): () => boolean;
}
```

`interceptor` can be passed directly to `createHttpClient({ interceptors: [auth.interceptor] })` to attach the auth token to outgoing requests. `guard` returns a reactive check suitable for route guards.

## Retry

### retry(fn, options?)

Wrap any async function with automatic retry logic including exponential backoff.

```ts
import { retry } from '@akashjs/http';

const data = await retry(() => api.get('/unstable-endpoint'), {
  maxRetries: 3,
  backoff: 'exponential',
  delay: 1000,
});
```

#### RetryOptions

| Option | Type | Default | Description |
|---|---|---|---|
| `maxRetries` | `number` | `3` | Maximum number of retry attempts |
| `backoff` | `'fixed' \| 'linear' \| 'exponential'` | `'exponential'` | Backoff strategy between retries |
| `delay` | `number` | `1000` | Base delay in milliseconds |
| `maxDelay` | `number` | `30000` | Maximum delay cap in ms (for exponential/linear) |
| `retryOn` | `(error: Error, attempt: number) => boolean` | `() => true` | Predicate to decide whether to retry |
| `onRetry` | `(error: Error, attempt: number) => void` | `undefined` | Callback fired before each retry |
| `signal` | `AbortSignal` | `undefined` | Abort signal to cancel pending retries |

```ts
// Retry only on network errors or 5xx
const result = await retry(() => client.post('/order', data), {
  maxRetries: 5,
  backoff: 'exponential',
  delay: 500,
  retryOn: (error) => {
    if (error instanceof HttpError) {
      return error.status >= 500;
    }
    return true; // retry network errors
  },
  onRetry: (error, attempt) => {
    console.warn(`Retry ${attempt}: ${error.message}`);
  },
});
```

## Queue

### createQueue(options?)

Create a request queue with concurrency limits and optional rate limiting. Useful for bulk operations or API rate-limit compliance.

```ts
import { createQueue } from '@akashjs/http';

const queue = createQueue({ concurrency: 3 });

// Enqueue tasks — they execute up to 3 at a time
const results = await Promise.all(
  userIds.map(id => queue.add(() => api.get(`/users/${id}`))),
);
```

#### QueueOptions

| Option | Type | Default | Description |
|---|---|---|---|
| `concurrency` | `number` | `4` | Max concurrent tasks |
| `rateLimit` | `number` | `undefined` | Max tasks per `rateInterval` |
| `rateInterval` | `number` | `1000` | Rate limit window in ms |

#### Queue API

| Method | Description |
|---|---|
| `add(fn)` | Add a task, returns a Promise resolving with its result |
| `pause()` | Pause the queue (in-flight tasks continue) |
| `resume()` | Resume a paused queue |
| `clear()` | Remove all pending tasks |
| `size()` | Number of pending tasks |
| `pending()` | Number of currently running tasks |

```ts
// Rate-limited queue: max 10 requests per second
const limiter = createQueue({
  concurrency: 5,
  rateLimit: 10,
  rateInterval: 1000,
});

for (const item of largeDataset) {
  limiter.add(() => client.post('/ingest', item));
}
```

## Dedup

### dedup(fn, keyFn?)

Deduplicate concurrent calls to the same async function. If a call with the same key is already in flight, the existing promise is returned instead of starting a new request.

```ts
import { dedup } from '@akashjs/http';

const fetchUser = dedup(
  (id: string) => api.get(`/users/${id}`),
);

// These two calls share a single request
const [a, b] = await Promise.all([
  fetchUser('123'),
  fetchUser('123'),
]);
// a === b, only one HTTP request was made
```

By default, the dedup key is derived from the function arguments using `JSON.stringify`. Pass a custom `keyFn` for more control:

```ts
const fetchProfile = dedup(
  (user: { id: string; fields?: string[] }) =>
    api.get(`/profiles/${user.id}`, { params: { fields: user.fields?.join(',') } }),
  (user) => user.id, // dedup by ID only, ignore fields
);
```

Once the in-flight promise resolves (or rejects), subsequent calls with the same key will start a fresh request.
