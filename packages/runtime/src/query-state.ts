/**
 * URL-synced reactive state.
 *
 * Automatically sync signal values to URL query parameters.
 * Users can share links, use browser back/forward, and state
 * persists across page reloads — all with zero boilerplate.
 *
 * ```ts
 * const search = useQueryState('q', '');
 * const page = useQueryState('page', 1);
 * const tags = useQueryState('tags', ['js']);
 *
 * search.set('akashjs'); // URL → ?q=akashjs&page=1&tags=js
 * // User hits back → signals update automatically
 * ```
 */

import { signal, effect } from './signals.js';
import { batch } from './scheduler.js';
import type { Signal } from './signals.js';

// =========================================================================
// Types
// =========================================================================

export interface QueryStateOptions<T> {
  /** Custom serializer (default: auto-detect from type) */
  serialize?: (value: T) => string;
  /** Custom deserializer (default: auto-detect from type) */
  deserialize?: (raw: string) => T;
  /** Whether to push or replace history entry (default: 'replace') */
  history?: 'push' | 'replace';
  /** Debounce URL updates in ms (default: 0) */
  debounce?: number;
  /** Remove param from URL when value equals default */
  removeDefault?: boolean;
}

// =========================================================================
// Serializers
// =========================================================================

function defaultSerialize(value: unknown): string {
  if (Array.isArray(value)) return value.join(',');
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

function defaultDeserialize<T>(raw: string, defaultValue: T): T {
  if (typeof defaultValue === 'number') return Number(raw) as T;
  if (typeof defaultValue === 'boolean') return (raw === 'true' || raw === '1') as T;
  if (Array.isArray(defaultValue)) {
    return (raw ? raw.split(',') : []) as T;
  }
  return raw as T;
}

// =========================================================================
// URL helpers
// =========================================================================

function getSearchParams(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

function updateURL(params: URLSearchParams, mode: 'push' | 'replace'): void {
  if (typeof window === 'undefined') return;

  const search = params.toString();
  const url = search ? `${window.location.pathname}?${search}${window.location.hash}` : `${window.location.pathname}${window.location.hash}`;

  if (mode === 'push') {
    window.history.pushState(null, '', url);
  } else {
    window.history.replaceState(null, '', url);
  }
}

// =========================================================================
// useQueryState — single value
// =========================================================================

/** Track active query state signals for popstate sync */
const activeStates = new Map<string, { signal: Signal<any>; deserialize: (raw: string) => any; defaultValue: any }>();
let popstateListening = false;

function ensurePopstateListener(): void {
  if (popstateListening || typeof window === 'undefined') return;
  popstateListening = true;

  window.addEventListener('popstate', () => {
    const params = getSearchParams();
    batch(() => {
      for (const [key, state] of activeStates) {
        const raw = params.get(key);
        const value = raw !== null
          ? state.deserialize(raw)
          : state.defaultValue;
        state.signal.set(value);
      }
    });
  });
}

/**
 * Create a signal synced to a URL query parameter.
 *
 * ```ts
 * const search = useQueryState('q', '');
 * search();            // reads from URL or default
 * search.set('hello'); // updates URL to ?q=hello
 * ```
 */
export function useQueryState<T>(
  key: string,
  defaultValue: T,
  options: QueryStateOptions<T> = {},
): Signal<T> {
  const {
    serialize = (v: T) => defaultSerialize(v),
    deserialize = (raw: string) => defaultDeserialize(raw, defaultValue),
    history: historyMode = 'replace',
    debounce: debounceMs = 0,
    removeDefault = true,
  } = options;

  // Read initial value from URL
  const params = getSearchParams();
  const raw = params.get(key);
  const initialValue = raw !== null ? deserialize(raw) : defaultValue;

  const state = signal<T>(initialValue);

  // Register for popstate sync
  activeStates.set(key, { signal: state, deserialize, defaultValue });
  ensurePopstateListener();

  // Sync signal → URL
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let isInternalUpdate = false;

  const originalSet = state.set;
  state.set = (value: T) => {
    originalSet(value);

    if (isInternalUpdate) return;

    const doUpdate = () => {
      const currentParams = getSearchParams();

      if (removeDefault && value === defaultValue) {
        currentParams.delete(key);
      } else {
        currentParams.set(key, serialize(value));
      }

      updateURL(currentParams, historyMode);
    };

    if (debounceMs > 0) {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(doUpdate, debounceMs);
    } else {
      doUpdate();
    }
  };

  const originalUpdate = state.update;
  state.update = (fn: (prev: T) => T) => {
    state.set(fn(state()));
  };

  return state;
}

// =========================================================================
// useQueryStates — multiple values at once
// =========================================================================

type QueryStateSchema = Record<string, {
  default: unknown;
  serialize?: (value: any) => string;
  deserialize?: (raw: string) => any;
}>;

type QueryStates<T extends QueryStateSchema> = {
  [K in keyof T]: Signal<T[K]['default']>;
};

/**
 * Create multiple URL-synced signals at once.
 * All updates within a batch result in a single URL change.
 *
 * ```ts
 * const { q, page, sort } = useQueryStates({
 *   q: { default: '' },
 *   page: { default: 1 },
 *   sort: { default: 'name' },
 * });
 * ```
 */
export function useQueryStates<T extends QueryStateSchema>(
  schema: T,
  options?: { history?: 'push' | 'replace' },
): QueryStates<T> {
  const result = {} as any;
  for (const [key, config] of Object.entries(schema)) {
    result[key] = useQueryState(key, config.default, {
      serialize: config.serialize,
      deserialize: config.deserialize,
      history: options?.history,
    });
  }
  return result;
}

// =========================================================================
// Utilities
// =========================================================================

/**
 * Remove all query state params from the URL.
 */
export function clearQueryState(): void {
  if (typeof window === 'undefined') return;
  const url = `${window.location.pathname}${window.location.hash}`;
  window.history.replaceState(null, '', url);

  batch(() => {
    for (const [, state] of activeStates) {
      state.signal.set(state.defaultValue);
    }
  });
}

/**
 * Get all current query params as a plain object.
 */
export function getQueryParams(): Record<string, string> {
  const params = getSearchParams();
  const result: Record<string, string> = {};
  params.forEach((value, key) => { result[key] = value; });
  return result;
}

/**
 * Cleanup: remove a specific query state binding.
 */
export function removeQueryState(key: string): void {
  activeStates.delete(key);
}

/**
 * Cleanup all query state bindings (useful for testing).
 */
export function resetQueryState(): void {
  activeStates.clear();
}
