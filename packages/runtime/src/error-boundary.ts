/**
 * ErrorBoundary component.
 *
 * Declarative error handling — catches errors from child components
 * and renders a fallback UI.
 *
 * ```html
 * <ErrorBoundary fallback={(err) => <p>Error: {err.message}</p>}>
 *   <RiskyComponent />
 * </ErrorBoundary>
 * ```
 */

import { defineComponent, onError } from './component.js';
import { signal } from './signals.js';
import { nodeToDOM } from './dom.js';
import type { AkashNode } from './types.js';

export interface ErrorBoundaryProps {
  /** Render function called when an error is caught */
  fallback: (error: Error, retry: () => void) => AkashNode;
}

/**
 * ErrorBoundary component.
 *
 * Catches errors from descendant components and renders a fallback.
 * The fallback receives the error and a `retry` function that re-renders
 * the children.
 */
export const ErrorBoundary = defineComponent<ErrorBoundaryProps>((ctx) => {
  const error = signal<Error | null>(null);

  onError((err) => {
    error.set(err);
  });

  function retry() {
    error.set(null);
  }

  return () => {
    const currentError = error();

    if (currentError) {
      return nodeToDOM(ctx.props.fallback(currentError, retry));
    }

    return nodeToDOM(ctx.children());
  };
});
