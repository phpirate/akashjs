/**
 * Infinite scroll composable.
 *
 * Uses IntersectionObserver to detect when a sentinel element
 * enters the viewport, then triggers loading more data.
 * Pairs with createCursorPagination() from @akashjs/http.
 *
 * ```ts
 * const { sentinel, loading, done } = useInfiniteScroll({
 *   onLoadMore: async () => {
 *     pager.loadMore();
 *     await fetchNextPage();
 *   },
 *   hasMore: () => pager.hasMore(),
 * });
 * // Append sentinel() element at the end of your list
 * ```
 */

import { signal } from './signals.js';
import type { ReadonlySignal } from './signals.js';

// --- Types ---

export interface InfiniteScrollOptions {
  /** Callback to load more items */
  onLoadMore: () => Promise<void> | void;
  /** Whether there are more items to load */
  hasMore: () => boolean;
  /** Root margin for the observer (default: '200px') */
  rootMargin?: string;
  /** Threshold for the observer (default: 0) */
  threshold?: number;
}

export interface InfiniteScroll {
  /** Sentinel element to place at the end of the list */
  sentinel: () => HTMLElement;
  /** Whether a load is in progress */
  loading: ReadonlySignal<boolean>;
  /** Whether all items have been loaded */
  done: ReadonlySignal<boolean>;
  /** Reset the scroll state */
  reset(): void;
  /** Dispose the observer */
  dispose(): void;
}

// --- Implementation ---

/**
 * Create an infinite scroll controller.
 */
export function useInfiniteScroll(options: InfiniteScrollOptions): InfiniteScroll {
  const { onLoadMore, hasMore, rootMargin = '200px', threshold = 0 } = options;

  const loading = signal(false);
  const done = signal(false);
  let observer: IntersectionObserver | null = null;
  let sentinelEl: HTMLElement | null = null;
  let disposed = false;

  async function handleIntersect(): Promise<void> {
    if (loading() || done() || disposed) return;
    if (!hasMore()) {
      done.set(true);
      return;
    }

    loading.set(true);
    try {
      await onLoadMore();
      if (!hasMore()) {
        done.set(true);
      }
    } finally {
      loading.set(false);
    }
  }

  function createObserver(el: HTMLElement): void {
    if (typeof IntersectionObserver === 'undefined') return;

    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          handleIntersect();
        }
      },
      { rootMargin, threshold },
    );

    observer.observe(el);
  }

  function sentinel(): HTMLElement {
    if (sentinelEl) return sentinelEl;

    sentinelEl = document.createElement('div');
    sentinelEl.setAttribute('data-akash-sentinel', '');
    sentinelEl.style.height = '1px';
    sentinelEl.setAttribute('aria-hidden', 'true');

    // Start observing
    requestAnimationFrame(() => {
      if (sentinelEl && !disposed) {
        createObserver(sentinelEl);
      }
    });

    return sentinelEl;
  }

  return {
    sentinel,
    loading: () => loading(),
    done: () => done(),
    reset() {
      done.set(false);
      loading.set(false);
    },
    dispose() {
      disposed = true;
      observer?.disconnect();
      observer = null;
    },
  };
}
