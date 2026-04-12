/**
 * AkashJS DevTools — Console-based debugging utilities.
 *
 * Call `installDevtools()` in development to expose `__AKASH_DEVTOOLS__`
 * on the global object. Access it from the browser console:
 *
 * ```js
 * __AKASH_DEVTOOLS__.stores()       // list all stores
 * __AKASH_DEVTOOLS__.store('cart')   // inspect a store
 * __AKASH_DEVTOOLS__.signals()      // list tracked signals
 * __AKASH_DEVTOOLS__.effects()      // list active effects
 * ```
 */

import { __getStoreInstances } from './store.js';
import type { Store } from './store.js';

// --- Signal/Effect tracking ---

interface TrackedSignal {
  name: string;
  read: () => unknown;
  subscriberCount: number;
}

interface TrackedEffect {
  name: string;
  runCount: number;
  isRender: boolean;
  sourceCount: number;
}

const trackedSignals = new Map<string, TrackedSignal>();
const trackedEffects = new Map<string, TrackedEffect>();
let signalCounter = 0;
let effectCounter = 0;

/** Register a signal for devtools tracking (call in dev mode) */
export function __trackSignal(name: string, read: () => unknown, getSubscriberCount: () => number): void {
  trackedSignals.set(name || `signal_${signalCounter++}`, {
    name,
    read,
    get subscriberCount() { return getSubscriberCount(); },
  } as TrackedSignal);
}

/** Register an effect for devtools tracking */
export function __trackEffect(name: string, meta: { isRender: boolean; getSourceCount: () => number }): () => void {
  const id = name || `effect_${effectCounter++}`;
  const entry: TrackedEffect = {
    name: id,
    runCount: 0,
    isRender: meta.isRender,
    sourceCount: 0,
  };
  trackedEffects.set(id, entry);

  // Return a function to increment run count (called each time effect runs)
  return () => {
    entry.runCount++;
    entry.sourceCount = meta.getSourceCount();
  };
}

// --- Store inspection ---

interface StoreSnapshot {
  $id: string;
  state: Record<string, unknown>;
  getters: Record<string, unknown>;
  actions: string[];
  subscriberCount: number;
}

function inspectStore(id: string): StoreSnapshot | null {
  const instances = __getStoreInstances();
  const store = instances[id];
  if (!store) return null;

  const snapshot = store.$snapshot();
  const state: Record<string, unknown> = {};
  const getters: Record<string, unknown> = {};
  const actions: string[] = [];

  for (const [key, value] of Object.entries(store)) {
    if (key.startsWith('$')) continue;
    if (typeof value === 'function' && 'set' in value && 'update' in value) {
      // Signal
      state[key] = (value as any)();
    } else if (typeof value === 'function' && !('set' in value) && !key.startsWith('$')) {
      // Could be getter (computed) or action
      try {
        const result = (value as any)();
        // If it returns a primitive/object, it's likely a getter
        if (typeof result !== 'undefined') {
          getters[key] = result;
        } else {
          actions.push(key);
        }
      } catch {
        actions.push(key);
      }
    }
  }

  return {
    $id: id,
    state: snapshot,
    getters,
    actions,
    subscriberCount: 0,
  };
}

// --- DevTools API ---

export interface DevToolsAPI {
  /** List all registered stores */
  stores(): string[];
  /** Inspect a specific store by ID */
  store(id: string): StoreSnapshot | null;
  /** Get all store snapshots */
  storeSnapshots(): Record<string, StoreSnapshot>;
  /** List tracked signals with current values */
  signals(): Array<{ name: string; value: unknown; subscribers: number }>;
  /** List tracked effects with run counts */
  effects(): Array<{ name: string; runs: number; isRender: boolean; sources: number }>;
  /** Get framework version info */
  version(): { runtime: string };
  /** Pretty-print store state to console */
  log(storeId?: string): void;
  /** Record store state history for time-travel */
  startRecording(storeId: string): void;
  /** Stop recording and return history */
  stopRecording(storeId: string): Array<{ timestamp: number; state: Record<string, unknown>; action?: string }>;
}

