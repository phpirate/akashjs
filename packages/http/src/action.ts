/**
 * createAction() — server mutations.
 *
 * The write-side companion to createResource(). Provides
 * type-safe mutations with loading/error state and optimistic updates.
 *
 * ```ts
 * const createPost = createAction(
 *   (data: { title: string; body: string }) =>
 *     http.post<Post>('/api/posts', data),
 *   {
 *     onSuccess: (result) => { posts.refetch(); },
 *     onError: (err) => { toast.error(err.message); },
 *   },
 * );
 *
 * // In a handler:
 * await createPost.execute({ title: 'Hello', body: '...' });
 * createPost.loading(); // boolean
 * createPost.error();   // Error | undefined
 * ```
 */

import { signal } from '@akashjs/runtime';
import type { Signal } from '@akashjs/runtime';

// --- Types ---

export interface ActionOptions<TInput, TResult> {
  /** Called when the action succeeds */
  onSuccess?: (result: TResult, input: TInput) => void;
  /** Called when the action fails */
  onError?: (error: Error, input: TInput) => void;
  /** Called when the action settles (success or error) */
  onSettled?: (input: TInput) => void;
  /** Optimistic update — applied immediately, reverted on error */
  optimistic?: (input: TInput) => void;
  /** Revert optimistic update on error */
  revertOptimistic?: (input: TInput) => void;
}

export interface Action<TInput, TResult> {
  /** Execute the action */
  execute(input: TInput): Promise<TResult>;
  /** Whether the action is currently executing */
  loading: () => boolean;
  /** The last error, if any */
  error: () => Error | undefined;
  /** The last successful result */
  data: () => TResult | undefined;
  /** Reset error and data state */
  reset(): void;
}

// --- createAction ---

/**
 * Create a mutation action with loading/error tracking and lifecycle hooks.
 */
export function createAction<TInput, TResult>(
  mutationFn: (input: TInput) => Promise<TResult>,
  options: ActionOptions<TInput, TResult> = {},
): Action<TInput, TResult> {
  const loading = signal(false);
  const error = signal<Error | undefined>(undefined);
  const data = signal<TResult | undefined>(undefined);

  async function execute(input: TInput): Promise<TResult> {
    loading.set(true);
    error.set(undefined);

    // Apply optimistic update
    if (options.optimistic) {
      options.optimistic(input);
    }

    try {
      const result = await mutationFn(input);
      data.set(result);
      loading.set(false);
      options.onSuccess?.(result, input);
      options.onSettled?.(input);
      return result;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      error.set(e);
      loading.set(false);

      // Revert optimistic update
      if (options.revertOptimistic) {
        options.revertOptimistic(input);
      }

      options.onError?.(e, input);
      options.onSettled?.(input);
      throw e;
    }
  }

  return {
    execute,
    loading: () => loading(),
    error: () => error(),
    data: () => data(),
    reset() {
      error.set(undefined);
      data.set(undefined);
    },
  };
}
