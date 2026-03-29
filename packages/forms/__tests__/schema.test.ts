import { describe, it, expect } from 'vitest';
import { getSchemaFields, createFormFromSchema } from '../src/schema.js';

// Mock Zod-like field types
function mockZodString(opts?: { optional?: boolean }) {
  const field: any = {
    _def: { typeName: 'ZodString' },
    safeParse(data: unknown) {
      return typeof data === 'string' ? { success: true } : { success: false, error: { issues: [{ message: 'Expected string' }] } };
    },
  };
  if (opts?.optional) {
    return {
      _def: { typeName: 'ZodOptional', innerType: field },
      safeParse: field.safeParse,
    };
  }
  return field;
}

function mockZodNumber() {
  return {
    _def: { typeName: 'ZodNumber' },
    safeParse(data: unknown) {
      return typeof data === 'number' ? { success: true } : { success: false, error: { issues: [{ message: 'Expected number' }] } };
    },
  };
}

function mockZodBoolean() {
  return {
    _def: { typeName: 'ZodBoolean' },
    safeParse(data: unknown) {
      return typeof data === 'boolean' ? { success: true } : { success: false, error: { issues: [{ message: 'Expected boolean' }] } };
    },
  };
}

function mockSchema(fields: Record<string, any>) {
  return {
    _def: { typeName: 'ZodObject' },
    shape: fields,
    safeParse(data: unknown) {
      return { success: true };
    },
  };
}

describe('getSchemaFields', () => {
  it('extracts name, type, and required from a mock Zod schema', () => {
    const schema = mockSchema({
      name: mockZodString(),
      age: mockZodNumber(),
      active: mockZodBoolean(),
      nickname: mockZodString({ optional: true }),
    });

    const fields = getSchemaFields(schema as any);

    expect(fields).toHaveLength(4);

    const nameField = fields.find((f) => f.name === 'name');
    expect(nameField).toEqual({ name: 'name', type: 'string', required: true });

    const ageField = fields.find((f) => f.name === 'age');
    expect(ageField).toEqual({ name: 'age', type: 'number', required: true });

    const activeField = fields.find((f) => f.name === 'active');
    expect(activeField).toEqual({ name: 'active', type: 'boolean', required: true });

    const nicknameField = fields.find((f) => f.name === 'nickname');
    expect(nicknameField).toEqual({ name: 'nickname', type: 'string', required: false });
  });
});

describe('createFormFromSchema', () => {
  it('creates a form with fields matching the schema keys', () => {
    const schema = mockSchema({
      email: mockZodString(),
      age: mockZodNumber(),
      agree: mockZodBoolean(),
    });

    const form = createFormFromSchema(schema as any);

    expect(form.fields).toBeDefined();
    expect(form.fields.email).toBeDefined();
    expect(form.fields.age).toBeDefined();
    expect(form.fields.agree).toBeDefined();
  });
});
