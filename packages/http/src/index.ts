// @akashjs/http — Entry point

// Client
export { createHttpClient, HttpError } from './client.js';

// Interceptors
export { buildInterceptorChain } from './interceptors.js';

// Resource
export { createResource } from './resource.js';

// Actions (mutations)
export { createAction } from './action.js';
export type { Action, ActionOptions } from './action.js';

// WebSocket
export { createSocket } from './socket.js';
export type { Socket, SocketOptions, SocketStatus, SocketEventMap } from './socket.js';

// Pagination
export { createPagination, createCursorPagination } from './pagination.js';
export type { Pagination, PaginationOptions, CursorPagination, CursorPaginationOptions } from './pagination.js';

// Auth
export { createAuth } from './auth.js';
export type { Auth, AuthConfig } from './auth.js';

// Type-safe API
export { defineAPI, createAPIClient, createAPIHandler, useQuery, APIError } from './api.js';
export type { EndpointDef, APIDef, APIClientOptions, QueryResult } from './api.js';

// Retry & Queue
export { retry, createQueue, dedup } from './retry.js';
export type { RetryOptions, Queue, QueueOptions } from './retry.js';

// Query cache
export { createQueryClient, useCachedQuery, useMutation } from './query.js';
export type { QueryClient, QueryClientOptions, QueryOptions, QueryResult as CachedQueryResult, MutationOptions, MutationResult } from './query.js';

// Types
export type {
  HttpMethod,
  HttpClientConfig,
  RequestConfig,
  HttpInterceptor,
  InterceptorNext,
  HttpClient,
  ResourceOptions,
  Resource,
} from './types.js';
