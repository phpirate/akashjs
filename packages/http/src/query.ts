/**
 * Query cache with automatic invalidation.
 *
 * Signal-native query cache inspired by TanStack Query.
 * Connects reads (useQuery) with writes (useMutation) via cache keys.
 *
 * ```ts
 * const qc = createQueryClient();
 * const users = useQuery(qc, ['users'], () => http.get('/api/users'));
 * const deleteUser = useMutation(qc, (id) => http.delete(`/api/users/${id}`), {
 *   invalidates: ['users'],
 * });
 * ```
 */

import { signal, effect, untrack, computed } from '@akashjs/runtime';
import type { Signal } from '@akashjs/runtime';

// --- Types ---

export interface QueryClientOptions {
  /** Default stale time in ms (default: 0 — always stale) */
  defaultStaleTime?: number;
  /** Default retry count for failed queries (default: 0) */
  defaultRetryCount?: number;
}

export interface QueryOptions<T> {
  /** Cache lifetime in ms before data is considered stale */
  staleTime?: number;
  /** Refetch when window regains focus */
  refetchOnFocus?: boolean;
  /** Return previous data while refetching (stale-while-revalidate) */
  placeholderData?: (prev: T | undefined) => T | undefined;
  /** Initial data before first fetch */
  initialData?: T;
  /** Whether the query is enabled (default: true) */
  enabled?: boolean | (() => boolean);
}

export interface QueryResult<T> {
  /** Read the data (reactive) */
  (): T | undefined;
  /** Whether a fetch is in progress */
  loading: () => boolean;
  /** The last error */
  error: () => Error | undefined;
  /** Whether data has been fetched at least once */
  fetched: () => boolean;
  /** Manually trigger a refetch */
  refetch: () => void;
  /** Dispose the query (stop effects, unsubscribe from cache) */
  dispose: () => void;
}

export interface MutationOptions<TInput, TResult> {
  /** Cache keys to invalidate after successful mutation */
  invalidates?: CacheKeyPrefix[];
  /** Called on success */
  onSuccess?: (result: TResult, input: TInput) => void;
  /** Called on error */
  onError?: (error: Error, input: TInput) => void;
  /** Called after success or error */
  onSettled?: (input: TInput) => void;
  /** Optimistic update — called before mutation, receives rollback fn */
  optimistic?: (input: TInput) => void;
  /** Revert optimistic update on error */
  revertOptimistic?: (input: TInput) => void;
}

export interface MutationResult<TInput, TResult> {
  /** Execute the mutation */
  execute: (input: TInput) => Promise<TResult>;
  /** Whether the mutation is in progress */
  loading: () => boolean;
  /** The last error */
  error: () => Error | undefined;
  /** The last result */
  data: () => TResult | undefined;
  /** Reset state */
  reset: () => void;
}

type CacheKey = (string | number | boolean | Record<string, unknown>)[];
type CacheKeyPrefix = string | CacheKey;

interface CacheEntry<T = unknown> {
  data: Signal<T | undefined>;
  loading: Signal<boolean>;
  error: Signal<Error | undefined>;
  fetchedAt: number;
  staleTime: number;
  promise: Promise<T> | null;
  refetchFn: (() => void) | null;
  subscribers: number;
}

// --- Key serialization ---

function serializeKey(key: CacheKey): string {
  return JSON.stringify(key);
}

function keyMatchesPrefix(key: string, prefix: CacheKeyPrefix): boolean {
  if (typeof prefix === 'string') {
    // String prefix: match if key array starts with this string
    // key = '["users",{"page":1}]', prefix = 'users'
    // Parse and check first element
    try {
      const parsed = JSON.parse(key);
      return Array.isArray(parsed) && parsed[0] === prefix;
    } catch {
      return false;
    }
  }
  // Array prefix: match if key starts with all elements of prefix
  const serializedPrefix = JSON.stringify(prefix);
  const serializedKey = key;
  // Prefix match: key starts with prefix elements
  // e.g., ["users",1] matches prefix ["users"]
  try {
    const parsedKey = JSON.parse(serializedKey);
    if (!Array.isArray(parsedKey)) return false;
    for (let i = 0; i < prefix.length; i++) {
      if (JSON.stringify(parsedKey[i]) !== JSON.stringify(prefix[i])) return false;
    }
    return true;
  } catch {
    return false;
  }
}

