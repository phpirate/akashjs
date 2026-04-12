/**
 * Validation engine.
 *
 * Runs sync validators immediately, async validators with optional debounce.
 * Returns error arrays via computed signals.
 */

import { signal, computed } from '@akashjs/runtime';
import type { Signal, ReadonlySignal } from '@akashjs/runtime';
import type { Validator, AsyncValidator } from './types.js';

export interface ValidationState {
  /** Current sync errors */
  syncErrors: ReadonlySignal<string[]>;
  /** Current async errors */
  asyncErrors: ReadonlySignal<string[]>;
  /** All errors combined */
  errors: ReadonlySignal<string[]>;
  /** Whether async validation is in progress */
  validating: ReadonlySignal<boolean>;
  /** Trigger async validation for a value */
  validateAsync(value: unknown): void;
  /** Dispose any pending timers */
  dispose(): void;
}

/**
 * Create a validation state for a field.
 * Sync validators run eagerly via computed (driven by the value signal).
 * Async validators run on demand with optional debounce.
 */
export function createValidation<T>(
  value: Signal<T>,
  syncValidators: Validator<T>[] = [],
  asyncValidators: AsyncValidator<T>[] = [],
  debounceMs = 0,
): ValidationState {
  // Sync errors — recompute whenever value changes
  const syncErrors = computed<string[]>(() => {
    const v = value();
    const errors: string[] = [];
    for (const validator of syncValidators) {
      const result = validator(v);
      if (result !== null) errors.push(result);
    }
    return errors;
  });

  // Async errors — updated after async validators resolve
  const asyncErrorsSignal = signal<string[]>([]);
  const validatingSignal = signal(false);

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let currentRunId = 0;

  function validateAsync(val: unknown): void {
    if (asyncValidators.length === 0) return;

    // If sync errors exist, skip async validation
    if (syncErrors().length > 0) {
      asyncErrorsSignal.set([]);
      validatingSignal.set(false);
      return;
    }

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const run = () => {
      const runId = ++currentRunId;
      validatingSignal.set(true);

      Promise.all(asyncValidators.map((v) => {
        try { return v(val as T); } catch (e) { return Promise.reject(e); }
      })).then((results) => {
        if (runId !== currentRunId) return;
        const errors = results.filter((r): r is string => r !== null);
        asyncErrorsSignal.set(errors);
        validatingSignal.set(false);
      }).catch((err) => {
        if (runId !== currentRunId) return;
        const message = err instanceof Error ? err.message : 'Validation failed';
        asyncErrorsSignal.set([message]);
        validatingSignal.set(false);
      });
    };

    if (debounceMs > 0) {
      debounceTimer = setTimeout(run, debounceMs);
    } else {
      run();
    }
  }

  // Combined errors
  const errors = computed<string[]>(() => {
    return [...syncErrors(), ...asyncErrorsSignal()];
  });

  return {
    syncErrors,
    asyncErrors: () => asyncErrorsSignal(),
    errors,
    validating: () => validatingSignal(),
    validateAsync,
    dispose() {
      if (debounceTimer) clearTimeout(debounceTimer);
    },
  };
}
