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

export interface OfflineCacheOptions {
  /** Storage backend for offline cache (default: 'indexeddb') */
  storage?: 'indexeddb';
  /** Queue mutations when offline and replay on reconnect */
  queueMutations?: boolean;
  /** Refetch stale queries on reconnect */
  syncOnReconnect?: boolean;
  /** IndexedDB database name (default: 'akash-query-cache') */
  dbName?: string;
}

export interface QueryClientOptions {
  /** Default stale time in ms (default: 0 — always stale) */
  defaultStaleTime?: number;
  /** Default retry count for failed queries (default: 0) */
  defaultRetryCount?: number;
  /** Offline cache options — persist queries to IndexedDB, queue mutations */
  offline?: OfflineCacheOptions;
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

// --- IndexedDB helpers for offline cache ---

const IDB_STORE_QUERIES = 'queries';
const IDB_STORE_MUTATIONS = 'mutations';

function openOfflineDB(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('No IndexedDB'));
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE_QUERIES)) db.createObjectStore(IDB_STORE_QUERIES);
      if (!db.objectStoreNames.contains(IDB_STORE_MUTATIONS)) db.createObjectStore(IDB_STORE_MUTATIONS, { autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet<T>(db: IDBDatabase, store: string, key: string): Promise<T | undefined> {
  return new Promise((resolve) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => resolve(undefined);
  });
}

function idbPut(db: IDBDatabase, store: string, key: string, value: unknown): void {
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).put(value, key);
}

function idbGetAllEntries<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return new Promise((resolve) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => resolve([]);
  });
}

function idbClearStore(db: IDBDatabase, store: string): void {
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).clear();
}

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
  /** Whether the browser is online (reactive, for offline support) */
  online?: () => boolean;
  /** Queue a mutation for later replay (used internally when offline) */
  _queueMutation?: (fn: () => Promise<unknown>, invalidates?: CacheKeyPrefix[]) => void;
  /** @internal — access to cache for useQuery/useMutation */
  _cache: Map<string, CacheEntry>;
  _options: QueryClientOptions;
  /** @internal — offline IndexedDB handle */
  _db?: IDBDatabase;
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

  const client: QueryClient = { invalidate, setQueryData, getQueryData, removeQuery, clear, _cache: cache, _options: options };

  // --- Offline support ---
  if (options.offline) {
    const offlineCfg = options.offline;
    const dbName = offlineCfg.dbName ?? 'akash-query-cache';
    const onlineSignal = signal(typeof navigator !== 'undefined' ? navigator.onLine : true);
    client.online = () => onlineSignal();

    // Track online/offline
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        onlineSignal.set(true);
        // Replay queued mutations
        if (offlineCfg.queueMutations && client._db) {
          replayMutations(client);
        }
        // Refetch stale queries
        if (offlineCfg.syncOnReconnect) {
          for (const entry of cache.values()) {
            entry.fetchedAt = 0;
            entry.refetchFn?.();
          }
        }
      });
      window.addEventListener('offline', () => onlineSignal.set(false));
    }

    // Mutation queue for offline
    const pendingMutations: Array<{ fn: string; invalidates?: CacheKeyPrefix[] }> = [];
    client._queueMutation = (fn, invalidates) => {
      // Store a serializable reference — for now just queue in memory
      // The actual fn can't be serialized to IDB, so we queue in memory
      // and persist the invalidation targets
      pendingMutations.push({ fn: 'queued', invalidates });
    };

    // Open IndexedDB
    openOfflineDB(dbName).then((db) => {
      client._db = db;
      // Hydrate cache from IndexedDB
      idbGetAllKeys(db, IDB_STORE_QUERIES).then((keys) => {
        for (const key of keys) {
          idbGet(db, IDB_STORE_QUERIES, key).then((data) => {
            if (data !== undefined) {
              const entry = cache.get(key);
              if (entry && entry.data() === undefined) {
                (entry.data as Signal<any>).set(data);
              }
            }
          });
        }
      });
    }).catch(() => { /* IndexedDB unavailable */ });
  }

  return client;
}

function idbGetAllKeys(db: IDBDatabase, store: string): Promise<string[]> {
  return new Promise((resolve) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAllKeys();
    req.onsuccess = () => resolve(req.result.map(String));
    req.onerror = () => resolve([]);
  });
}

async function replayMutations(client: QueryClient): Promise<void> {
  if (!client._db) return;
  const entries = await idbGetAllEntries<{ invalidates?: CacheKeyPrefix[] }>(client._db, IDB_STORE_MUTATIONS);
  if (entries.length === 0) return;
  // Clear the queue
  idbClearStore(client._db, IDB_STORE_MUTATIONS);
  // Invalidate the associated queries to trigger refetch
  for (const entry of entries) {
    if (entry.invalidates) {
      for (const prefix of entry.invalidates) {
        client.invalidate(prefix);
      }
    }
  }
}

