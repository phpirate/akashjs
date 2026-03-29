/**
 * Deferred loading with triggers.
 *
 * Lazy-load components based on viewport visibility, user interaction,
 * idle time, timer, hover, or custom conditions.
 *
 * ```ts
 * const LazyComments = defer(() => import('./Comments.akash'), {
 *   trigger: 'viewport',
 *   loading: () => <Skeleton variant="text" />,
 * });
 *
 * const LazyChart = defer(() => import('./Chart.akash'), {
 *   trigger: 'idle',
 *   loading: () => <Spinner />,
 * });
 *
 * const LazyDropdown = defer(() => import('./Dropdown.akash'), {
 *   trigger: 'interaction', // loads on hover/focus/click
 * });
 * ```
 */

import { signal } from './signals.js';
import { defineComponent } from './component.js';
import { nodeToDOM } from './dom.js';
import type { Component } from './component.js';
import type { AkashNode } from './types.js';
import type { ReadonlySignal } from './signals.js';

// =========================================================================
// Types
// =========================================================================

export type DeferTrigger =
  | 'immediate'
  | 'viewport'
  | 'interaction'
  | 'idle'
  | 'hover'
  | { type: 'timer'; delay: number }
  | { type: 'custom'; condition: () => boolean };

export interface DeferOptions {
  /** When to start loading (default: 'viewport') */
  trigger?: DeferTrigger;
  /** Loading placeholder */
  loading?: () => AkashNode;
  /** Error fallback */
  error?: (err: Error) => AkashNode;
  /** Prefetch — start loading early but don't render until triggered */
  prefetch?: boolean;
  /** Minimum loading time in ms (prevent flash of loading state) */
  minLoadTime?: number;
  /** Viewport root margin for 'viewport' trigger */
  rootMargin?: string;
}

// =========================================================================
// defer()
// =========================================================================

/**
 * Create a deferred component that loads based on a trigger.
 */
export function defer<P extends Record<string, unknown>>(
  loader: () => Promise<{ default: Component<P> }>,
  options: DeferOptions = {},
): Component<P> {
  const {
    trigger = 'viewport',
    loading: loadingFn,
    error: errorFn,
    prefetch = false,
    minLoadTime = 0,
    rootMargin = '200px',
  } = options;

  let resolvedComp: Component<P> | null = null;
  let loadPromise: Promise<void> | null = null;
  let loadError: Error | null = null;

  function startLoad(): Promise<void> {
    if (loadPromise) return loadPromise;

    const start = Date.now();
    loadPromise = loader()
      .then(async (mod) => {
        // Enforce minimum load time
        const elapsed = Date.now() - start;
        if (minLoadTime > 0 && elapsed < minLoadTime) {
          await new Promise((r) => setTimeout(r, minLoadTime - elapsed));
        }
        resolvedComp = mod.default;
      })
      .catch((err) => {
        loadError = err instanceof Error ? err : new Error(String(err));
      });

    return loadPromise;
  }

  // Prefetch if requested
  if (prefetch) startLoad();

  return defineComponent<P>((ctx) => {
    const state = signal<'idle' | 'loading' | 'ready' | 'error'>('idle');
    let triggerCleanup: (() => void) | null = null;

    async function triggerLoad(): Promise<void> {
      if (state() !== 'idle') return;
      state.set('loading');
      await startLoad();
      state.set(loadError ? 'error' : 'ready');
    }

    return () => {
      const container = document.createElement('div');
      container.style.display = 'contents';

      const s = state();

      if (s === 'ready' && resolvedComp) {
        container.appendChild(resolvedComp(ctx.props as any));
        return container;
      }

      if (s === 'error' && errorFn && loadError) {
        container.appendChild(nodeToDOM(errorFn(loadError)));
        return container;
      }

      // Show loading placeholder
      if (loadingFn && s === 'loading') {
        container.appendChild(nodeToDOM(loadingFn()));
      }

      // Set up trigger
      if (s === 'idle') {
        setupTrigger(container, trigger, triggerLoad, rootMargin).then((cleanup) => {
          triggerCleanup = cleanup;
        });
      }

      return container;
    };
  });
}

// =========================================================================
// Trigger setup
// =========================================================================

async function setupTrigger(
  el: HTMLElement,
  trigger: DeferTrigger,
  load: () => void,
  rootMargin: string,
): Promise<() => void> {
  if (trigger === 'immediate') {
    load();
    return () => {};
  }

  if (trigger === 'viewport') {
    return setupViewportTrigger(el, load, rootMargin);
  }

  if (trigger === 'interaction' || trigger === 'hover') {
    return setupInteractionTrigger(el, load, trigger);
  }

  if (trigger === 'idle') {
    return setupIdleTrigger(load);
  }

  if (typeof trigger === 'object' && trigger.type === 'timer') {
    return setupTimerTrigger(load, trigger.delay);
  }

  if (typeof trigger === 'object' && trigger.type === 'custom') {
    return setupCustomTrigger(load, trigger.condition);
  }

  load();
  return () => {};
}

function setupViewportTrigger(
  el: HTMLElement,
  load: () => void,
  rootMargin: string,
): () => void {
  if (typeof IntersectionObserver === 'undefined') {
    load();
    return () => {};
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) {
        observer.disconnect();
        load();
      }
    },
    { rootMargin },
  );

  // Observe after element is in DOM
  requestAnimationFrame(() => observer.observe(el));
  return () => observer.disconnect();
}

function setupInteractionTrigger(
  el: HTMLElement,
  load: () => void,
  type: 'interaction' | 'hover',
): () => void {
  const events = type === 'hover'
    ? ['mouseenter', 'focusin']
    : ['click', 'mouseenter', 'focusin', 'touchstart'];

  const handler = () => {
    for (const event of events) {
      el.removeEventListener(event, handler);
    }
    load();
  };

  for (const event of events) {
    el.addEventListener(event, handler, { once: true, passive: true });
  }

  return () => {
    for (const event of events) {
      el.removeEventListener(event, handler);
    }
  };
}

function setupIdleTrigger(load: () => void): () => void {
  if (typeof requestIdleCallback !== 'undefined') {
    const id = requestIdleCallback(() => load());
    return () => cancelIdleCallback(id);
  }
  // Fallback
  const timer = setTimeout(load, 200);
  return () => clearTimeout(timer);
}

function setupTimerTrigger(load: () => void, delay: number): () => void {
  const timer = setTimeout(load, delay);
  return () => clearTimeout(timer);
}

function setupCustomTrigger(load: () => void, condition: () => boolean): () => void {
  const check = () => {
    if (condition()) load();
    else requestAnimationFrame(check);
  };
  requestAnimationFrame(check);
  return () => {}; // Can't cancel rAF chain easily
}
