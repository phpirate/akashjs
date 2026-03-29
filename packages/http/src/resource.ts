/**
 * createResource() — async data signal.
 *
 * Bridges the HTTP client with the reactivity system. Fetches data
 * asynchronously and exposes it as a signal with loading/error states,
 * caching, refetch, and optimistic mutation.
 */

import { signal, effect, untrack } from '@akashjs/runtime';
import type { Resource, ResourceOptions } from './types.js';

/**
 * Create a reactive resource that fetches data asynchronously.
 *
 * The fetcher re-runs whenever reactive dependencies inside it change,
 * or when the `key` option changes.
 *
 * ```ts
 * const userId = signal(1);
 * const user = createResource(
 *   () => http.get<User>(`/users/${userId()}`),
 *   { key: () => userId(), staleTime: 30_000 }
 * );
 *
 * user()         // User | undefined
 * user.loading() // boolean
 * user.error()   // Error | undefined
 * user.refetch() // manually refetch
 * user.mutate(u) // optimistic update
 * ```
 */
export function createResource<T>(
  fetcher: () => Promise<T>,
  options: ResourceOptions<T> = {},
): Resource<T> {
  const data = signal<T | undefined>(options.initialData);
  const loading = signal(false);
  const error = signal<Error | undefined>(undefined);

  let currentAbort: AbortController | null = null;
  let lastFetchTime = 0;
  let lastKey: unknown = undefined;
  let disposed = false;

  function doFetch(): void {
    if (disposed) return;

    // Check stale time — if data is fresh, skip
    if (options.staleTime && options.staleTime > 0) {
      const now = Date.now();
      if (now - lastFetchTime < options.staleTime && data() !== undefined) {
        return;
      }
    }

    // Cancel any in-flight request
    if (currentAbort) {
      currentAbort.abort();
    }
    currentAbort = new AbortController();

    loading.set(true);
    error.set(undefined);

    // Run fetcher outside of tracking to avoid re-subscribing to ourselves
    const fetchPromise = fetcher();

    fetchPromise
      .then((result) => {
        if (disposed) return;
        data.set(result);
        lastFetchTime = Date.now();
        loading.set(false);
      })
      .catch((err) => {
        if (disposed) return;
        // Ignore abort errors
        if (err instanceof DOMException && err.name === 'AbortError') return;
        error.set(err instanceof Error ? err : new Error(String(err)));
        loading.set(false);
      });
  }

  // Reactive effect — re-runs when key or fetcher dependencies change
  const disposeEffect = effect(() => {
    // Track the key if provided
    const currentKey = options.key ? options.key() : undefined;

    // If key changed, reset stale time to force refetch
    if (currentKey !== lastKey) {
      lastFetchTime = 0;
      lastKey = currentKey;
    }

    // Untrack the actual fetch to avoid circular deps
    untrack(() => doFetch());
  });

  // Refetch on window focus
  let removeFocusListener: (() => void) | null = null;
  if (options.refetchOnFocus && typeof window !== 'undefined') {
    const onFocus = () => {
      if (!disposed) {
        lastFetchTime = 0; // Force stale
        doFetch();
      }
    };
    window.addEventListener('focus', onFocus);
    removeFocusListener = () => window.removeEventListener('focus', onFocus);
  }

  // Build the resource signal
  const resource = (() => data()) as Resource<T>;

  resource.loading = () => loading();
  resource.error = () => error();

  resource.refetch = () => {
    lastFetchTime = 0;
    doFetch();
  };

  resource.mutate = (newData: T) => {
    data.set(newData);
    lastFetchTime = Date.now();
  };

  resource.dispose = () => {
    disposed = true;
    disposeEffect();
    if (currentAbort) currentAbort.abort();
    if (removeFocusListener) removeFocusListener();
  };

  return resource;
}
