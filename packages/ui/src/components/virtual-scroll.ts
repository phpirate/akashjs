/**
 * Virtual Scroll components for AkashJS.
 *
 * - VirtualScroll — virtualized list (fixed-height or autosize)
 * - useIntersectionObserver — lazy loading / infinite scroll hook
 *
 * Features:
 * - Fixed-height mode: O(1) offset calculation for 100k+ items
 * - Autosize mode: measures items dynamically, caches heights
 * - scrollToIndex(index, behavior) for programmatic scrolling
 * - Overscan (buffer) for smooth scrolling
 * - trackBy for stable item identity
 * - onScrollEnd callback for infinite scroll
 * - appendOnly mode (never removes rendered items)
 * - Mixed-type items (headers + data)
 * - Viewport height: fixed px, percentage, or 'auto'
 */

import { defineComponent, effect, signal } from '@akashjs/runtime';
import type { AkashNode } from '@akashjs/runtime';

// --- Helpers ---

function readProp<T>(val: T | (() => T)): T {
  return typeof val === 'function' ? (val as () => T)() : val as T;
}

function nodeToDOM(node: AkashNode): Node {
  if (node == null || typeof node === 'boolean') return document.createTextNode('');
  if (typeof node === 'string' || typeof node === 'number') return document.createTextNode(String(node));
  if (node instanceof Node) return node;
  return document.createTextNode(String(node));
}

// ============================================================================
// VirtualScroll
// ============================================================================

export interface VirtualScrollRef {
  /** Scroll to a specific item index */
  scrollToIndex: (index: number, behavior?: ScrollBehavior) => void;
  /** Get the viewport DOM element */
  getViewport: () => HTMLElement;
  /** Force re-measure all autosize items */
  remeasure: () => void;
}

export interface VirtualScrollProps<T = any> {
  /** Items array (reactive signal or static) */
  items?: T[];
  /** Fixed item height in px (omit for autosize) */
  itemHeight?: number;
  /** Enable autosize (measure items dynamically) */
  autosize?: boolean;
  /** Estimated item height for autosize initial layout (default: 50) */
  estimatedItemHeight?: number;
  /** Viewport height CSS value (default: '400px') */
  viewportHeight?: string;
  /** Number of extra items to render above/below visible area (default: 5) */
  overscan?: number;
  /** Render function for each item */
  renderItem?: (item: T, index: number) => AkashNode;
  /** Stable identity function for items */
  trackBy?: (item: T) => unknown;
  /** Called when scroll reaches the end (infinite scroll) */
  onScrollEnd?: () => void;
  /** Threshold in px from bottom to trigger onScrollEnd (default: 100) */
  scrollEndThreshold?: number;
  /** Never remove rendered items — only add new ones */
  appendOnly?: boolean;
  /** Ref object — will be populated with scrollToIndex etc. */
  ref?: VirtualScrollRef | { current?: VirtualScrollRef };
  /** Custom CSS class on viewport */
  class?: string;
  /** Disabled (render all items without virtualization) */
  disabled?: boolean;
}

