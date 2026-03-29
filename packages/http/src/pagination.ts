/**
 * Signal-based pagination.
 *
 * Pairs with createResource() for paginated data fetching.
 * Supports page-based, offset-based, and cursor-based pagination.
 *
 * ```ts
 * const pager = createPagination({ pageSize: 20, totalItems: () => 100 });
 * const data = createResource(
 *   () => http.get(`/items?page=${pager.page()}&size=${pager.pageSize}`),
 *   { key: () => pager.page() },
 * );
 * pager.next(); pager.prev(); pager.goTo(3);
 * ```
 */

import { signal, computed } from '@akashjs/runtime';
import type { ReadonlySignal } from '@akashjs/runtime';

// --- Page-based pagination ---

export interface PaginationOptions {
  /** Items per page */
  pageSize: number;
  /** Total items (reactive signal or static number) */
  totalItems?: (() => number) | number;
  /** Starting page (default: 1) */
  initialPage?: number;
}

export interface Pagination {
  /** Current page (1-based) */
  page: () => number;
  /** Items per page */
  pageSize: number;
  /** Total pages (computed) */
  totalPages: () => number;
  /** Whether there is a next page */
  hasNext: () => boolean;
  /** Whether there is a previous page */
  hasPrev: () => boolean;
  /** Go to next page */
  next(): void;
  /** Go to previous page */
  prev(): void;
  /** Go to specific page */
  goTo(page: number): void;
  /** Reset to first page */
  reset(): void;
  /** Offset for the current page (0-based, for SQL OFFSET) */
  offset: () => number;
  /** Range string for display (e.g., "21-40 of 100") */
  range: () => { from: number; to: number; total: number };
}

/**
 * Create a page-based pagination controller.
 */
export function createPagination(options: PaginationOptions): Pagination {
  const { pageSize, initialPage = 1 } = options;
  const page = signal(initialPage);

  const getTotal = typeof options.totalItems === 'function'
    ? options.totalItems
    : () => options.totalItems as number ?? 0;

  const totalPages = computed(() => Math.max(1, Math.ceil(getTotal() / pageSize)));
  const hasNext = computed(() => page() < totalPages());
  const hasPrev = computed(() => page() > 1);
  const offset = computed(() => (page() - 1) * pageSize);

  const range = computed(() => {
    const total = getTotal();
    const from = Math.min(offset() + 1, total);
    const to = Math.min(offset() + pageSize, total);
    return { from, to, total };
  });

  return {
    page: () => page(),
    pageSize,
    totalPages,
    hasNext,
    hasPrev,
    next() { if (hasNext()) page.update((p) => p + 1); },
    prev() { if (hasPrev()) page.update((p) => p - 1); },
    goTo(p: number) { page.set(Math.max(1, Math.min(p, totalPages()))); },
    reset() { page.set(1); },
    offset,
    range,
  };
}

// --- Cursor-based pagination ---

export interface CursorPaginationOptions<C> {
  /** Items per page */
  pageSize: number;
  /** Initial cursor (null = first page) */
  initialCursor?: C | null;
}

export interface CursorPagination<C> {
  /** Current cursor */
  cursor: () => C | null;
  /** Items per page */
  pageSize: number;
  /** Whether there are more items */
  hasMore: () => boolean;
  /** Set the next cursor (call after fetching) */
  setNextCursor(cursor: C | null): void;
  /** Load next page */
  loadMore(): void;
  /** Reset to first page */
  reset(): void;
}

/**
 * Create a cursor-based pagination controller.
 */
export function createCursorPagination<C = string>(
  options: CursorPaginationOptions<C>,
): CursorPagination<C> {
  const cursor = signal<C | null>(options.initialCursor ?? null);
  const nextCursor = signal<C | null>(null);
  const hasMore = signal(true);

  return {
    cursor: () => cursor(),
    pageSize: options.pageSize,
    hasMore: () => hasMore(),
    setNextCursor(c: C | null) {
      nextCursor.set(c);
      hasMore.set(c !== null);
    },
    loadMore() {
      if (hasMore()) {
        cursor.set(nextCursor());
      }
    },
    reset() {
      cursor.set(options.initialCursor ?? null);
      nextCursor.set(null);
      hasMore.set(true);
    },
  };
}
