import { describe, it, expect } from 'vitest';
import { defineAPI, createAPIHandler, APIError, useQuery } from '../src/api.js';

// Minimal Zod-compatible schema for testing
function fakeSchema<T>(validator: (v: unknown) => v is T) {
  return {
    parse(data: unknown): T {
      if (!validator(data)) throw new Error('Validation failed');
      return data;
    },
    safeParse(data: unknown) {
      if (validator(data)) return { success: true as const, data };
      return {
        success: false as const,
        error: { issues: [{ message: 'Validation failed' }] },
      };
    },
  };
}

const stringSchema = fakeSchema((v: unknown): v is { name: string } => {
  return typeof v === 'object' && v !== null && 'name' in v && typeof (v as any).name === 'string';
});

describe('defineAPI', () => {
  it('returns definition with _endpoints', () => {
    const api = defineAPI({
      greet: {
        method: 'GET',
        resolve: () => 'hello',
      },
    });
    expect(api._endpoints).toBeDefined();
    expect(api._endpoints.greet).toBeDefined();
    expect(api._endpoints.greet.resolve).toBeTypeOf('function');
  });
});

describe('createAPIHandler', () => {
  const api = defineAPI({
    greet: {
      method: 'POST',
      input: stringSchema,
      resolve: ({ input }: { input: { name: string } }) => ({ message: `Hello ${input.name}` }),
    },
    noValidation: {
      resolve: () => ({ ok: true }),
    },
  });

  const handler = createAPIHandler(api);

  it('handles valid endpoint', async () => {
    const result = await handler('greet', { name: 'World' });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ message: 'Hello World' });
  });

  it('returns 404 for unknown endpoint', async () => {
    const result = await handler('unknown', {});
    expect(result.status).toBe(404);
  });

  it('validates input (returns 400 for invalid)', async () => {
    const result = await handler('greet', { bad: 'data' });
    expect(result.status).toBe(400);
    expect((result.body as any).error).toBe('Validation failed');
  });

  it('executes resolver', async () => {
    const result = await handler('noValidation', {});
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true });
  });
});

describe('APIError', () => {
  it('has status/endpoint/body', () => {
    const err = new APIError(404, 'getUser', 'not found');
    expect(err.status).toBe(404);
    expect(err.endpoint).toBe('getUser');
    expect(err.body).toBe('not found');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('useQuery', () => {
  it('returns data/loading/error signals', () => {
    const query = useQuery(() => Promise.resolve('result'));
    expect(query.data).toBeTypeOf('function');
    expect(query.loading).toBeTypeOf('function');
    expect(query.error).toBeTypeOf('function');
    expect(query.refetch).toBeTypeOf('function');
  });

  it('loading starts true', () => {
    const query = useQuery(() => Promise.resolve('result'));
    expect(query.loading()).toBe(true);
  });
});
