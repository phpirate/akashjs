/**
 * defineAsyncComponent — lazy component loading.
 *
 * Wraps a dynamic import() into a component that shows a loading
 * state while the chunk downloads, an error state if it fails,
 * and the real component once resolved.
 *
 * ```ts
 * const LazyChart = defineAsyncComponent(() => import('./Chart.akash'));
 *
 * // With loading/error:
 * const LazyChart = defineAsyncComponent({
 *   loader: () => import('./Chart.akash'),
 *   loading: () => <Spinner />,
 *   error: (err) => <p>Failed: {err.message}</p>,
 *   timeout: 10000,
 * });
 * ```
 */

import { defineComponent } from './component.js';
import { signal } from './signals.js';
import { nodeToDOM } from './dom.js';
import type { Component } from './component.js';
import type { AkashNode } from './types.js';

// --- Types ---

export type AsyncComponentLoader<P extends Record<string, unknown> = any> =
  () => Promise<{ default: Component<P> }>;

export interface AsyncComponentOptions<P extends Record<string, unknown> = any> {
  /** The async loader function (dynamic import) */
  loader: AsyncComponentLoader<P>;
  /** Component to show while loading */
  loading?: () => AkashNode;
  /** Component to show on error */
  error?: (error: Error) => AkashNode;
  /** Timeout in ms — show error after this (default: none) */
  timeout?: number;
  /** Delay in ms before showing loading state (default: 200) */
  delay?: number;
}

// --- defineAsyncComponent ---

/**
 * Define a component that loads asynchronously via dynamic import.
 */
export function defineAsyncComponent<P extends Record<string, unknown> = any>(
  loaderOrOptions: AsyncComponentLoader<P> | AsyncComponentOptions<P>,
): Component<P> {
  const options: AsyncComponentOptions<P> =
    typeof loaderOrOptions === 'function'
      ? { loader: loaderOrOptions }
      : loaderOrOptions;

  const {
    loader,
    loading: loadingFn,
    error: errorFn,
    timeout,
    delay = 200,
  } = options;

  // Cache the loaded component
  let resolvedComp: Component<P> | null = null;
  let loadPromise: Promise<void> | null = null;
  let loadError: Error | null = null;

  function startLoad(): Promise<void> {
    if (loadPromise) return loadPromise;

    loadPromise = loader()
      .then((mod) => {
        resolvedComp = mod.default;
      })
      .catch((err) => {
        loadError = err instanceof Error ? err : new Error(String(err));
      });

    return loadPromise;
  }

  return defineComponent<P>((ctx) => {
    const state = signal<'loading' | 'ready' | 'error'>('loading');
    const showLoading = signal(false);

    // Start loading
    startLoad().then(() => {
      if (loadError) {
        state.set('error');
      } else {
        state.set('ready');
      }
    });

    // Delay before showing loading indicator
    let delayTimer: ReturnType<typeof setTimeout> | null = null;
    if (delay > 0) {
      delayTimer = setTimeout(() => showLoading.set(true), delay);
    } else {
      showLoading.set(true);
    }

    // Timeout
    let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
    if (timeout) {
      timeoutTimer = setTimeout(() => {
        if (state() === 'loading') {
          loadError = new Error(`Async component timed out after ${timeout}ms`);
          state.set('error');
        }
      }, timeout);
    }

    return () => {
      const s = state();

      // Clear timers once resolved
      if (s !== 'loading') {
        if (delayTimer) clearTimeout(delayTimer);
        if (timeoutTimer) clearTimeout(timeoutTimer);
      }

      if (s === 'ready' && resolvedComp) {
        return resolvedComp(ctx.props as any);
      }

      if (s === 'error' && errorFn && loadError) {
        return nodeToDOM(errorFn(loadError));
      }

      if (s === 'loading' && showLoading() && loadingFn) {
        return nodeToDOM(loadingFn());
      }

      // Nothing to show yet
      return document.createComment('async-loading');
    };
  });
}
