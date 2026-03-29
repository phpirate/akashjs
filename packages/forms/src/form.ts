/**
 * defineForm() and defineFormGroup().
 *
 * The main API for creating signal-based forms with declarative
 * validation. Type-safe values inferred from initial values.
 */

import { computed } from '@akashjs/runtime';
import { createField } from './field.js';
import type {
  FieldConfig,
  Form,
  FormField,
  FormFields,
  FieldValues,
  FormGroup,
  FormGroupInstance,
} from './types.js';

// --- Form group marker ---

/**
 * Define a nested form group for use inside defineForm().
 *
 * ```ts
 * const form = defineForm({
 *   address: defineFormGroup({
 *     street: { initial: '' },
 *     city: { initial: '' },
 *   }),
 * });
 * ```
 */
export function defineFormGroup<T extends Record<string, FieldConfig<any> | FormGroup<any>>>(
  config: T,
): FormGroup<T> {
  return { _tag: 'formGroup', config };
}

function isFormGroup(val: unknown): val is FormGroup<any> {
  return val != null && typeof val === 'object' && '_tag' in val && (val as any)._tag === 'formGroup';
}

// --- Build fields recursively ---

function buildFields<T extends Record<string, FieldConfig<any> | FormGroup<any>>>(
  config: T,
): FormFields<T> {
  const fields = {} as Record<string, FormField<any> | FormGroupInstance<any>>;

  for (const [key, fieldConfig] of Object.entries(config)) {
    if (isFormGroup(fieldConfig)) {
      fields[key] = buildGroupInstance(fieldConfig.config);
    } else {
      fields[key] = createField(fieldConfig as FieldConfig<any>);
    }
  }

  return fields as FormFields<T>;
}

function buildGroupInstance<T extends Record<string, FieldConfig<any> | FormGroup<any>>>(
  config: T,
): FormGroupInstance<T> {
  const fields = buildFields(config);

  const flatFields = collectFlatFields(fields);

  const valid = computed(() => flatFields.every((f) => f.valid()));
  const dirty = computed(() => flatFields.some((f) => f.dirty()));

  return {
    fields,
    valid,
    dirty,
    values: () => extractValues(config, fields),
    errors: () => extractErrors(config, fields),
    reset() {
      for (const field of flatFields) {
        field.reset();
      }
    },
  };
}

// --- defineForm ---

/**
 * Define a reactive form with signal-based fields and declarative validation.
 *
 * ```ts
 * const form = defineForm({
 *   email: { initial: '', validators: [required(), email()] },
 *   password: { initial: '', validators: [required(), minLength(8)] },
 * });
 * ```
 */
export function defineForm<T extends Record<string, FieldConfig<any> | FormGroup<any>>>(
  config: T,
): Form<T> {
  const fields = buildFields(config);

  const flatFields = collectFlatFields(fields);

  const valid = computed(() => flatFields.every((f) => f.valid()));
  const dirty = computed(() => flatFields.some((f) => f.dirty()));

  const values = (): FieldValues<T> => extractValues(config, fields);
  const errors = (): Partial<Record<keyof T, string[]>> => extractErrors(config, fields);

  async function submit(
    handler: (values: FieldValues<T>) => void | Promise<void>,
  ): Promise<void> {
    // Touch all fields to show errors
    for (const field of flatFields) {
      field.markTouched();
    }

    if (!valid()) return;

    await handler(values());
  }

  function handleSubmit(
    handler: (values: FieldValues<T>) => void | Promise<void>,
  ): (e: Event) => void {
    return (e: Event) => {
      e.preventDefault();
      submit(handler);
    };
  }

  function reset(): void {
    for (const field of flatFields) {
      field.reset();
    }
  }

  return {
    fields,
    valid,
    dirty,
    values,
    errors,
    submit,
    reset,
    handleSubmit,
  };
}

// --- Helpers ---

/** Collect all leaf FormField instances (flattening groups) */
function collectFlatFields(
  fields: Record<string, FormField<any> | FormGroupInstance<any>>,
): FormField<any>[] {
  const result: FormField<any>[] = [];

  for (const field of Object.values(fields)) {
    if ('value' in field && 'markTouched' in field) {
      // It's a FormField
      result.push(field as FormField<any>);
    } else if ('fields' in field) {
      // It's a FormGroupInstance — recurse
      result.push(...collectFlatFields((field as FormGroupInstance<any>).fields as any));
    }
  }

  return result;
}

/** Extract current values as a plain object */
function extractValues<T extends Record<string, FieldConfig<any> | FormGroup<any>>>(
  config: T,
  fields: FormFields<T>,
): FieldValues<T> {
  const result = {} as Record<string, unknown>;

  for (const key of Object.keys(config)) {
    const fieldConfig = config[key];
    const field = (fields as any)[key];

    if (isFormGroup(fieldConfig)) {
      result[key] = (field as FormGroupInstance<any>).values();
    } else {
      result[key] = (field as FormField<any>).value();
    }
  }

  return result as FieldValues<T>;
}

/** Extract errors grouped by field name */
function extractErrors<T extends Record<string, FieldConfig<any> | FormGroup<any>>>(
  config: T,
  fields: FormFields<T>,
): Partial<Record<keyof T, string[]>> {
  const result = {} as Record<string, string[]>;

  for (const key of Object.keys(config)) {
    const fieldConfig = config[key];
    const field = (fields as any)[key];

    if (isFormGroup(fieldConfig)) {
      // For groups, collect all nested errors under the group key
      const groupErrors = (field as FormGroupInstance<any>).errors();
      const allErrors = Object.values(groupErrors).flat() as string[];
      if (allErrors.length > 0) result[key] = allErrors;
    } else {
      const errs = (field as FormField<any>).errors();
      if (errs.length > 0) result[key] = errs;
    }
  }

  return result as Partial<Record<keyof T, string[]>>;
}
