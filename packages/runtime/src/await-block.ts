/**
 * Await block — template-level async handling.
 *
 * Renders different content for pending/resolved/rejected states
 * of a promise, similar to Svelte's {#await} blocks.
 *
 * ```ts
 * Await({
 *   promise: fetchUser(userId()),
 *   pending: () => <Spinner />,
 *   then: (user) => <UserCard user={user} />,
 *   catch: (err) => <Error message={err.message} />,
 * });
 * ```
 */

import { defineComponent } from './component.js';
import { signal } from './signals.js';
import { nodeToDOM } from './dom.js';
import type { AkashNode } from './types.js';

// =========================================================================
// Types
// =========================================================================

export interface AwaitProps<T> {
  /** The promise to await */
  promise: Promise<T>;
  /** Render while pending */
  pending?: () => AkashNode;
  /** Render when resolved */
  then: (value: T) => AkashNode;
  /** Render when rejected */
  catch?: (error: Error) => AkashNode;
}

type AwaitState<T> =
  | { status: 'pending' }
  | { status: 'resolved'; value: T }
  | { status: 'rejected'; error: Error };

// =========================================================================
// Await component
// =========================================================================

/**
 * <Await> component — declarative promise handling.
 */
export const Await = defineComponent<AwaitProps<any>>((ctx) => {
  const state = signal<AwaitState<unknown>>({ status: 'pending' });

  // Track the promise to handle race conditions
  let currentPromise = ctx.props.promise;

  ctx.props.promise
    .then((value) => {
      if (ctx.props.promise === currentPromise) {
        state.set({ status: 'resolved', value });
      }
    })
    .catch((err) => {
      if (ctx.props.promise === currentPromise) {
        state.set({
          status: 'rejected',
          error: err instanceof Error ? err : new Error(String(err)),
        });
      }
    });

  return () => {
    const s = state();

    switch (s.status) {
      case 'pending':
        return ctx.props.pending
          ? nodeToDOM(ctx.props.pending())
          : document.createComment('await-pending');

      case 'resolved':
        return nodeToDOM(ctx.props.then(s.value));

      case 'rejected':
        return ctx.props.catch
          ? nodeToDOM(ctx.props.catch(s.error))
          : document.createComment('await-error');
    }
  };
});

// =========================================================================
// Functional await helper
// =========================================================================

/**
 * Functional await block — returns a signal that updates as the promise resolves.
 *
 * ```ts
 * const result = awaitSignal(fetchData());
 * result().status; // 'pending' | 'resolved' | 'rejected'
 * ```
 */
export function awaitSignal<T>(promise: Promise<T>) {
  const state = signal<AwaitState<T>>({ status: 'pending' });

  promise
    .then((value) => state.set({ status: 'resolved', value }))
    .catch((error) => state.set({
      status: 'rejected',
      error: error instanceof Error ? error : new Error(String(error)),
    }));

  return () => state();
}
