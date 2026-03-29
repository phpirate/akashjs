/**
 * <Suspense> component.
 *
 * Shows a fallback while async children are loading.
 * When all pending async work resolves, swaps to the real content.
 *
 * Works with both client rendering and SSR streaming:
 * - Client: shows fallback, swaps when promises resolve
 * - SSR: flushes fallback HTML immediately, then sends replacement when ready
 */

import { defineComponent } from './component.js';
import { signal, effect } from './signals.js';
import { nodeToDOM } from './dom.js';
import type { AkashNode } from './types.js';

// --- Suspense tracking ---

interface SuspenseContext {
  /** Register a pending promise */
  addPending(promise: Promise<unknown>): void;
  /** Check if all pending work is resolved */
  isResolved: () => boolean;
}

let currentSuspenseCtx: SuspenseContext | null = null;

/**
 * Get the current Suspense context (if inside a <Suspense> boundary).
 * Used by async components and createResource to register pending work.
 */
export function getSuspenseContext(): SuspenseContext | null {
  return currentSuspenseCtx;
}

/**
 * Register a promise with the nearest Suspense boundary.
 * If there is no Suspense boundary, the promise is ignored
 * (component renders without waiting).
 */
export function registerPending(promise: Promise<unknown>): void {
  if (currentSuspenseCtx) {
    currentSuspenseCtx.addPending(promise);
  }
}

// --- Suspense component ---

export interface SuspenseProps {
  /** Fallback UI shown while children are loading */
  fallback: () => AkashNode;
}

/**
 * <Suspense> component.
 *
 * ```html
 * <Suspense fallback={() => <Spinner />}>
 *   <AsyncComponent />
 * </Suspense>
 * ```
 */
export const Suspense = defineComponent<SuspenseProps>((ctx) => {
  const resolved = signal(false);
  const pending: Promise<unknown>[] = [];

  const suspenseCtx: SuspenseContext = {
    addPending(promise: Promise<unknown>) {
      pending.push(promise);
    },
    isResolved: () => resolved(),
  };

  // Set up the context so child components can register promises
  const prevCtx = currentSuspenseCtx;
  currentSuspenseCtx = suspenseCtx;

  // Render children (this may trigger async work registration)
  let childrenNode: AkashNode;
  try {
    childrenNode = ctx.children();
  } finally {
    currentSuspenseCtx = prevCtx;
  }

  // If there are pending promises, wait for them
  if (pending.length > 0) {
    Promise.all(pending).then(() => {
      resolved.set(true);
    });
  } else {
    // No async work — resolve immediately
    resolved.set(true);
  }

  return () => {
    const container = document.createElement('div');
    container.setAttribute('data-akash-suspense', '');
    container.style.display = 'contents';

    if (resolved()) {
      container.appendChild(nodeToDOM(childrenNode));
    } else {
      container.appendChild(nodeToDOM(ctx.props.fallback()));
    }

    // Watch for resolution and swap content
    effect(() => {
      if (resolved()) {
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
        container.appendChild(nodeToDOM(childrenNode));
      }
    });

    return container;
  };
});
