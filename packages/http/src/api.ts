/**
 * Type-safe end-to-end API layer — defineAPI().
 *
 * Define your API once, get typed server handlers and client calls.
 * Validation built-in via Zod-compatible schemas. No code generation,
 * no separate client library — types flow from server to client.
 *
 * ```ts
 * // shared/api.ts — define once, import everywhere
 * export const usersAPI = defineAPI({
 *   getUser: {
 *     method: 'GET',
 *     input: z.object({ id: z.string() }),
 *     resolve: async ({ input }) => db.users.findById(input.id),
 *   },
 *   createUser: {
 *     method: 'POST',
 *     input: z.object({ name: z.string(), email: z.string().email() }),
 *     resolve: async ({ input }) => db.users.create(input),
 *   },
 * });
 *
 * // Client — fully typed
 * const client = createAPIClient<typeof usersAPI>({ baseUrl: '/api' });
 * const user = await client.getUser({ id: '123' }); // typed!
 * ```
 */

import { signal } from '@akashjs/runtime';
import type { ReadonlySignal } from '@akashjs/runtime';

// =========================================================================
// Types
// =========================================================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Zod-compatible schema interface (no hard dependency on Zod) */
interface SchemaLike<T = unknown> {
  parse(data: unknown): T;
  safeParse(data: unknown): { success: boolean; data?: T; error?: { issues: Array<{ message: string }> } };
}

export interface EndpointDef<TInput = unknown, TOutput = unknown> {
  /** HTTP method (default: POST) */
  method?: HttpMethod;
  /** Input validation schema (Zod-compatible) */
  input?: SchemaLike<TInput>;
  /** Output validation schema (optional) */
  output?: SchemaLike<TOutput>;
  /** Server-side resolver */
  resolve: (ctx: { input: TInput }) => Promise<TOutput> | TOutput;
}

export type APIDef = Record<string, EndpointDef<any, any>>;

export type APIClient<T extends APIDef> = {
  [K in keyof T]: T[K] extends EndpointDef<infer I, infer O>
    ? (input: I) => Promise<O>
    : never;
};

export interface APIClientOptions {
  /** Base URL for API requests */
  baseUrl: string;
  /** Custom fetch function */
  fetch?: typeof globalThis.fetch;
  /** Headers to include in every request */
  headers?: Record<string, string>;
}

// =========================================================================
// defineAPI — server-side definition
// =========================================================================

/**
 * Define a type-safe API. Returns the definition object with type metadata
 * that can be used by both the server handler and the client.
 */
export function defineAPI<T extends APIDef>(endpoints: T): T & { _endpoints: T } {
  return { ...endpoints, _endpoints: endpoints };
}

// =========================================================================
// createAPIClient — client-side consumer
// =========================================================================

/**
 * Create a typed client for a defined API.
 *
 * ```ts
 * const client = createAPIClient<typeof myAPI>({ baseUrl: '/api' });
 * const result = await client.getUser({ id: '1' }); // fully typed
 * ```
 */
export function createAPIClient<T extends APIDef>(
  options: APIClientOptions,
): { [K in keyof T]: (input: T[K] extends EndpointDef<infer I, any> ? I : never) => Promise<T[K] extends EndpointDef<any, infer O> ? O : never> } {
  const { baseUrl, fetch: customFetch = globalThis.fetch.bind(globalThis), headers = {} } = options;

  const client = {} as any;

  // We use a Proxy to dynamically handle any endpoint name
  return new Proxy(client, {
    get(_target, prop: string) {
      return async (input: unknown) => {
        const url = `${baseUrl}/${prop}`;
        const response = await customFetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify(input ?? {}),
        });

        if (!response.ok) {
          const body = await response.text().catch(() => '');
          throw new APIError(response.status, prop, body);
        }

        return response.json();
      };
    },
  });
}

// =========================================================================
// createAPIHandler — server-side request handler
// =========================================================================

/**
 * Create a server-side request handler for an API definition.
 * Returns a function that can be used as an HTTP handler (e.g., in Express, Hono).
 *
 * ```ts
 * const handler = createAPIHandler(myAPI);
 * // Express: app.post('/api/:endpoint', handler);
 * // Hono: app.post('/api/:endpoint', (c) => handler(c.req));
 * ```
 */
export function createAPIHandler<T extends APIDef>(
  api: T,
): (endpoint: string, body: unknown) => Promise<{ status: number; body: unknown }> {
  return async (endpoint: string, body: unknown) => {
    const def = api[endpoint];
    if (!def) {
      return { status: 404, body: { error: `Endpoint "${endpoint}" not found` } };
    }

    // Validate input
    let input = body;
    if (def.input) {
      const result = def.input.safeParse(body);
      if (!result.success) {
        return {
          status: 400,
          body: { error: 'Validation failed', issues: result.error?.issues },
        };
      }
      input = result.data;
    }

    // Execute resolver
    try {
      const output = await def.resolve({ input });

      // Validate output (optional)
      if (def.output) {
        def.output.parse(output);
      }

      return { status: 200, body: output };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { status: 500, body: { error: message } };
    }
  };
}

// =========================================================================
// useQuery / useMutation — reactive API hooks
// =========================================================================

export interface QueryResult<T> {
  data: ReadonlySignal<T | undefined>;
  loading: ReadonlySignal<boolean>;
  error: ReadonlySignal<Error | undefined>;
  refetch: () => void;
}

/**
 * Reactive query hook for API endpoints.
 *
 * ```ts
 * const { data, loading, error } = useQuery(() => client.getUser({ id: userId() }));
 * ```
 */
export function useQuery<T>(fetcher: () => Promise<T>): QueryResult<T> {
  const data = signal<T | undefined>(undefined);
  const loading = signal(true);
  const error = signal<Error | undefined>(undefined);

  function fetch() {
    loading.set(true);
    error.set(undefined);
    fetcher()
      .then((result) => { data.set(result); loading.set(false); })
      .catch((err) => { error.set(err instanceof Error ? err : new Error(String(err))); loading.set(false); });
  }

  fetch();

  return {
    data: () => data(),
    loading: () => loading(),
    error: () => error(),
    refetch: fetch,
  };
}

// =========================================================================
// APIError
// =========================================================================

export class APIError extends Error {
  constructor(
    public readonly status: number,
    public readonly endpoint: string,
    public readonly body: string,
  ) {
    super(`API error ${status} on ${endpoint}`);
    this.name = 'APIError';
  }
}