// --- QueryClient ---

export interface QueryClient {
  /** Invalidate all queries matching a key prefix — triggers refetch */
  invalidate: (prefix: CacheKeyPrefix) => void;
  /** Manually set cached data for a key */
  setQueryData: <T>(key: CacheKey, updater: T | ((prev: T | undefined) => T)) => void;
  /** Read cached data for a key */
  getQueryData: <T>(key: CacheKey) => T | undefined;
  /** Remove a query from the cache */
  removeQuery: (key: CacheKey) => void;
  /** Clear the entire cache */
  clear: () => void;
  /** @internal — access to cache for useQuery/useMutation */
  _cache: Map<string, CacheEntry>;
  _options: QueryClientOptions;
}

export function createQueryClient(options: QueryClientOptions = {}): QueryClient {
  const cache = new Map<string, CacheEntry>();

  function invalidate(prefix: CacheKeyPrefix): void {
    for (const [key, entry] of cache) {
      if (keyMatchesPrefix(key, prefix)) {
        entry.fetchedAt = 0; // mark stale
        entry.refetchFn?.();
      }
    }
  }

  function setQueryData<T>(key: CacheKey, updater: T | ((prev: T | undefined) => T)): void {
    const serialized = serializeKey(key);
    const entry = cache.get(serialized) as CacheEntry<T> | undefined;
    if (entry) {
      const newData = typeof updater === 'function'
        ? (updater as (prev: T | undefined) => T)(entry.data() as T | undefined)
        : updater;
      entry.data.set(newData);
      entry.fetchedAt = Date.now();
    }
  }

  function getQueryData<T>(key: CacheKey): T | undefined {
    const serialized = serializeKey(key);
    const entry = cache.get(serialized);
    return entry?.data() as T | undefined;
  }

  function removeQuery(key: CacheKey): void {
    cache.delete(serializeKey(key));
  }

  function clear(): void {
    cache.clear();
  }

  return { invalidate, setQueryData, getQueryData, removeQuery, clear, _cache: cache, _options: options };
}

// --- useQuery ---