export const VirtualScroll = defineComponent<VirtualScrollProps>((ctx) => {
  return () => {
    const props = ctx.props;
    const fixedHeight = props.itemHeight;
    const autosize = props.autosize ?? (!fixedHeight);
    const estimatedHeight = props.estimatedItemHeight ?? 50;
    const viewportHeight = props.viewportHeight ?? '400px';
    const overscan = props.overscan ?? 5;
    const scrollEndThreshold = props.scrollEndThreshold ?? 100;
    const appendOnly = props.appendOnly ?? false;
    const renderItem = props.renderItem;
    const trackBy = props.trackBy;
    const isDisabled = props.disabled ?? false;

    // Height cache for autosize mode
    const heightCache = new Map<unknown, number>();
    // Track which indices have been rendered (for appendOnly)
    const renderedSet = new Set<number>();

    // State
    const scrollTop = signal(0);

    // Viewport
    const viewport = document.createElement('div');
    viewport.setAttribute('role', 'list');
    if (props.class) viewport.className = props.class;
    viewport.style.cssText = `
      overflow-y: auto; position: relative;
      height: ${viewportHeight};
      will-change: transform;
    `;

    // Spacer (total scrollable height)
    const spacer = document.createElement('div');
    spacer.style.cssText = 'width: 100%; position: relative;';
    viewport.appendChild(spacer);

    // Content container (positioned items)
    const content = document.createElement('div');
    content.style.cssText = 'position: absolute; top: 0; left: 0; right: 0;';
    spacer.appendChild(content);

    // Scroll handler with rAF throttle
    let rafId = 0;
    viewport.addEventListener('scroll', () => {
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          scrollTop.set(viewport.scrollTop);
          rafId = 0;

          // Infinite scroll detection
          if (props.onScrollEnd) {
            const distFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
            if (distFromBottom < scrollEndThreshold) {
              props.onScrollEnd();
            }
          }
        });
      }
    });

    // --- Fixed-height helpers ---
    function getItemOffset(index: number): number {
      if (fixedHeight) return index * fixedHeight;
      // Autosize: sum cached heights
      let offset = 0;
      const items = readProp(props.items) ?? [];
      for (let i = 0; i < index && i < items.length; i++) {
        const key = trackBy ? trackBy(items[i]) : i;
        offset += heightCache.get(key) ?? estimatedHeight;
      }
      return offset;
    }

    function getTotalHeight(items: any[]): number {
      if (fixedHeight) return items.length * fixedHeight;
      let total = 0;
      for (let i = 0; i < items.length; i++) {
        const key = trackBy ? trackBy(items[i]) : i;
        total += heightCache.get(key) ?? estimatedHeight;
      }
      return total;
    }

    function getVisibleRange(items: any[], st: number, viewportH: number): [number, number] {
      const total = items.length;
      if (total === 0) return [0, 0];

      if (fixedHeight) {
        const start = Math.max(0, Math.floor(st / fixedHeight) - overscan);
        const end = Math.min(total, Math.ceil((st + viewportH) / fixedHeight) + overscan);
        return [start, end];
      }

      // Autosize: scan through cached heights
      let offset = 0;
      let start = 0;
      for (let i = 0; i < total; i++) {
        const key = trackBy ? trackBy(items[i]) : i;
        const h = heightCache.get(key) ?? estimatedHeight;
        if (offset + h > st) { start = i; break; }
        offset += h;
        if (i === total - 1) start = total;
      }
      start = Math.max(0, start - overscan);

      let end = start;
      offset = getItemOffset(start);
      const endThreshold = st + viewportH;
      for (let i = start; i < total; i++) {
        if (offset > endThreshold) { end = i; break; }
        const key = trackBy ? trackBy(items[i]) : i;
        offset += heightCache.get(key) ?? estimatedHeight;
        end = i + 1;
      }
      end = Math.min(total, end + overscan);

      return [start, end];
    }

    // --- Measure autosize items ---
    function measureItems(startIdx: number) {
      if (!autosize || fixedHeight) return;
      const items = readProp(props.items) ?? [];
      const children = content.children;
      let changed = false;
      for (let i = 0; i < children.length; i++) {
        const el = children[i] as HTMLElement;
        const idx = startIdx + i;
        if (idx >= items.length) break;
        const key = trackBy ? trackBy(items[idx]) : idx;
        const measured = el.offsetHeight;
        if (measured > 0 && heightCache.get(key) !== measured) {
          heightCache.set(key, measured);
          changed = true;
        }
      }
      // If heights changed, update total height and re-render
      if (changed) {
        spacer.style.height = `${getTotalHeight(items)}px`;
      }
    }

    // --- Render ---
    effect(() => {
      const items = readProp(props.items) ?? [];
      const st = scrollTop();
      const viewportH = viewport.clientHeight || parseInt(viewportHeight, 10) || 400;

      // Set total scrollable height
      const totalH = getTotalHeight(items);
      spacer.style.height = `${totalH}px`;

      if (isDisabled || !renderItem) {
        // Non-virtualized: render all
        content.textContent = '';
        content.style.transform = '';
        for (let i = 0; i < items.length; i++) {
          const el = document.createElement('div');
          el.setAttribute('role', 'listitem');
          el.appendChild(nodeToDOM(renderItem ? renderItem(items[i], i) : document.createTextNode(String(items[i]))));
          content.appendChild(el);
        }
        return;
      }

      const [start, end] = getVisibleRange(items, st, viewportH);

      // AppendOnly: extend rendered range but never shrink
      let renderStart = start;
      let renderEnd = end;
      if (appendOnly) {
        for (let i = start; i < end; i++) renderedSet.add(i);
        renderStart = Math.min(start, renderedSet.size > 0 ? Math.min(...renderedSet) : start);
        renderEnd = Math.max(end, renderedSet.size > 0 ? Math.max(...renderedSet) + 1 : end);
      }

      // Position content at the start offset
      const startOffset = getItemOffset(renderStart);
      content.style.transform = `translateY(${startOffset}px)`;

      // Build visible items
      content.textContent = '';
      for (let i = renderStart; i < renderEnd && i < items.length; i++) {
        const item = items[i];
        const el = document.createElement('div');
        el.setAttribute('role', 'listitem');
        el.dataset.vsIndex = String(i);
        if (fixedHeight) {
          el.style.height = `${fixedHeight}px`;
          el.style.boxSizing = 'border-box';
        }
        el.appendChild(nodeToDOM(renderItem(item, i)));
        content.appendChild(el);
      }

      // Measure autosize items after render
      if (autosize) {
        requestAnimationFrame(() => measureItems(renderStart));
      }
    });

    // --- scrollToIndex ---
    function scrollToIndex(index: number, behavior: ScrollBehavior = 'auto') {
      const items = readProp(props.items) ?? [];
      if (index < 0 || index >= items.length) return;
      const offset = getItemOffset(index);
      viewport.scrollTo({ top: offset, behavior });
    }

    function remeasure() {
      heightCache.clear();
      // Trigger re-render
      scrollTop.set(viewport.scrollTop);
    }

    // --- Expose ref ---
    const refObj: VirtualScrollRef = {
      scrollToIndex,
      getViewport: () => viewport,
      remeasure,
    };

    if (props.ref) {
      if ('current' in props.ref) {
        (props.ref as { current?: VirtualScrollRef }).current = refObj;
      } else {
        Object.assign(props.ref, refObj);
      }
    }

    return viewport;
  };
});

