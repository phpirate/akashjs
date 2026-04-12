/**
 * Global state management via defineStore().
 *
 * Stores are singleton signal containers that persist across
 * components. They provide shared state, computed getters,
 * and actions — no external library needed.
 *
 * ```ts
 * const useCounterStore = defineStore('counter', {
 *   state: () => ({ count: 0, name: 'Counter' }),
 *   getters: {
 *     doubled: (state) => state.count() * 2,
 *   },
 *   actions: {
 *     increment() { this.count.update(c => c + 1); },
 *     reset() { this.count.set(0); },
 *   },
 * });
 *
 * // In any component:
 * const store = useCounterStore();
 * store.count();     // 0
 * store.doubled();   // 0
 * store.increment();
 * store.count();     // 1
 * ```
 */

import { signal, computed, effect } from './signals.js';
import type { Signal, ReadonlySignal } from './signals.js';

// --- Types ---

type StateFactory<S> = () => S;

type Getters<S, G> = {
  [K in keyof G]: (state: SignalifiedState<S>) => G[K];
};

type Actions<A> = {
  [K in keyof A]: A[K] extends (...args: infer P) => infer R
    ? (...args: P) => R
    : never;
};

/** Maps plain state values to signals */
type SignalifiedState<S> = {
  [K in keyof S]: Signal<S[K]>;
};

/** The store instance returned to consumers */
export type Store<S, G, A> = SignalifiedState<S> & {
  [K in keyof G]: ReadonlySignal<G[K]>;
} & {
  [K in keyof A]: A[K] extends (...args: infer P) => infer R
    ? (...args: P) => R
    : never;
} & {
  /** Reset all state to initial values */
  $reset(): void;
  /** Merge partial state into the store, or apply changes via callback */
  $patch(partialOrFn: Partial<S> | ((state: SignalifiedState<S>) => void)): void;
  /** Subscribe to all state changes */
  $subscribe(callback: (state: S) => void): () => void;
  /** Get a plain snapshot of current state */
  $snapshot(): S;
  /** Store ID */
  $id: string;
};

export interface PersistOptions<S> {
  /** Only persist these state keys (default: all) */
  pick?: (keyof S)[];
  /** Storage backend (default: 'localStorage') */
  storage?: 'localStorage' | 'sessionStorage';
  /** Custom storage key (default: 'akash-store:{storeId}') */
  key?: string;
  /** Custom serializer (default: JSON.stringify) */
  serialize?: (value: unknown) => string;
  /** Custom deserializer (default: JSON.parse) */
  deserialize?: (value: string) => unknown;
}

export interface StoreDefinition<S, G, A> {
  state: StateFactory<S>;
  getters?: Getters<S, G>;
  actions?: A & ThisType<
    SignalifiedState<S> &
    { [K in keyof G]: ReadonlySignal<G[K]> } &
    A
  >;
  plugins?: StorePlugin[];
  /** Auto-persist state to storage. true = persist all to localStorage. */
  persist?: boolean | PersistOptions<S> | PersistOptions<S>[];
}

// --- Plugin system ---

export interface StorePlugin {
  init?(store: Store<any, any, any>): void;
  onAction?(store: Store<any, any, any>, actionName: string, args: unknown[]): void;
}

const globalPlugins: StorePlugin[] = [];

/** Register global plugins that apply to all stores */
export function configureStores(options: { plugins: StorePlugin[] }): void {
  globalPlugins.push(...options.plugins);
}

// --- Store registry (singleton) ---

const storeInstances = new Map<string, Store<any, any, any>>();

// --- defineStore ---

/**
 * Define a global store. Returns a composable function that
 * always returns the same store instance (singleton).
 */
export function defineStore<
  S extends Record<string, unknown>,
  G extends Record<string, unknown> = {},
  A extends Record<string, (...args: any[]) => any> = {},
>(
  id: string,
  definition: StoreDefinition<S, G, A>,
): () => Store<S, G, A> {
  return () => {
    // Return existing instance if already created
    if (storeInstances.has(id)) {
      return storeInstances.get(id) as Store<S, G, A>;
    }

    const initialState = definition.state();
    const store = createStoreInstance(id, initialState, definition);
    storeInstances.set(id, store);
    return store;
  };
}

function createStoreInstance<
  S extends Record<string, unknown>,
  G extends Record<string, unknown>,
  A extends Record<string, (...args: any[]) => any>,
