/**
 * Theme / dark mode system.
 *
 * Signal-based theme management with system preference detection,
 * CSS variable injection, and localStorage persistence.
 *
 * ```ts
 * const theme = useTheme({
 *   themes: {
 *     light: { '--bg': '#fff', '--text': '#111' },
 *     dark: { '--bg': '#111', '--text': '#eee' },
 *   },
 * });
 *
 * theme.current();    // 'light' or 'dark'
 * theme.toggle();     // switch between light/dark
 * theme.set('dark');  // set explicitly
 * theme.isDark();     // boolean
 * ```
 */

import { signal, computed, effect } from './signals.js';
import type { ReadonlySignal } from './signals.js';

// --- Types ---

export type ThemeVariables = Record<string, string>;

export interface ThemeConfig {
  /** Theme definitions (name → CSS variables) */
  themes?: Record<string, ThemeVariables>;
  /** Default theme name (default: auto-detect from system) */
  defaultTheme?: string;
  /** localStorage key for persistence (default: 'akash-theme') */
  storageKey?: string;
  /** CSS attribute to set on <html> (default: 'data-theme') */
  attribute?: string;
  /** Whether to sync with system preference (default: true) */
  syncSystem?: boolean;
}

export interface Theme {
  /** Current theme name (reactive) */
  current: ReadonlySignal<string>;
  /** Whether dark mode is active */
  isDark: ReadonlySignal<boolean>;
  /** Set a specific theme */
  set(theme: string): void;
  /** Toggle between light and dark */
  toggle(): void;
  /** Set the system preference strategy */
  setSystem(): void;
  /** Available theme names */
  themes: string[];
}

// --- Implementation ---

/**
 * Create a theme manager with system preference detection and persistence.
 */
export function useTheme(config: ThemeConfig = {}): Theme {
  const {
    themes = {
      light: {},
      dark: {},
    },
    storageKey = 'akash-theme',
    attribute = 'data-theme',
    syncSystem = true,
  } = config;

  const themeNames = Object.keys(themes);

  // Detect system preference
  function getSystemTheme(): string {
    if (typeof window === 'undefined') return config.defaultTheme ?? 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  // Read persisted theme or use default
  function getInitialTheme(): string {
    if (typeof window !== 'undefined' && storageKey) {
      const stored = localStorage.getItem(storageKey);
      if (stored && themeNames.includes(stored)) return stored;
    }
    return config.defaultTheme ?? getSystemTheme();
  }

  const current = signal(getInitialTheme());
  const isDark = computed(() => current() === 'dark');

  // Apply theme
  function applyTheme(name: string): void {
    if (typeof document === 'undefined') return;

    // Set attribute on <html>
    document.documentElement.setAttribute(attribute, name);

    // Apply CSS variables
    const vars = themes[name];
    if (vars) {
      for (const [key, value] of Object.entries(vars)) {
        document.documentElement.style.setProperty(key, value);
      }
    }

    // Add/remove class for convenience
    document.documentElement.classList.remove(...themeNames);
    document.documentElement.classList.add(name);
  }

  // React to theme changes
  effect(() => {
    const name = current();
    applyTheme(name);

    // Persist
    if (typeof window !== 'undefined' && storageKey) {
      localStorage.setItem(storageKey, name);
    }
  });

  // Sync with system preference changes
  if (syncSystem && typeof window !== 'undefined') {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    mql.addEventListener('change', (e) => {
      // Only auto-switch if user hasn't manually overridden
      const stored = localStorage.getItem(storageKey);
      if (!stored) {
        current.set(e.matches ? 'dark' : 'light');
      }
    });
  }

  return {
    current: () => current(),
    isDark,
    set(theme: string) {
      if (themeNames.includes(theme)) {
        current.set(theme);
      }
    },
    toggle() {
      current.set(isDark() ? 'light' : 'dark');
    },
    setSystem() {
      if (typeof window !== 'undefined' && storageKey) {
        localStorage.removeItem(storageKey);
      }
      current.set(getSystemTheme());
    },
    themes: themeNames,
  };
}
