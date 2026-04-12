/**
 * Zod validator adapter.
 *
 * Bridges Zod schemas with AkashJS form validators so developers
 * can use their existing Zod schemas for form validation.
 *
 * ```ts
 * import { z } from 'zod';
 * import { zodValidator, zodFieldValidator } from '@akashjs/forms/zod';
 *
 * const schema = z.object({
 *   email: z.string().email('Invalid email'),
 *   age: z.number().min(18, 'Must be 18+'),
 * });
 *
 * const form = defineForm({
 *   email: { initial: '', validators: [zodFieldValidator(schema, 'email')] },
 *   age: { initial: 0, validators: [zodFieldValidator(schema, 'age')] },
 * });
 *
 * // Or validate the entire form at once:
 * const errors = zodValidator(schema)({ email: '', age: 15 });
 * ```
 */

// Re-export schema utilities so they're accessible from the zod subpath
export { createFormFromSchema, getSchemaFields } from './schema.js';

import type { Validator, AsyncValidator } from './types.js';

// --- Types for Zod compatibility ---
// We define minimal interfaces so we don't depend on Zod at compile time.

interface ZodLikeType {
  safeParse(data: unknown): { success: boolean; error?: ZodLikeError };
  safeParseAsync?(data: unknown): Promise<{ success: boolean; error?: ZodLikeError }>;
}

interface ZodLikeObjectType extends ZodLikeType {
  shape: Record<string, ZodLikeType>;
}

interface ZodLikeError {
  issues: Array<{ path: (string | number)[]; message: string }>;
}

// --- Field-level validator ---

/**
 * Create a validator from a Zod schema for a specific field.
 *
 * ```ts
 * const schema = z.object({ email: z.string().email() });
 * const emailValidator = zodFieldValidator(schema, 'email');
 * ```
 */
export function zodFieldValidator<T>(
  schema: ZodLikeObjectType,
  field: string,
): Validator<T> {
  const fieldSchema = schema.shape[field];
  if (!fieldSchema) {
    throw new Error(`[AkashJS] zodFieldValidator: field "${field}" not found in schema`);
  }

  return (value: T): string | null => {
    const result = fieldSchema.safeParse(value);
    if (result.success) return null;
    return result.error?.issues[0]?.message ?? 'Validation failed';
  };
}

/**
 * Create an async validator from a Zod schema for a specific field.
 * Useful for schemas with .refine() or .transform() that are async.
 */
export function zodAsyncFieldValidator<T>(
  schema: ZodLikeObjectType,
  field: string,
): AsyncValidator<T> {
  const fieldSchema = schema.shape[field];
  if (!fieldSchema) {
    throw new Error(`[AkashJS] zodAsyncFieldValidator: field "${field}" not found in schema`);
  }

  return async (value: T): Promise<string | null> => {
    const parse = (fieldSchema.safeParseAsync ?? fieldSchema.safeParse) as (data: unknown) => Promise<{ success: boolean; error?: { issues: Array<{ message: string }> } }>;
    const result = await parse.call(fieldSchema, value);
    if (result.success) return null;
    return result.error?.issues[0]?.message ?? 'Validation failed';
  };
}

// --- Full form validator ---

/**
 * Validate an entire form values object against a Zod schema.
 * Returns errors keyed by field name.
 *
 * ```ts
 * const schema = z.object({ email: z.string().email(), name: z.string().min(1) });
 * const validate = zodValidator(schema);
 * const errors = validate({ email: 'bad', name: '' });
 * // { email: ['Invalid email'], name: ['String must contain at least 1 character(s)'] }
 * ```
 */
export function zodValidator<T extends Record<string, unknown>>(
  schema: ZodLikeType,
): (values: T) => Record<string, string[]> {
  return (values: T): Record<string, string[]> => {
    const result = schema.safeParse(values);
    if (result.success) return {};

    const errors: Record<string, string[]> = {};
    for (const issue of result.error?.issues ?? []) {
      const key = String(issue.path[0] ?? '_root');
      if (!errors[key]) errors[key] = [];
      errors[key].push(issue.message);
    }
    return errors;
  };
}