>(
  id: string,
  initialState: S,
  definition: StoreDefinition<S, G, A>,
): Store<S, G, A> {
  // Create signals for each state property
  const stateSignals: Record<string, Signal<unknown>> = {};
  const stateKeys = Object.keys(initialState);

  for (const key of stateKeys) {
    stateSignals[key] = signal(initialState[key]);
  }

  // Build the store object first so getters can reference other getters via `this`
  const store: any = { $id: id };

  // Add state signals
  for (const key of stateKeys) {
    store[key] = stateSignals[key];
  }

  // Create computed getters — bound to store so `this.otherGetter()` works
  if (definition.getters) {
    for (const [key, getterFn] of Object.entries(definition.getters)) {
      store[key] = computed(() =>
        (getterFn as Function).call(store, stateSignals),
      );
    }
  }

  // Collect all plugins (global + per-store)
  const plugins = [...globalPlugins, ...(definition.plugins ?? [])];

  // Bind actions with `this` pointing to the full store (state + getters + actions)
  if (definition.actions) {
    for (const [key, actionFn] of Object.entries(definition.actions)) {
      store[key] = (...args: unknown[]) => {
        for (const plugin of plugins) plugin.onAction?.(store, key, args);
        return (actionFn as Function).apply(store, args);
      };
    }
  }

  // $reset
  store.$reset = () => {
    const fresh = definition.state();
    for (const key of stateKeys) {
      stateSignals[key].set(fresh[key as keyof S]);
    }
  };

  // $patch — merge partial state or apply via callback
  store.$patch = (partialOrFn: Partial<S> | ((state: any) => void)) => {
    if (typeof partialOrFn === 'function') {
      partialOrFn(stateSignals);
    } else {
      for (const [key, value] of Object.entries(partialOrFn)) {
        if (key in stateSignals) {
          stateSignals[key].set(value);
        }
      }
    }
  };

  // $snapshot
  store.$snapshot = (): S => {
    const snapshot: Record<string, unknown> = {};
    for (const key of stateKeys) {
      snapshot[key] = stateSignals[key]();
    }
    return snapshot as S;
  };

  // $subscribe — watch all state signals and notify on change
  const subscribers = new Set<(state: S) => void>();
  let subscribeEffect: (() => void) | null = null;
  store.$subscribe = (callback: (state: S) => void): (() => void) => {
    subscribers.add(callback);
    // Start watching if this is the first subscriber
    if (!subscribeEffect) {
      let isInitial = true;
      subscribeEffect = effect(() => {
        // Read all state signals to track them
        for (const key of stateKeys) {
          stateSignals[key]();
        }
        // Skip initial run — only notify on actual changes
        if (isInitial) {
          isInitial = false;
          return;
        }
        const snapshot = store.$snapshot();
        for (const cb of subscribers) {
          cb(snapshot);
        }
      });
    }
    return () => {
      subscribers.delete(callback);
      // Dispose effect when no subscribers remain
      if (subscribers.size === 0 && subscribeEffect) {
        subscribeEffect();
        subscribeEffect = null;
      }
    };
  };

  // --- Persistence ---
  if (definition.persist && typeof window !== 'undefined') {
    const configs = normalizePersistConfigs(id, definition.persist);
    for (const cfg of configs) {
      const storage = cfg.storage === 'sessionStorage' ? sessionStorage : localStorage;
      const serialize = cfg.serialize ?? JSON.stringify;
      const deserialize = cfg.deserialize ?? JSON.parse;
      const persistKeys = cfg.pick ?? stateKeys;

      // Hydrate: read from storage and merge into state
      try {
        const raw = storage.getItem(cfg.key);
        if (raw) {
          const saved = deserialize(raw) as Record<string, unknown>;
          for (const key of persistKeys as string[]) {
            if (key in saved && key in stateSignals) {
              stateSignals[key].set(saved[key]);
            }
          }
        }
      } catch { /* corrupt storage — ignore */ }

      // Write: subscribe to state changes and persist (debounced via microtask)
      // The effect tracks signals to detect changes; the microtask reads
      // fresh values so sequential updates in the same tick are all captured.
      let persistScheduled = false;
      let isInitialPersist = true;
      effect(() => {
        // Track the persisted signals (read them so the effect re-runs on change)
        for (const key of persistKeys as string[]) {
          if (key in stateSignals) stateSignals[key]();
        }
        // Skip the initial run (hydration just happened, don't write stale defaults)
        if (isInitialPersist) { isInitialPersist = false; return; }
        // Schedule a microtask to capture the LATEST values after all sync updates
        if (!persistScheduled) {
          persistScheduled = true;
          queueMicrotask(() => {
            persistScheduled = false;
            // Read fresh values NOW, not when the effect ran
            const snapshot: Record<string, unknown> = {};
            for (const key of persistKeys as string[]) {
              if (key in stateSignals) snapshot[key] = stateSignals[key].peek();
            }
            try { storage.setItem(cfg.key, serialize(snapshot)); } catch { /* quota exceeded */ }
          });
        }
      });

      // Cross-tab sync: listen for storage events from other tabs
      if (cfg.storage !== 'sessionStorage') {
        window.addEventListener('storage', (e) => {
          if (e.key !== cfg.key || !e.newValue) return;
          try {
            const updated = deserialize(e.newValue) as Record<string, unknown>;
            for (const key of persistKeys as string[]) {
              if (key in updated && key in stateSignals) {
                stateSignals[key].set(updated[key]);
              }
            }
          } catch { /* ignore parse errors */ }
        });
      }
    }
  }

  // Initialize plugins
  for (const plugin of plugins) plugin.init?.(store);

  return store as Store<S, G, A>;
}

function normalizePersistConfigs<S>(id: string, persist: boolean | PersistOptions<S> | PersistOptions<S>[]): Array<PersistOptions<S> & { key: string }> {
  if (persist === true) {
    return [{ key: `akash-store:${id}` }];
  }
  if (persist === false) return [];
  if (Array.isArray(persist)) {
    return persist.map((p, i) => ({ ...p, key: p.key ?? `akash-store:${id}:${i}` }));
  }
  return [{ ...persist, key: persist.key ?? `akash-store:${id}` }];
}

/**
 * Clear all store instances (useful for testing).
 */
export function clearStores(): void {
  storeInstances.clear();
}

/** @internal — exposes store registry for devtools */
export function __getStoreInstances(): Record<string, Store<any, any, any>> {
  return Object.fromEntries(storeInstances);
}
