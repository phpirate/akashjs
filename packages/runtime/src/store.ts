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

import { signal, computed } from './signals.js';
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
  /** Subscribe to all state changes */
  $subscribe(callback: (state: S) => void): () => void;
  /** Get a plain snapshot of current state */
  $snapshot(): S;
  /** Store ID */
  $id: string;
};

export interface StoreDefinition<S, G, A> {
  state: StateFactory<S>;
  getters?: Getters<S, G>;
  actions?: A;
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

  // Create computed getters
  const getterComputeds: Record<string, ReadonlySignal<unknown>> = {};
  if (definition.getters) {
    for (const [key, getterFn] of Object.entries(definition.getters)) {
      getterComputeds[key] = computed(() =>
        (getterFn as Function)(stateSignals),
      );
    }
  }

  // Build the store object
  const store: any = { $id: id };

  // Add state signals
  for (const key of stateKeys) {
    store[key] = stateSignals[key];
  }

  // Add getters
  for (const [key, comp] of Object.entries(getterComputeds)) {
    store[key] = comp;
  }

  // Bind actions with `this` pointing to the store's state signals
  if (definition.actions) {
    for (const [key, actionFn] of Object.entries(definition.actions)) {
      store[key] = (...args: unknown[]) =>
        (actionFn as Function).apply(stateSignals, args);
    }
  }

  // $reset
  store.$reset = () => {
    const fresh = definition.state();
    for (const key of stateKeys) {
      stateSignals[key].set(fresh[key as keyof S]);
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

  // $subscribe
  const subscribers = new Set<(state: S) => void>();
  store.$subscribe = (callback: (state: S) => void): (() => void) => {
    subscribers.add(callback);
    return () => subscribers.delete(callback);
  };

  return store as Store<S, G, A>;
}

/**
 * Clear all store instances (useful for testing).
 */
export function clearStores(): void {
  storeInstances.clear();
}