// ============================================================================
// useIntersectionObserver — Lazy loading / visibility hook
// ============================================================================

export interface IntersectionObserverOptions {
  /** Root margin (default: '0px') */
  rootMargin?: string;
  /** Visibility threshold 0-1 (default: 0) */
  threshold?: number | number[];
  /** Disconnect after first intersection */
  once?: boolean;
  /** Callback when element becomes visible */
  onIntersect?: (entry: IntersectionObserverEntry) => void;
  /** Callback when element leaves viewport */
  onLeave?: (entry: IntersectionObserverEntry) => void;
  /** Root element for intersection (default: viewport) */
  root?: HTMLElement | null;
}

export interface IntersectionObserverResult {
  /** Ref callback — assign to element to observe */
  ref: (el: HTMLElement | null) => void;
  /** Reactive signal: is the element currently intersecting? */
  isIntersecting: () => boolean;
  /** Manually disconnect the observer */
  disconnect: () => void;
}

export function useIntersectionObserver(
  options: IntersectionObserverOptions = {},
): IntersectionObserverResult {
  const {
    rootMargin = '0px',
    threshold = 0,
    once = false,
    onIntersect,
    onLeave,
    root = null,
  } = options;

  const isIntersecting = signal(false);
  let observer: IntersectionObserver | null = null;
  let currentEl: HTMLElement | null = null;

  function createObserver() {
    if (typeof IntersectionObserver === 'undefined') return null;
    return new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          isIntersecting.set(entry.isIntersecting);
          if (entry.isIntersecting) {
            onIntersect?.(entry);
            if (once) {
              observer?.disconnect();
              observer = null;
            }
          } else {
            onLeave?.(entry);
          }
        }
      },
      { rootMargin, threshold, root },
    );
  }

  function ref(el: HTMLElement | null) {
    // Unobserve previous element
    if (currentEl && observer) {
      observer.unobserve(currentEl);
    }
    currentEl = el;
    if (el) {
      if (!observer) observer = createObserver();
      observer?.observe(el);
    }
  }

  function disconnect() {
    observer?.disconnect();
    observer = null;
    currentEl = null;
  }

  return {
    ref,
    isIntersecting: () => isIntersecting(),
    disconnect,
  };
}
