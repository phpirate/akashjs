/**
 * Browser API composables.
 *
 * Signal-based wrappers for common browser APIs.
 * All composables are SSR-safe — they return fallback values
 * when `window` is not available.
 */

import { signal, effect } from './signals.js';
import type { Signal, ReadonlySignal } from './signals.js';

// --- useMediaQuery ---

/**
 * Reactive media query matcher.
 *
 * ```ts
 * const isMobile = useMediaQuery('(max-width: 768px)');
 * isMobile(); // true/false, updates on resize
 * ```
 */
export function useMediaQuery(query: string): ReadonlySignal<boolean> {
  if (typeof window === 'undefined') {
    return (() => false) as ReadonlySignal<boolean>;
  }

  const mql = window.matchMedia(query);
  const matches = signal(mql.matches);

  const handler = (e: MediaQueryListEvent) => matches.set(e.matches);
  mql.addEventListener('change', handler);

  return (() => matches()) as ReadonlySignal<boolean>;
}

// --- useBreakpoint ---

export interface Breakpoints {
  [name: string]: number;
}

const DEFAULT_BREAKPOINTS: Breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

/**
 * Reactive breakpoint tracker (Tailwind-style).
 *
 * ```ts
 * const bp = useBreakpoint();
 * bp.current();  // 'md'
 * bp.gte('lg');  // false
 * bp.lt('sm');   // false
 * ```
 */
export function useBreakpoint(breakpoints: Breakpoints = DEFAULT_BREAKPOINTS) {
  const sorted = Object.entries(breakpoints).sort((a, b) => a[1] - b[1]);
  const width = signal(typeof window !== 'undefined' ? window.innerWidth : 1024);

  if (typeof window !== 'undefined') {
    const handler = () => width.set(window.innerWidth);
    window.addEventListener('resize', handler, { passive: true });
  }

  function current(): string {
    const w = width();
    let result = '';
    for (const [name, min] of sorted) {
      if (w >= min) result = name;
    }
    return result || sorted[0]?.[0] || '';
  }

  function gte(name: string): boolean {
    const bp = breakpoints[name];
    return bp !== undefined && width() >= bp;
  }

  function lt(name: string): boolean {
    const bp = breakpoints[name];
    return bp !== undefined && width() < bp;
  }

  return { current, gte, lt, width: (() => width()) as ReadonlySignal<number> };
}

// --- useStorage ---

/**
 * Signal backed by localStorage or sessionStorage.
 * Persists across page refreshes.
 *
 * ```ts
 * const name = useStorage('user-name', 'Guest');
 * name();       // reads from localStorage or 'Guest'
 * name.set('Alice'); // writes to localStorage
 * ```
 */
export function useStorage<T>(
  key: string,
  initialValue: T,
  storage: 'local' | 'session' = 'local',
): Signal<T> {
  const store = typeof window !== 'undefined'
    ? (storage === 'local' ? localStorage : sessionStorage)
    : null;

  // Read existing value
  let startValue = initialValue;
  if (store) {
    try {
      const raw = store.getItem(key);
      if (raw !== null) startValue = JSON.parse(raw);
    } catch { /* use initial */ }
  }

  const state = signal<T>(startValue);

  // Sync writes to storage
  if (store) {
    effect(() => {
      const value = state();
      try {
        store.setItem(key, JSON.stringify(value));
      } catch { /* storage full */ }
    });

    // Listen for changes from other tabs
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === key && e.newValue !== null) {
          try {
            state.set(JSON.parse(e.newValue));
          } catch { /* ignore */ }
        }
      });
    }
  }

  return state;
}

// --- useClipboard ---

/**
 * Reactive clipboard access.
 *
 * ```ts
 * const { text, copy, copied } = useClipboard();
 * await copy('Hello');
 * copied(); // true for 2 seconds
 * ```
 */
export function useClipboard(options?: { timeout?: number }) {
  const text = signal('');
  const copied = signal(false);
  const timeout = options?.timeout ?? 2000;
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function copy(value: string): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    await navigator.clipboard.writeText(value);
    text.set(value);
    copied.set(true);
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => copied.set(false), timeout);
  }

  return {
    text: (() => text()) as ReadonlySignal<string>,
    copied: (() => copied()) as ReadonlySignal<boolean>,
    copy,
  };
}

// --- useOnline ---

/**
 * Reactive online/offline status.
 *
 * ```ts
 * const online = useOnline();
 * online(); // true/false
 * ```
 */
export function useOnline(): ReadonlySignal<boolean> {
  if (typeof window === 'undefined') {
    return (() => true) as ReadonlySignal<boolean>;
  }

  const online = signal(navigator.onLine);
  window.addEventListener('online', () => online.set(true));
  window.addEventListener('offline', () => online.set(false));

  return (() => online()) as ReadonlySignal<boolean>;
}

// --- useGeolocation ---

export interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: GeolocationPositionError | null;
  loading: boolean;
}

/**
 * Reactive geolocation.
 *
 * ```ts
 * const geo = useGeolocation();
 * geo().latitude;  // number | null
 * geo().loading;   // boolean
 * ```
 */
export function useGeolocation(
  options?: PositionOptions,
): ReadonlySignal<GeolocationState> {
  const state = signal<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: true,
  });

  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    navigator.geolocation.watchPosition(
      (pos) => {
        state.set({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          error: null,
          loading: false,
        });
      },
      (err) => {
        state.set({
          latitude: null,
          longitude: null,
          accuracy: null,
          error: err,
          loading: false,
        });
      },
      options,
    );
  } else {
    state.set({ ...state(), loading: false });
  }

  return (() => state()) as ReadonlySignal<GeolocationState>;
}

// --- useWindowSize ---

/**
 * Reactive window dimensions.
 */
export function useWindowSize() {
  const width = signal(typeof window !== 'undefined' ? window.innerWidth : 0);
  const height = signal(typeof window !== 'undefined' ? window.innerHeight : 0);

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', () => {
      width.set(window.innerWidth);
      height.set(window.innerHeight);
    }, { passive: true });
  }

  return {
    width: (() => width()) as ReadonlySignal<number>,
    height: (() => height()) as ReadonlySignal<number>,
  };
}
