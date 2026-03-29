/**
 * Reactive composables — signal-based utility functions.
 *
 * Timers, debounce, throttle, and other commonly needed
 * reactive primitives that every app uses.
 */

import { signal, effect } from './signals.js';
import type { Signal, ReadonlySignal } from './signals.js';

// --- useInterval ---

/**
 * Create a reactive interval that ticks at a given rate.
 *
 * ```ts
 * const { count, pause, resume, reset } = useInterval(1000);
 * count(); // increments every second
 * ```
 */
export function useInterval(ms: number, options?: { immediate?: boolean }) {
  const count = signal(0);
  const isActive = signal(options?.immediate !== false);
  let timer: ReturnType<typeof setInterval> | null = null;

  function start() {
    stop();
    timer = setInterval(() => count.update((c) => c + 1), ms);
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  if (isActive()) start();

  return {
    count: (() => count()) as ReadonlySignal<number>,
    isActive: (() => isActive()) as ReadonlySignal<boolean>,
    pause() { isActive.set(false); stop(); },
    resume() { isActive.set(true); start(); },
    reset() { count.set(0); },
    dispose() { stop(); },
  };
}

// --- useTimeout ---

/**
 * Reactive timeout that exposes ready state.
 *
 * ```ts
 * const { ready, restart } = useTimeout(3000);
 * ready(); // false, then true after 3s
 * ```
 */
export function useTimeout(ms: number) {
  const ready = signal(false);
  let timer: ReturnType<typeof setTimeout> | null = null;

  function start() {
    stop();
    ready.set(false);
    timer = setTimeout(() => ready.set(true), ms);
  }

  function stop() {
    if (timer) { clearTimeout(timer); timer = null; }
  }

  start();

  return {
    ready: (() => ready()) as ReadonlySignal<boolean>,
    restart() { start(); },
    dispose() { stop(); },
  };
}

// --- useDebounce ---

/**
 * Debounce a signal value. The output updates only after the input
 * stops changing for the given delay.
 *
 * ```ts
 * const search = signal('');
 * const debouncedSearch = useDebounce(search, 300);
 * // debouncedSearch() updates 300ms after last search.set()
 * ```
 */
export function useDebounce<T>(source: () => T, delay: number): ReadonlySignal<T> {
  const debounced = signal<T>(source());
  let timer: ReturnType<typeof setTimeout> | null = null;

  effect(() => {
    const value = source();
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => debounced.set(value), delay);
  });

  return (() => debounced()) as ReadonlySignal<T>;
}

// --- useThrottle ---

/**
 * Throttle a signal value. The output updates at most once per interval.
 *
 * ```ts
 * const scrollY = signal(0);
 * const throttled = useThrottle(scrollY, 100);
 * ```
 */
export function useThrottle<T>(source: () => T, interval: number): ReadonlySignal<T> {
  const throttled = signal<T>(source());
  let lastUpdate = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  effect(() => {
    const value = source();
    const now = Date.now();
    const elapsed = now - lastUpdate;

    if (elapsed >= interval) {
      throttled.set(value);
      lastUpdate = now;
    } else {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        throttled.set(value);
        lastUpdate = Date.now();
      }, interval - elapsed);
    }
  });

  return (() => throttled()) as ReadonlySignal<T>;
}

// --- useCounter ---

/**
 * Simple reactive counter with inc/dec/set/reset.
 *
 * ```ts
 * const { count, inc, dec, set, reset } = useCounter(0);
 * ```
 */
export function useCounter(initial = 0) {
  const count = signal(initial);
  return {
    count: (() => count()) as ReadonlySignal<number>,
    inc(delta = 1) { count.update((c) => c + delta); },
    dec(delta = 1) { count.update((c) => c - delta); },
    set(value: number) { count.set(value); },
    reset() { count.set(initial); },
  };
}

// --- useToggle ---

/**
 * Reactive boolean toggle.
 *
 * ```ts
 * const { value, toggle, setTrue, setFalse } = useToggle(false);
 * ```
 */
export function useToggle(initial = false) {
  const value = signal(initial);
  return {
    value: (() => value()) as ReadonlySignal<boolean>,
    toggle() { value.update((v) => !v); },
    setTrue() { value.set(true); },
    setFalse() { value.set(false); },
  };
}

// --- usePrevious ---

/**
 * Track the previous value of a signal.
 *
 * ```ts
 * const count = signal(0);
 * const prev = usePrevious(count);
 * count.set(1);
 * prev(); // 0
 * ```
 */
export function usePrevious<T>(source: () => T): ReadonlySignal<T | undefined> {
  let lastValue: T | undefined;
  const tracked = signal<T | undefined>(undefined);

  effect(() => {
    const current = source();
    tracked.set(lastValue);
    lastValue = current;
  });

  return (() => tracked()) as ReadonlySignal<T | undefined>;
}
