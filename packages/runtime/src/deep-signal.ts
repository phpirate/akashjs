/**
 * Deep reactive signals.
 *
 * Unlike regular signals that are shallow, deepSignal() tracks
 * nested property access and triggers updates when any nested
 * property changes.
 *
 * ```ts
 * const state = deepSignal({ user: { name: 'Alice', age: 30 }, items: [1, 2, 3] });
 * state.user.name;           // 'Alice' (tracked)
 * state.user.name = 'Bob';   // triggers reactivity
 * state.items.push(4);       // triggers reactivity
 * ```
 */

import { signal, computed, batch } from './signals.js';
import { batch as schedulerBatch } from './scheduler.js';

// =========================================================================
// Types
// =========================================================================

export type DeepSignal<T> = T extends object
  ? { [K in keyof T]: DeepSignal<T[K]> } & { readonly $raw: T; readonly $signal: () => T }
  : T;

// =========================================================================
// deepSignal()
// =========================================================================

const SIGNAL_KEY = Symbol('deepSignal');
const RAW_KEY = Symbol('deepRaw');

/**
 * Create a deeply reactive signal. Nested property access is tracked,
 * and setting any nested property triggers updates.
 *
 * ```ts
 * const state = deepSignal({
 *   user: { name: 'Alice', age: 30 },
 *   todos: [{ text: 'Buy milk', done: false }],
 * });
 *
 * effect(() => {
 *   console.log(state.user.name); // re-runs when name changes
 * });
 *
 * state.user.name = 'Bob'; // triggers the effect above
 * ```
 */
export function deepSignal<T extends object>(initialValue: T): DeepSignal<T> {
  const version = signal(0);
  const raw = JSON.parse(JSON.stringify(initialValue));

  function notify(): void {
    version.update((v) => v + 1);
  }

  function createProxy<O extends object>(target: O, path: string[] = []): DeepSignal<O> {
    return new Proxy(target, {
      get(obj, prop, receiver) {
        // Special properties
        if (prop === '$raw') return JSON.parse(JSON.stringify(raw));
        if (prop === '$signal') return () => { version(); return JSON.parse(JSON.stringify(raw)); };
        if (prop === SIGNAL_KEY) return version;
        if (prop === RAW_KEY) return raw;

        const value = Reflect.get(obj, prop, receiver);

        // Track read
        version();

        // Wrap nested objects in proxies
        if (value !== null && typeof value === 'object') {
          return createProxy(value, [...path, String(prop)]);
        }

        return value;
      },

      set(obj, prop, value) {
        const result = Reflect.set(obj, prop, value);
        notify();
        return result;
      },

      deleteProperty(obj, prop) {
        const result = Reflect.deleteProperty(obj, prop);
        notify();
        return result;
      },
    }) as DeepSignal<O>;
  }

  // Wrap arrays to track mutation methods
  if (Array.isArray(raw)) {
    const arrayProxy = createProxy(raw);
    return arrayProxy as DeepSignal<T>;
  }

  return createProxy(raw);
}

/**
 * Get the raw (unwrapped) value from a deep signal.
 */
export function toRaw<T>(proxy: DeepSignal<T>): T {
  return (proxy as any).$raw ?? proxy;
}

/**
 * Check if a value is a deep signal proxy.
 */
export function isDeepSignal(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return false;
  try {
    return (value as any)[SIGNAL_KEY] !== undefined;
  } catch {
    return false;
  }
}