const recordings = new Map<string, Array<{ timestamp: number; state: Record<string, unknown>; action?: string }>>();
const recordingDisposers = new Map<string, () => void>();

function createDevToolsAPI(): DevToolsAPI {
  return {
    stores() {
      return Object.keys(__getStoreInstances());
    },

    store(id: string) {
      return inspectStore(id);
    },

    storeSnapshots() {
      const result: Record<string, StoreSnapshot> = {};
      for (const id of Object.keys(__getStoreInstances())) {
        const snap = inspectStore(id);
        if (snap) result[id] = snap;
      }
      return result;
    },

    signals() {
      return [...trackedSignals.values()].map(s => ({
        name: s.name,
        value: s.read(),
        subscribers: s.subscriberCount,
      }));
    },

    effects() {
      return [...trackedEffects.values()].map(e => ({
        name: e.name,
        runs: e.runCount,
        isRender: e.isRender,
        sources: e.sourceCount,
      }));
    },

    version() {
      return { runtime: '0.1.26' };
    },

    log(storeId?: string) {
      if (storeId) {
        const snap = inspectStore(storeId);
        if (snap) {
          console.group(`🔍 Store: ${storeId}`);
          console.log('State:', snap.state);
          console.log('Getters:', snap.getters);
          console.log('Actions:', snap.actions);
          console.groupEnd();
        } else {
          console.warn(`Store "${storeId}" not found. Available:`, Object.keys(__getStoreInstances()));
        }
      } else {
        const stores = Object.keys(__getStoreInstances());
        console.group('🔍 AkashJS Stores');
        for (const id of stores) {
          const snap = inspectStore(id);
          if (snap) {
            console.group(id);
            console.log('State:', snap.state);
            console.log('Getters:', snap.getters);
            console.groupEnd();
          }
        }
        console.groupEnd();
      }
    },

    startRecording(storeId: string) {
      const store = __getStoreInstances()[storeId];
      if (!store) {
        console.warn(`Store "${storeId}" not found.`);
        return;
      }

      const history: Array<{ timestamp: number; state: Record<string, unknown>; action?: string }> = [];
      // Record initial state
      history.push({ timestamp: Date.now(), state: store.$snapshot() });

      const unsubscribe = store.$subscribe((state) => {
        history.push({ timestamp: Date.now(), state: { ...state } });
      });

      recordings.set(storeId, history);
      recordingDisposers.set(storeId, unsubscribe);
      console.log(`⏺ Recording store "${storeId}". Call __AKASH_DEVTOOLS__.stopRecording("${storeId}") to view history.`);
    },

    stopRecording(storeId: string) {
      const disposer = recordingDisposers.get(storeId);
      if (disposer) disposer();
      recordingDisposers.delete(storeId);

      const history = recordings.get(storeId) ?? [];
      recordings.delete(storeId);

      console.log(`⏹ Stopped recording "${storeId}". ${history.length} snapshots captured.`);
      console.table(history.map((h, i) => ({
        '#': i,
        time: new Date(h.timestamp).toISOString().slice(11, 23),
        state: JSON.stringify(h.state),
      })));

      return history;
    },
  };
}

/**
 * Install AkashJS DevTools on the global object.
 * Call this in your app's entry point during development:
 *
 * ```ts
 * import { installDevtools } from '@akashjs/runtime';
 * if (import.meta.env.DEV) installDevtools();
 * ```
 */
export function installDevtools(): void {
  const api = createDevToolsAPI();

  if (typeof globalThis !== 'undefined') {
    (globalThis as any).__AKASH_DEVTOOLS__ = api;
    console.log(
      '%c🔧 AkashJS DevTools installed. Access via __AKASH_DEVTOOLS__ in console.',
      'color: #7c3aed; font-weight: bold;'
    );
    console.log('  .stores()              — list stores');
    console.log('  .store("id")           — inspect store');
    console.log('  .log()                 — pretty-print all stores');
    console.log('  .log("id")             — pretty-print one store');
    console.log('  .startRecording("id")  — record state changes');
    console.log('  .stopRecording("id")   — view recorded history');
    console.log('  .signals()             — list tracked signals');
    console.log('  .effects()             — list tracked effects');
  }
}
