/**
 * Forms type definitions.
 */

import type { Signal } from '@akashjs/runtime';

// --- Validators ---

/** Sync validator: returns null (valid) or error message string */
export type Validator<T> = (value: T) => string | null;

/** Async validator: returns null (valid) or error message string */
export type AsyncValidator<T> = (value: T) => Promise<string | null>;

// --- Field config ---

export interface FieldConfig<T> {
  /** Initial value */
  initial: T;
  /** Sync validators */
  validators?: Validator<T>[];
  /** Async validators (run after sync validators pass) */
  asyncValidators?: AsyncValidator<T>[];
  /** Debounce time in ms for async validators (default: 0) */
  debounce?: number;
}

// --- Field ---

export interface FormField<T> {
  /** Readable/writable signal for the field value */
  value: Signal<T>;
  /** Validation errors (computed) */
  errors: () => string[];
  /** Has the field been blurred */
  touched: () => boolean;
  /** Has the value changed from initial */
  dirty: () => boolean;
  /** No validation errors */
  valid: () => boolean;
  /** True while async validators are running */
  validating: () => boolean;
  /** Mark as touched */
  markTouched(): void;
  /** Reset to initial value */
  reset(): void;
}

// --- Form ---

/** Maps field configs to their value types */
export type FieldValues<T extends Record<string, FieldConfig<any> | FormGroup<any>>> = {
  [K in keyof T]: T[K] extends FormGroup<infer G>
    ? FieldValues<G>
    : T[K] extends FieldConfig<infer V>
      ? V
      : never;
};

/** Maps field configs to FormField instances */
export type FormFields<T extends Record<string, FieldConfig<any> | FormGroup<any>>> = {
  [K in keyof T]: T[K] extends FormGroup<infer G>
    ? FormGroupInstance<G>
    : T[K] extends FieldConfig<infer V>
      ? FormField<V>
      : never;
};

export interface Form<T extends Record<string, FieldConfig<any> | FormGroup<any>>> {
  /** Individual field accessors */
  fields: FormFields<T>;
  /** All fields valid (computed) */
  valid: () => boolean;
  /** Any field dirty (computed) */
  dirty: () => boolean;
  /** Current form values as a plain object */
  values: () => FieldValues<T>;
  /** All errors grouped by field name */
  errors: () => Partial<Record<keyof T, string[]>>;
  /** Submit the form — runs all validators, calls handler if valid */
  submit(handler: (values: FieldValues<T>) => void | Promise<void>): Promise<void>;
  /** Reset all fields to initial values */
  reset(): void;
  /** Event handler for <form onSubmit={}> */
  handleSubmit(handler: (values: FieldValues<T>) => void | Promise<void>): (e: Event) => void;
}

// --- Form group ---

export interface FormGroup<T extends Record<string, FieldConfig<any> | FormGroup<any>>> {
  _tag: 'formGroup';
  config: T;
}

export interface FormGroupInstance<T extends Record<string, FieldConfig<any> | FormGroup<any>>> {
  fields: FormFields<T>;
  valid: () => boolean;
  dirty: () => boolean;
  values: () => FieldValues<T>;
  errors: () => Partial<Record<keyof T, string[]>>;
  reset(): void;
}
