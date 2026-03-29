import { describe, it, expect } from 'vitest';
import { validateEnv, generateEnvTypes } from '../src/env.js';

describe('validateEnv', () => {
  it('validates required string', () => {
    const result = validateEnv(
      { API_URL: { type: 'string', required: true } },
      { API_URL: 'https://api.example.com' },
    );
    expect(result.valid).toBe(true);
    expect(result.values.API_URL).toBe('https://api.example.com');
  });

  it('fails on missing required', () => {
    const result = validateEnv(
      { API_URL: { type: 'string', required: true } },
      {},
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0].key).toBe('API_URL');
  });

  it('applies default values', () => {
    const result = validateEnv(
      { DEBUG: { type: 'boolean', default: false } },
      {},
    );
    expect(result.valid).toBe(true);
    expect(result.values.DEBUG).toBe(false);
  });

  it('parses number type', () => {
    const result = validateEnv(
      { PORT: { type: 'number' } },
      { PORT: '3000' },
    );
    expect(result.valid).toBe(true);
    expect(result.values.PORT).toBe(3000);
  });

  it('fails on invalid number', () => {
    const result = validateEnv(
      { PORT: { type: 'number' } },
      { PORT: 'abc' },
    );
    expect(result.valid).toBe(false);
  });

  it('parses boolean true', () => {
    const result = validateEnv(
      { DEBUG: { type: 'boolean' } },
      { DEBUG: 'true' },
    );
    expect(result.values.DEBUG).toBe(true);
  });

  it('parses boolean false', () => {
    const result = validateEnv(
      { DEBUG: { type: 'boolean' } },
      { DEBUG: 'false' },
    );
    expect(result.values.DEBUG).toBe(false);
  });

  it('parses boolean 1/0', () => {
    expect(validateEnv({ D: { type: 'boolean' } }, { D: '1' }).values.D).toBe(true);
    expect(validateEnv({ D: { type: 'boolean' } }, { D: '0' }).values.D).toBe(false);
  });

  it('fails on invalid boolean', () => {
    const result = validateEnv(
      { DEBUG: { type: 'boolean' } },
      { DEBUG: 'yes' },
    );
    expect(result.valid).toBe(false);
  });

  it('validates multiple fields', () => {
    const result = validateEnv(
      {
        API_URL: { type: 'string', required: true },
        PORT: { type: 'number', default: 3000 },
        DEBUG: { type: 'boolean', default: false },
      },
      { API_URL: 'http://localhost' },
    );
    expect(result.valid).toBe(true);
    expect(result.values).toEqual({
      API_URL: 'http://localhost',
      PORT: 3000,
      DEBUG: false,
    });
  });
});

describe('generateEnvTypes', () => {
  it('generates TypeScript declarations', () => {
    const types = generateEnvTypes({
      VITE_API_URL: { type: 'string', required: true, description: 'API URL' },
      VITE_DEBUG: { type: 'boolean', default: false },
      VITE_PORT: { type: 'number' },
    });

    expect(types).toContain('interface ImportMetaEnv');
    expect(types).toContain('readonly VITE_API_URL: string');
    expect(types).toContain('readonly VITE_DEBUG: boolean');
    expect(types).toContain('readonly VITE_PORT?: number');
    expect(types).toContain('/** API URL */');
  });

  it('marks non-required without default as optional', () => {
    const types = generateEnvTypes({
      OPT: { type: 'string' },
    });
    expect(types).toContain('OPT?: string');
  });

  it('marks required as non-optional', () => {
    const types = generateEnvTypes({
      REQ: { type: 'string', required: true },
    });
    expect(types).toContain('readonly REQ: string');
    expect(types).not.toContain('REQ?');
  });
});