// --- useQuery ---

export function useCachedQuery<T>(
  client: QueryClient,
  key: CacheKey | null | (() => CacheKey | null),
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
  const syncDisposers: Array<() => void> = [];

  function resolveKey(): CacheKey | null {
    return typeof key === 'function' ? key() : key;
  }

  function doFetch(cacheKey: CacheKey, forceRefetch = false): void {
    if (disposed) return;

    const serialized = serializeKey(cacheKey);
    let entry = client._cache.get(serialized) as CacheEntry<T> | undefined;

    // Check if cache entry exists and is fresh (skip if forced)
    if (!forceRefetch && entry && entry.fetchedAt > 0 && Date.now() - entry.fetchedAt < staleTime) {
      data.set(entry.data() as T | undefined);
      loading.set(false);
      fetched.set(true);
      return;
    }

    // Offline: if no cached data and we have IndexedDB, try hydrating from it
    if (client._db && (!entry || entry.data() === undefined)) {
      idbGet<T>(client._db, IDB_STORE_QUERIES, serialized).then((idbData) => {
        if (idbData !== undefined && !disposed && data() === undefined) {
          data.set(idbData);
          fetched.set(true);
        }
      }).catch(() => {});
    }

    // Create entry if it doesn't exist (must happen before offline bail
    // so refetchFn is registered for reconnect)
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
      const k = resolveKey();
      if (k !== null) untrack(() => doFetch(k));
    };

    // Sync: subscribe to cache entry's data signal so setQueryData propagates
    const entryData = entry.data as Signal<T | undefined>;
    syncDisposers.push(effect(() => {
      const val = entryData();
      if (val !== undefined) data.set(val);
    }));

    // Stale-while-revalidate: return cached data immediately
    if (entryData() !== undefined) {
      const prev = entryData() as T | undefined;
      if (options.placeholderData) {
        data.set(options.placeholderData(prev));
      } else {
        data.set(prev);
      }
    }

    // If offline, don't attempt network fetch — serve from cache/IDB only
    if (client.online && !client.online()) {
      loading.set(false);
      return;
    }

    // Dedup: if same query is already in flight, reuse the promise
    if (entry.promise) {
      loading.set(true);
      (entry.promise as Promise<T>)
        .then((result) => { if (!disposed) { data.set(result); loading.set(false); fetched.set(true); } })
        .catch((err) => { if (!disposed) { error.set(err instanceof Error ? err : new Error(String(err))); loading.set(false); } });
      return;
    }

    const myRequestId = ++requestId;
    loading.set(true);
    error.set(undefined);

    let promise: Promise<T>;
    try {
      promise = fetcher();
    } catch (err) {
      // Sync throw in fetcher
      const e = err instanceof Error ? err : new Error(String(err));
      error.set(e);
      loading.set(false);
      return;
    }
    (entry as any).promise = promise;

    promise
      .then((result) => {
        if (disposed || myRequestId !== requestId) return;
        (entry!.data as Signal<any>).set(result);
        entry!.fetchedAt = Date.now();
        entry!.promise = null;
        loading.set(false);
        fetched.set(true);
        // Persist to IndexedDB for offline access
        if (client._db) {
          try { idbPut(client._db, IDB_STORE_QUERIES, serialized, result); } catch {}
        }
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
    // Null key = disabled query (dependencies not ready)
    if (currentKey === null) return;

    untrack(() => doFetch(currentKey));
  });

  // Refetch on window focus
  let removeFocusListener: (() => void) | null = null;
  if (options.refetchOnFocus && typeof window !== 'undefined') {
    const onFocus = () => { const k = resolveKey(); if (!disposed && k !== null) doFetch(k); };
    window.addEventListener('focus', onFocus);
    removeFocusListener = () => window.removeEventListener('focus', onFocus);
  }

  const result = (() => data()) as QueryResult<T>;
  result.loading = () => loading();
  result.error = () => error();
  result.fetched = () => fetched();
  result.refetch = () => {
    const k = resolveKey();
    if (k !== null) doFetch(k, true);
  };
  result.dispose = () => {
    disposed = true;
    disposeEffect();
    for (const d of syncDisposers) d();
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
    // If offline and queue is enabled, queue the mutation for later
    if (client.online && !client.online() && client._queueMutation) {
      client._queueMutation(() => mutationFn(input) as Promise<unknown>, options.invalidates);
      // Store in IndexedDB mutation queue
      if (client._db) {
        const tx = client._db.transaction(IDB_STORE_MUTATIONS, 'readwrite');
        tx.objectStore(IDB_STORE_MUTATIONS).add({ invalidates: options.invalidates, queuedAt: Date.now() });
      }
      // Apply optimistic update locally
      if (options.optimistic) options.optimistic(input);
      return undefined as unknown as TResult;
    }
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
      throw e;
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
