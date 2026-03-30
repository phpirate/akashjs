/**
 * watch() — react to signal changes with old/new values.
 *
 * Unlike effect() which just re-runs, watch() gives you the previous
 * and current value so you can react to *what changed*.
 *
 * ```ts
 * const count = signal(0);
 * watch(count, (newVal, oldVal) => {
 *   console.log(`Changed from ${oldVal} to ${newVal}`);
 * });
 *
 * // With options:
 * watch(count, callback, { immediate: true, once: true });
 *
 * // Multiple sources:
 * watch([count, name], ([newCount, newName], [oldCount, oldName]) => { ... });
 * ```
 */

import { effect } from './signals.js';

// =========================================================================
// Types
// =========================================================================

export interface WatchOptions {
  /** Run callback immediately with current value (default: false) */
  immediate?: boolean;
  /** Only fire once, then auto-dispose (default: false) */
  once?: boolean;
  /** Debounce callback in ms */
  debounce?: number;
  /** Deep comparison for objects (default: false) */
  deep?: boolean;
}

export type WatchSource<T> = () => T;
export type WatchCallback<T> = (newValue: T, oldValue: T | undefined) => void;
export type WatchArrayCallback<T extends unknown[]> = (newValues: T, oldValues: (T[number] | undefined)[]) => void;

// =========================================================================
// watch() — single source
// =========================================================================

/**
 * Watch a reactive source and call back with old + new values.
 *
 * ```ts
 * const dispose = watch(count, (newVal, oldVal) => {
 *   analytics.track('count_changed', { from: oldVal, to: newVal });
 * });
 * ```
 */
export function watch<T>(
  source: WatchSource<T>,
  callback: WatchCallback<T>,
  options?: WatchOptions,
): () => void;

/**
 * Watch multiple sources.
 */
export function watch<T extends unknown[]>(
  sources: { [K in keyof T]: WatchSource<T[K]> },
  callback: WatchArrayCallback<T>,
  options?: WatchOptions,
): () => void;

export function watch(
  source: WatchSource<any> | WatchSource<any>[],
  callback: any,
  options: WatchOptions = {},
): () => void {
  const { immediate = false, once = false, debounce: debounceMs, deep = false } = options;

  const isMulti = Array.isArray(source);
  const sources = isMulti ? source : [source];

  let oldValues: any[] = sources.map(() => undefined);
  let isFirst = true;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;
  let disposeEffect: (() => void) | null = null;

  const dispose = () => {
    disposed = true;
    if (debounceTimer) clearTimeout(debounceTimer);
    disposeEffect?.();
  };

  disposeEffect = effect(() => {
    // Read all sources to establish tracking
    const newValues = sources.map((s) => s());

    if (isFirst) {
      isFirst = false;
      oldValues = deep ? newValues.map(deepClone) : [...newValues];

      if (immediate) {
        fireCallback(newValues, sources.map(() => undefined));
      }
      return;
    }

    // Check if anything actually changed
    const changed = deep
      ? newValues.some((v, i) => !deepEqual(v, oldValues[i]))
      : newValues.some((v, i) => !Object.is(v, oldValues[i]));

    if (!changed) return;

    const prevValues = [...oldValues];
    oldValues = deep ? newValues.map(deepClone) : [...newValues];

    fireCallback(newValues, prevValues);
  });

  function fireCallback(newVals: any[], oldVals: any[]): void {
    if (disposed) return;

    const doCall = () => {
      if (once) {
        // Dispose BEFORE calling callback so any signal writes in the
        // callback don't re-trigger this watcher
        disposed = true;
        queueMicrotask(dispose);
      }

      if (isMulti) {
        callback(newVals, oldVals);
      } else {
        callback(newVals[0], oldVals[0]);
      }
    };

    if (debounceMs && debounceMs > 0) {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(doCall, debounceMs);
    } else {
      doCall();
    }
  }

  return dispose;
}

// =========================================================================
// watchOnce — convenience
// =========================================================================

/**
 * Watch a source once, then auto-dispose.
 *
 * ```ts
 * watchOnce(isReady, (ready) => {
 *   if (ready) initApp();
 * });
 * ```
 */
export function watchOnce<T>(
  source: WatchSource<T>,
  callback: WatchCallback<T>,
): () => void {
  return watch(source, callback, { once: true });
}

// =========================================================================
// watchDebounced — convenience
// =========================================================================

/**
 * Watch with built-in debounce.
 *
 * ```ts
 * watchDebounced(searchInput, (query) => {
 *   fetchResults(query);
 * }, 300);
 * ```
 */
export function watchDebounced<T>(
  source: WatchSource<T>,
  callback: WatchCallback<T>,
  ms: number,
): () => void {
  return watch(source, callback, { debounce: ms });
}

// =========================================================================
// Helpers
// =========================================================================

function deepClone<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}
