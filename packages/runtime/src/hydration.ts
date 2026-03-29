/**
 * Client-side hydration.
 *
 * After SSR delivers HTML, the client needs to "hydrate" —
 * walk the existing DOM, attach signal effects, and make it interactive.
 * No new DOM nodes are created during hydration.
 *
 * Supports progressive hydration via IntersectionObserver:
 * components hydrate lazily when they enter the viewport.
 */

import { signal, effect } from './signals.js';
import type { Component } from './component.js';
import type { AkashNode } from './types.js';

// --- Hydration state ---

let isHydrating = false;
let hydrateRoot: Node | null = null;
let hydrateWalker: TreeWalker | null = null;

/** Check if we're currently hydrating (vs. fresh rendering) */
export function isHydrationActive(): boolean {
  return isHydrating;
}

// --- Hydration context ---

export interface HydrateOptions {
  /** The root DOM element (rendered by SSR) */
  container: HTMLElement;
  /** The root component to hydrate */
  component: Component<any>;
  /** Props to pass to the root component */
  props?: Record<string, unknown>;
}

/**
 * Hydrate a server-rendered DOM tree.
 *
 * Walks the existing DOM instead of creating new nodes,
 * attaching signal effects to existing elements.
 *
 * ```ts
 * import { hydrate } from '@akashjs/runtime';
 * import App from './App.akash';
 *
 * hydrate({
 *   container: document.getElementById('app')!,
 *   component: App,
 *   props: { title: 'Home' },
 * });
 * ```
 */
export function hydrate(options: HydrateOptions): () => void {
  const { container, component, props = {} } = options;

  isHydrating = true;
  hydrateRoot = container;

  // Create a tree walker to traverse the existing DOM
  hydrateWalker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
  );

  try {
    // Run the component — during hydration, DOM creation helpers
    // will claim existing nodes instead of creating new ones
    component(props as any);
  } finally {
    isHydrating = false;
    hydrateRoot = null;
    hydrateWalker = null;
  }

  return () => {
    // Cleanup — dispose all hydration effects
  };
}

/**
 * Claim the next DOM node during hydration.
 * Instead of creating a new element, returns the existing one.
 */
export function claimElement(tag: string): HTMLElement | null {
  if (!isHydrating || !hydrateWalker) return null;

  let node = hydrateWalker.nextNode();
  while (node) {
    if (
      node instanceof HTMLElement &&
      node.tagName.toLowerCase() === tag.toLowerCase()
    ) {
      return node;
    }
    node = hydrateWalker.nextNode();
  }

  return null;
}

/**
 * Claim the next text node during hydration.
 */
export function claimText(): Text | null {
  if (!isHydrating || !hydrateWalker) return null;

  let node = hydrateWalker.nextNode();
  while (node) {
    if (node instanceof Text) {
      return node;
    }
    node = hydrateWalker.nextNode();
  }

  return null;
}

// --- Progressive hydration ---

export interface ProgressiveHydrateOptions {
  /** CSS selector or element to observe */
  target: HTMLElement;
  /** Component to hydrate when visible */
  component: Component<any>;
  /** Props */
  props?: Record<string, unknown>;
  /** IntersectionObserver root margin (default: '200px') */
  rootMargin?: string;
}

/**
 * Hydrate a component lazily when it enters the viewport.
 *
 * Uses IntersectionObserver to detect when the SSR placeholder
 * becomes visible, then runs full hydration.
 *
 * ```ts
 * progressiveHydrate({
 *   target: document.querySelector('[data-hydrate="comments"]')!,
 *   component: Comments,
 *   props: { postId: 123 },
 * });
 * ```
 */
export function progressiveHydrate(options: ProgressiveHydrateOptions): () => void {
  const { target, component, props, rootMargin = '200px' } = options;

  if (typeof IntersectionObserver === 'undefined') {
    // Fallback: hydrate immediately if IO is not available
    return hydrate({ container: target, component, props });
  }

  let disposed = false;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !disposed) {
          observer.disconnect();
          hydrate({ container: target, component, props });
        }
      }
    },
    { rootMargin },
  );

  observer.observe(target);

  return () => {
    disposed = true;
    observer.disconnect();
  };
}

// --- Hydrate boundary marker ---

/** Data attribute used to mark hydration boundaries in SSR HTML */
export const HYDRATE_ATTR = 'data-akash-hydrate';

/**
 * Find all hydration boundaries in the document.
 */
export function findHydrationBoundaries(
  root: HTMLElement = document.body,
): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(`[${HYDRATE_ATTR}]`));
}
