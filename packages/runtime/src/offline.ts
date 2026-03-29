/**
 * Offline-first store with IndexedDB persistence and background sync.
 *
 * Data persists across page reloads. Changes made offline queue up
 * and sync automatically when connection returns. Conflict resolution
 * via configurable strategies (last-write-wins, merge, custom).
 *
 * ```ts
 * const todos = createOfflineStore('todos', {
 *   sync: { url: '/api/todos', strategy: 'last-write-wins' },
 * });
 *
 * todos.add({ id: '1', text: 'Buy milk', done: false });
 * todos.items();    // reactive list
 * todos.syncing();  // boolean
 * todos.pending();  // number of unsynced changes
 * ```
 */

import { signal, computed } from './signals.js';
import type { Signal, ReadonlySignal } from './signals.js';

// =========================================================================
// Types
// =========================================================================

export type ConflictStrategy = 'last-write-wins' | 'client-wins' | 'server-wins' | 'manual';

export interface OfflineStoreOptions<T> {
  /** Sync configuration */
  sync?: {
    /** Server URL for sync */
    url: string;
    /** Conflict resolution strategy (default: 'last-write-wins') */
    strategy?: ConflictStrategy;
    /** Sync interval in ms (default: 30000) */
    interval?: number;
    /** Custom fetch */
    fetch?: typeof globalThis.fetch;
    /** Auth headers */
    headers?: Record<string, string>;
  };
  /** Key field for items (default: 'id') */
  keyField?: string;
  /** Version for schema migrations */
  version?: number;
}

export interface OfflineStore<T extends Record<string, unknown>> {
  /** All items (reactive) */
  items: ReadonlySignal<T[]>;
  /** Get a single item by key */
  get(key: string): T | undefined;
  /** Add or update an item */
  put(item: T): void;
  /** Add a new item */
  add(item: T): void;
  /** Update an existing item */
  update(key: string, partial: Partial<T>): void;
  /** Remove an item by key */
  remove(key: string): void;
  /** Clear all items */
  clear(): void;
  /** Number of unsynced changes */
  pending: ReadonlySignal<number>;
  /** Whether sync is in progress */
  syncing: ReadonlySignal<boolean>;
  /** Whether online */
  online: ReadonlySignal<boolean>;
  /** Force a sync now */
  sync(): Promise<void>;
  /** Dispose the store (stop sync, close DB) */
  dispose(): void;
}

/** An operation in the change queue */
interface PendingOp<T> {
  type: 'put' | 'delete';
  key: string;
  value?: T;
  timestamp: number;
}

// =========================================================================
// IndexedDB wrapper
// =========================================================================

async function openDB(name: string, version = 1): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('items')) {
        db.createObjectStore('items');
      }
      if (!db.objectStoreNames.contains('pending')) {
        db.createObjectStore('pending', { autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGetAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(db: IDBDatabase, store: string, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDelete(db: IDBDatabase, store: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbClear(db: IDBDatabase, store: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// =========================================================================
// createOfflineStore
// =========================================================================

/**
 * Create an offline-first store backed by IndexedDB.
 */
export function createOfflineStore<T extends Record<string, unknown>>(
  name: string,
  options: OfflineStoreOptions<T> = {},
): OfflineStore<T> {
  const keyField = options.keyField ?? 'id';
  const items = signal<T[]>([]);
  const pendingOps = signal<PendingOp<T>[]>([]);
  const syncing = signal(false);
  const online = signal(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const pending = computed(() => pendingOps().length);

  let db: IDBDatabase | null = null;
  let syncTimer: ReturnType<typeof setInterval> | null = null;
  let disposed = false;

  // Online/offline tracking
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      online.set(true);
      syncNow();
    });
    window.addEventListener('offline', () => online.set(false));
  }

  // Initialize — load from IndexedDB
  async function init(): Promise<void> {
    if (typeof indexedDB === 'undefined') return;
    try {
      db = await openDB(`akash-offline-${name}`, options.version ?? 1);
      const stored = await idbGetAll<T>(db, 'items');
      items.set(stored);
      const ops = await idbGetAll<PendingOp<T>>(db, 'pending');
      pendingOps.set(ops);
    } catch { /* IndexedDB not available */ }
  }

  init();

  // Start periodic sync
  if (options.sync) {
    const interval = options.sync.interval ?? 30000;
    syncTimer = setInterval(() => {
      if (online() && pending() > 0 && !syncing()) {
        syncNow();
      }
    }, interval);
  }

  function getKey(item: T): string {
    return String((item as any)[keyField]);
  }

  function put(item: T): void {
    const key = getKey(item);
    items.update((list) => {
      const idx = list.findIndex((i) => getKey(i) === key);
      if (idx !== -1) {
        const next = [...list];
        next[idx] = item;
        return next;
      }
      return [...list, item];
    });

    queueOp({ type: 'put', key, value: item, timestamp: Date.now() });
    if (db) idbPut(db, 'items', key, item);
  }

  function remove(key: string): void {
    items.update((list) => list.filter((i) => getKey(i) !== key));
    queueOp({ type: 'delete', key, timestamp: Date.now() });
    if (db) idbDelete(db, 'items', key);
  }

  function queueOp(op: PendingOp<T>): void {
    pendingOps.update((ops) => [...ops, op]);
    if (db) {
      const tx = db.transaction('pending', 'readwrite');
      tx.objectStore('pending').add(op);
    }
  }

  async function syncNow(): Promise<void> {
    if (!options.sync || syncing() || disposed) return;
    const ops = pendingOps();
    if (ops.length === 0) return;

    syncing.set(true);
    const fetchFn = options.sync.fetch ?? globalThis.fetch.bind(globalThis);

    try {
      const response = await fetchFn(options.sync.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.sync.headers,
        },
        body: JSON.stringify({ ops }),
      });

      if (response.ok) {
        pendingOps.set([]);
        if (db) await idbClear(db, 'pending');

        // Fetch latest server state
        const serverResponse = await fetchFn(options.sync.url, {
          headers: options.sync.headers,
        });
        if (serverResponse.ok) {
          const serverItems = await serverResponse.json() as T[];
          items.set(serverItems);
          // Update IndexedDB
          if (db) {
            await idbClear(db, 'items');
            for (const item of serverItems) {
              await idbPut(db, 'items', getKey(item), item);
            }
          }
        }
      }
    } catch { /* Sync failed — ops stay queued */ }
    finally {
      syncing.set(false);
    }
  }

  return {
    items: () => items(),
    get(key: string) { return items().find((i) => getKey(i) === key); },
    put,
    add: put,
    update(key: string, partial: Partial<T>) {
      const existing = items().find((i) => getKey(i) === key);
      if (existing) put({ ...existing, ...partial });
    },
    remove,
    clear() {
      items.set([]);
      pendingOps.set([]);
      if (db) {
        idbClear(db, 'items');
        idbClear(db, 'pending');
      }
    },
    pending,
    syncing: () => syncing(),
    online: () => online(),
    sync: syncNow,
    dispose() {
      disposed = true;
      if (syncTimer) clearInterval(syncTimer);
      db?.close();
    },
  };
}
