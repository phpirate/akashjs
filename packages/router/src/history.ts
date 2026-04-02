/**
 * History API wrapper.
 *
 * Provides a reactive signal for the current URL and thin wrappers
 * around pushState/replaceState. Listens to popstate for back/forward.
 */

import { signal } from '@akashjs/runtime';
import type { Signal } from '@akashjs/runtime';

// --- URL parsing ---

export interface HistoryLocation {
  pathname: string;
  search: string;
  hash: string;
}

function currentLocation(): HistoryLocation {
  return {
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
  };
}

// --- History instance ---

export interface HistoryManager {
  /** Reactive current location */
  location: Signal<HistoryLocation>;
  /** Push a new URL onto the history stack */
  push(url: string): void;
  /** Replace the current history entry */
  replace(url: string): void;
  /** Go back/forward by delta */
  go(delta: number): void;
  /** Stop listening to popstate events */
  dispose(): void;
}

let scrollKeyCounter = Date.now();

export function createHistory(): HistoryManager {
  const location = signal<HistoryLocation>(currentLocation(), {
    equals: (a, b) => a.pathname === b.pathname && a.search === b.search && a.hash === b.hash,
  });

  // Ensure the initial entry has a scroll key
  if (!window.history.state?.__scrollKey) {
    window.history.replaceState({ ...window.history.state, __scrollKey: String(scrollKeyCounter) }, '');
  }

  const onPopState = () => {
    location.set(currentLocation());
  };

  window.addEventListener('popstate', onPopState);

  return {
    location,

    push(url: string) {
      // Each new history entry gets a unique scroll key
      const key = String(++scrollKeyCounter);
      window.history.pushState({ __scrollKey: key }, '', url);
      location.set(currentLocation());
    },

    replace(url: string) {
      // Preserve existing scroll key on replace
      const existing = window.history.state;
      window.history.replaceState({ ...existing }, '', url);
      location.set(currentLocation());
    },

    go(delta: number) {
      window.history.go(delta);
      // popstate fires async after go(), the listener handles the update
    },

    dispose() {
      window.removeEventListener('popstate', onPopState);
    },
  };
}

// --- URL building helpers ---

export function buildUrl(
  pathname: string,
  query?: Record<string, string>,
  hash?: string,
): string {
  let url = pathname;
  if (query && Object.keys(query).length > 0) {
    const params = new URLSearchParams(query);
    url += '?' + params.toString();
  }
  if (hash) {
    url += '#' + hash;
  }
  return url;
}

export function parseQuery(search: string): Record<string, string> {
  if (!search || search === '?') return {};
  const params = new URLSearchParams(search);
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

export function parseHash(hash: string): string {
  return hash.startsWith('#') ? hash.slice(1) : hash;
}
