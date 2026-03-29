/**
 * Field signal bindings.
 *
 * createField() wraps a value in a reactive signal with
 * touched, dirty, errors, valid, validating, and reset.
 */

import { signal, computed, effect } from '@akashjs/runtime';
import { createValidation } from './validation.js';
import type { FieldConfig, FormField } from './types.js';

/**
 * Create a reactive form field from a field config.
 */
export function createField<T>(config: FieldConfig<T>): FormField<T> {
  const value = signal<T>(config.initial);
  const touched = signal(false);

  const dirty = computed(() => !Object.is(value(), config.initial));

  const validation = createValidation(
    value,
    config.validators,
    config.asyncValidators,
    config.debounce,
  );

  // Trigger async validation whenever value changes and sync is clean
  if (config.asyncValidators && config.asyncValidators.length > 0) {
    effect(() => {
      const v = value();
      validation.validateAsync(v);
    });
  }

  const valid = computed(() => validation.errors().length === 0 && !validation.validating());

  return {
    value,
    errors: validation.errors,
    touched: () => touched(),
    dirty,
    valid,
    validating: () => validation.validating(),
    markTouched() {
      touched.set(true);
    },
    reset() {
      value.set(config.initial);
      touched.set(false);
      validation.dispose();
    },
  };
}
