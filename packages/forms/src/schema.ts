/**
 * Schema-driven form generation.
 *
 * Auto-generate a form from a Zod schema — fields, validators,
 * and TypeScript types are all derived from the schema. Zero boilerplate.
 *
 * ```ts
 * import { z } from 'zod';
 * import { createFormFromSchema } from '@akashjs/forms';
 *
 * const schema = z.object({
 *   name: z.string().min(1, 'Required'),
 *   email: z.string().email('Invalid email'),
 *   age: z.number().min(18, 'Must be 18+'),
 *   agree: z.boolean().refine(v => v, 'Must agree'),
 * });
 *
 * const form = createFormFromSchema(schema);
 * form.fields.name.value.set('Alice');
 * form.valid(); // validates against the Zod schema
 * ```
 */

import { defineForm } from './form.js';
import { zodFieldValidator } from './zod.js';
import type { FieldConfig, Form, FormGroup } from './types.js';

// --- Zod type introspection interfaces ---

interface ZodLikeType {
  _def: {
    typeName: string;
    checks?: Array<{ kind: string; value?: unknown; message?: string }>;
    innerType?: ZodLikeType;
    defaultValue?: () => unknown;
  };
  safeParse(data: unknown): { success: boolean; error?: { issues: Array<{ message: string }> } };
}

interface ZodLikeObjectType extends ZodLikeType {
  shape: Record<string, ZodLikeType>;
}

// --- Schema analysis ---

interface FieldInfo {
  type: 'string' | 'number' | 'boolean' | 'unknown';
  initial: unknown;
  isOptional: boolean;
}

function analyzeZodField(field: ZodLikeType): FieldInfo {
  let current = field;

  // Unwrap optional/default wrappers
  let isOptional = false;
  while (current._def.innerType) {
    if (current._def.typeName === 'ZodOptional') isOptional = true;
    if (current._def.typeName === 'ZodDefault') {
      return {
        ...analyzeZodField(current._def.innerType),
        initial: current._def.defaultValue?.(),
        isOptional: true,
      };
    }
    current = current._def.innerType;
  }

  const typeName = current._def.typeName;

  switch (typeName) {
    case 'ZodString':
      return { type: 'string', initial: '', isOptional };
    case 'ZodNumber':
      return { type: 'number', initial: 0, isOptional };
    case 'ZodBoolean':
      return { type: 'boolean', initial: false, isOptional };
    default:
      return { type: 'unknown', initial: '', isOptional };
  }
}

// --- createFormFromSchema ---

/**
 * Create a form from a Zod object schema.
 *
 * Each field in the schema becomes a form field with:
 * - Initial value derived from the Zod type (string → '', number → 0, boolean → false)
 * - Validators from the Zod schema
 * - TypeScript types inferred from the schema
 */
export function createFormFromSchema<T extends Record<string, unknown>>(
  schema: ZodLikeObjectType,
  overrides?: Partial<Record<keyof T, Partial<FieldConfig<any>>>>,
): Form<Record<string, FieldConfig<any>>> {
  const config: Record<string, FieldConfig<any>> = {};

  for (const [key, fieldSchema] of Object.entries(schema.shape)) {
    const info = analyzeZodField(fieldSchema);
    const override = overrides?.[key as keyof T];

    config[key] = {
      initial: override?.initial ?? info.initial,
      validators: [
        zodFieldValidator(schema, key),
        ...(override?.validators ?? []),
      ],
      asyncValidators: override?.asyncValidators,
      debounce: override?.debounce,
    };
  }

  return defineForm(config);
}

/**
 * Get field metadata from a Zod schema (useful for generating UI).
 *
 * ```ts
 * const meta = getSchemaFields(schema);
 * // [{ name: 'email', type: 'string', required: true }, ...]
 * ```
 */
export function getSchemaFields(schema: ZodLikeObjectType): Array<{
  name: string;
  type: 'string' | 'number' | 'boolean' | 'unknown';
  required: boolean;
}> {
  return Object.entries(schema.shape).map(([name, field]) => {
    const info = analyzeZodField(field);
    return {
      name,
      type: info.type,
      required: !info.isOptional,
    };
  });
}
