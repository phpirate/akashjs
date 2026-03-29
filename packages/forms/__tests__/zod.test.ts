import { describe, it, expect } from 'vitest';
import { zodFieldValidator, zodValidator } from '../src/zod.js';

// Mock Zod-like schema objects

function createFieldSchema(validator: (data: unknown) => { success: boolean; error?: { issues: Array<{ path: (string | number)[]; message: string }> } }) {
  return { safeParse: validator };
}

function createObjectSchema(
  shape: Record<string, ReturnType<typeof createFieldSchema>>,
  fullValidator?: (data: unknown) => { success: boolean; error?: { issues: Array<{ path: (string | number)[]; message: string }> } },
) {
  const schema = {
    shape,
    safeParse: fullValidator ?? ((data: unknown) => {
      const issues: Array<{ path: (string | number)[]; message: string }> = [];
      const obj = data as Record<string, unknown>;
      for (const [key, fieldSchema] of Object.entries(shape)) {
        const result = fieldSchema.safeParse(obj[key]);
        if (!result.success && result.error) {
          for (const issue of result.error.issues) {
            issues.push({ path: [key, ...issue.path], message: issue.message });
          }
        }
      }
      return issues.length === 0
        ? { success: true }
        : { success: false, error: { issues } };
    }),
  };
  return schema;
}

const emailField = createFieldSchema((value) => {
  if (typeof value === 'string' && value.includes('@')) {
    return { success: true };
  }
  return { success: false, error: { issues: [{ path: [], message: 'Invalid email' }] } };
});

const nameField = createFieldSchema((value) => {
  if (typeof value === 'string' && value.length >= 1) {
    return { success: true };
  }
  return { success: false, error: { issues: [{ path: [], message: 'Name is required' }] } };
});

const mockSchema = createObjectSchema({ email: emailField, name: nameField });

describe('zodFieldValidator', () => {
  it('returns null for a valid value', () => {
    const validate = zodFieldValidator(mockSchema as any, 'email');
    expect(validate('user@example.com')).toBe(null);
  });

  it('returns an error string for an invalid value', () => {
    const validate = zodFieldValidator(mockSchema as any, 'email');
    expect(validate('bad')).toBe('Invalid email');
  });

  it('works for different fields', () => {
    const validate = zodFieldValidator(mockSchema as any, 'name');
    expect(validate('Alice')).toBe(null);
    expect(validate('')).toBe('Name is required');
  });

  it('throws if field does not exist in schema', () => {
    expect(() => zodFieldValidator(mockSchema as any, 'nonexistent')).toThrow();
  });
});

describe('zodValidator', () => {
  it('returns empty object for valid data', () => {
    const validate = zodValidator(mockSchema as any);
    const errors = validate({ email: 'user@test.com', name: 'Alice' });
    expect(errors).toEqual({});
  });

  it('returns errors keyed by field name', () => {
    const validate = zodValidator(mockSchema as any);
    const errors = validate({ email: 'bad', name: '' });
    expect(errors).toHaveProperty('email');
    expect(errors.email[0]).toBe('Invalid email');
    expect(errors).toHaveProperty('name');
    expect(errors.name[0]).toBe('Name is required');
  });

  it('returns errors only for invalid fields', () => {
    const validate = zodValidator(mockSchema as any);
    const errors = validate({ email: 'user@test.com', name: '' });
    expect(errors).not.toHaveProperty('email');
    expect(errors).toHaveProperty('name');
  });
});
