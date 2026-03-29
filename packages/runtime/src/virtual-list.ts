/**
 * <VirtualFor> — virtualized list rendering.
 *
 * Only renders items visible in the viewport plus a small overscan
 * buffer. Essential for rendering thousands of items without
 * destroying performance.
 *
 * ```html
 * <VirtualFor
 *   each={items()}
 *   key={(item) => item.id}
 *   itemHeight={40}
 *   overscan={5}
 * >
 *   {(item) => <div class="row">{item.name}</div>}
 * </VirtualFor>
 * ```
 */

import { signal, effect, computed } from './signals.js';
import { defineComponent } from './component.js';
import { nodeToDOM } from './dom.js';
import type { AkashNode } from './types.js';
import type { ReadonlySignal } from './signals.js';

// --- Types ---

export interface VirtualForProps<T> {
  /** Array of items */
  each: T[];
  /** Key function for reconciliation */
  key: (item: T) => unknown;
  /** Fixed height per item in pixels */
  itemHeight: number;
  /** Container height in pixels (default: auto-detect from parent) */
  containerHeight?: number;
  /** Number of extra items to render above/below viewport */
  overscan?: number;
  /** Render function for each item */
  children: (item: T, index: number) => AkashNode;
}

// --- Virtual scroll calculations ---

export interface VirtualRange {
  /** First visible index */
  start: number;
  /** Last visible index (exclusive) */
  end: number;
  /** Total content height in pixels */
  totalHeight: number;
  /** Offset of the first rendered item */
  offsetTop: number;
}

/**
 * Calculate the visible range given scroll position and dimensions.
 */
export function calculateRange(
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  totalItems: number,
  overscan = 3,
): VirtualRange {
  const firstVisible = Math.floor(scrollTop / itemHeight);
  const visibleCount = Math.ceil(containerHeight / itemHeight);

  const start = Math.max(0, firstVisible - overscan);
  const end = Math.min(totalItems, firstVisible + visibleCount + overscan);

  return {
    start,
    end,
    totalHeight: totalItems * itemHeight,
    offsetTop: start * itemHeight,
  };
}

// --- useVirtualList composable ---

/**
 * Low-level virtual list composable for custom implementations.
 *
 * ```ts
 * const { containerRef, range, visibleItems } = useVirtualList({
 *   items: () => allItems(),
 *   itemHeight: 40,
 *   overscan: 5,
 * });
 * ```
 */
export function useVirtualList<T>(options: {
  items: () => T[];
  itemHeight: number;
  containerHeight?: number;
  overscan?: number;
}) {
  const scrollTop = signal(0);
  const containerHeight = signal(options.containerHeight ?? 400);
  const overscan = options.overscan ?? 3;

  const range = computed((): VirtualRange => {
    return calculateRange(
      scrollTop(),
      containerHeight(),
      options.itemHeight,
      options.items().length,
      overscan,
    );
  });

  const visibleItems = computed(() => {
    const r = range();
    return options.items().slice(r.start, r.end).map((item, i) => ({
      item,
      index: r.start + i,
    }));
  });

  function onScroll(e: Event): void {
    const target = e.target as HTMLElement;
    scrollTop.set(target.scrollTop);
  }

  function setContainerHeight(height: number): void {
    containerHeight.set(height);
  }

  return {
    range,
    visibleItems,
    onScroll,
    setContainerHeight,
    scrollTop: (() => scrollTop()) as ReadonlySignal<number>,
  };
}

// --- <VirtualFor> component ---

export const VirtualFor = defineComponent<VirtualForProps<any>>((ctx) => {
  const {
    itemHeight,
    containerHeight: fixedHeight,
    overscan = 3,
  } = ctx.props;

  const scrollTop = signal(0);

  return () => {
    const items = ctx.props.each;
    const height = fixedHeight ?? 400;

    const r = calculateRange(scrollTop(), height, itemHeight, items.length, overscan);

    // Outer container (scrollable)
    const outer = document.createElement('div');
    outer.style.height = `${height}px`;
    outer.style.overflow = 'auto';
    outer.style.position = 'relative';

    outer.addEventListener('scroll', () => {
      scrollTop.set(outer.scrollTop);
    }, { passive: true });

    // Inner spacer (total height)
    const inner = document.createElement('div');
    inner.style.height = `${r.totalHeight}px`;
    inner.style.position = 'relative';

    // Rendered items container
    const content = document.createElement('div');
    content.style.position = 'absolute';
    content.style.top = `${r.offsetTop}px`;
    content.style.left = '0';
    content.style.right = '0';

    // Render visible items
    for (let i = r.start; i < r.end; i++) {
      const item = items[i];
      if (!item) continue;

      const row = nodeToDOM(ctx.props.children(item, i));
      if (row instanceof HTMLElement) {
        row.style.height = `${itemHeight}px`;
      }
      content.appendChild(row);
    }

    inner.appendChild(content);
    outer.appendChild(inner);
    return outer;
  };
});