export function useCachedQuery<T>(
  client: QueryClient,
  key: CacheKey | (() => CacheKey),
  fetcher: () => Promise<T>,
  options: QueryOptions<T> = {},
): QueryResult<T> {
  const staleTime = options.staleTime ?? client._options.defaultStaleTime ?? 0;
  const data = signal<T | undefined>(options.initialData);
  const loading = signal(false);
  const error = signal<Error | undefined>(undefined);
  const fetched = signal(false);
  let disposed = false;
  let requestId = 0;

  function resolveKey(): CacheKey {
    return typeof key === 'function' ? key() : key;
  }

  function doFetch(cacheKey: CacheKey): void {
    if (disposed) return;

    const serialized = serializeKey(cacheKey);
    let entry = client._cache.get(serialized) as CacheEntry<T> | undefined;

    // Check if cache entry exists and is fresh
    if (entry && entry.fetchedAt > 0 && Date.now() - entry.fetchedAt < staleTime) {
      // Fresh — use cached data
      data.set(entry.data() as T | undefined);
      loading.set(false);
      fetched.set(true);
      return;
    }

    // Create entry if it doesn't exist
    if (!entry) {
      entry = {
        data: signal<T | undefined>(undefined) as Signal<T | undefined>,
        loading: signal(false),
        error: signal<Error | undefined>(undefined),
        fetchedAt: 0,
        staleTime,
        promise: null,
        refetchFn: null,
        subscribers: 0,
      };
      client._cache.set(serialized, entry as CacheEntry);
    }

    entry.subscribers++;
    entry.refetchFn = () => {
      entry!.fetchedAt = 0;
      untrack(() => doFetch(resolveKey()));
    };

    // Stale-while-revalidate: return cached data immediately
    if (entry.data() !== undefined) {
      const prev = entry.data() as T | undefined;
      if (options.placeholderData) {
        data.set(options.placeholderData(prev));
      } else {
        data.set(prev);
      }
    }

    // Dedup: if same query is already in flight, reuse the promise
    if (entry.promise) {
      loading.set(true);
      entry.promise
        .then((result) => { if (!disposed) { data.set(result as T); loading.set(false); fetched.set(true); } })
        .catch((err) => { if (!disposed) { error.set(err instanceof Error ? err : new Error(String(err))); loading.set(false); } });
      return;
    }

    const myRequestId = ++requestId;
    loading.set(true);
    error.set(undefined);

    const promise = fetcher();
    (entry as any).promise = promise;

    promise
      .then((result) => {
        if (disposed || myRequestId !== requestId) return;
        data.set(result);
        (entry!.data as Signal<any>).set(result);
        entry!.fetchedAt = Date.now();
        entry!.promise = null;
        loading.set(false);
        fetched.set(true);
      })
      .catch((err) => {
        if (disposed || myRequestId !== requestId) return;
        const e = err instanceof Error ? err : new Error(String(err));
        error.set(e);
        entry!.error.set(e);
        entry!.promise = null;
        loading.set(false);
      });
  }

  // Reactive effect — re-runs when key deps change
  const disposeEffect = effect(() => {
    const enabled = options.enabled === undefined ? true
      : typeof options.enabled === 'function' ? options.enabled() : options.enabled;
    if (!enabled) return;

    const currentKey = resolveKey();
    untrack(() => doFetch(currentKey));
  });

  // Refetch on window focus
  let removeFocusListener: (() => void) | null = null;
  if (options.refetchOnFocus && typeof window !== 'undefined') {
    const onFocus = () => { if (!disposed) doFetch(resolveKey()); };
    window.addEventListener('focus', onFocus);
    removeFocusListener = () => window.removeEventListener('focus', onFocus);
  }

  const result = (() => data()) as QueryResult<T>;
  result.loading = () => loading();
  result.error = () => error();
  result.fetched = () => fetched();
  result.refetch = () => doFetch(resolveKey());
  result.dispose = () => {
    disposed = true;
    disposeEffect();
    if (removeFocusListener) removeFocusListener();
  };

  return result;
}

// --- useMutation ---

export function useMutation<TInput, TResult = unknown>(
  client: QueryClient,
  mutationFn: (input: TInput) => Promise<TResult>,
  options: MutationOptions<TInput, TResult> = {},
): MutationResult<TInput, TResult> {
  const loading = signal(false);
  const error = signal<Error | undefined>(undefined);
  const data = signal<TResult | undefined>(undefined);

  async function execute(input: TInput): Promise<TResult> {
    loading.set(true);
    error.set(undefined);

    if (options.optimistic) {
      options.optimistic(input);
    }

    try {
      const result = await mutationFn(input);
      data.set(result);
      loading.set(false);

      // Invalidate cache keys
      if (options.invalidates) {
        for (const prefix of options.invalidates) {
          client.invalidate(prefix);
        }
      }

      options.onSuccess?.(result, input);
      options.onSettled?.(input);
      return result;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      error.set(e);
      loading.set(false);

      if (options.revertOptimistic) {
        options.revertOptimistic(input);
      }

      options.onError?.(e, input);
      options.onSettled?.(input);
      if (!options.onError) throw e;
      return undefined as unknown as TResult;
    }
  }

  return {
    execute,
    loading: () => loading(),
    error: () => error(),
    data: () => data(),
    reset() { error.set(undefined); data.set(undefined); },
  };
}
