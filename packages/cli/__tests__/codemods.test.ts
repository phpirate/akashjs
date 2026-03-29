import { describe, it, expect } from 'vitest';
import {
  renameImport,
  renameCall,
  addImport,
  removeImport,
  registerCodemod,
  getCodemodsFor,
} from '../src/commands/codemods.js';

describe('renameImport()', () => {
  it('renames import specifier and usage', () => {
    const input = [
      "import { createStore } from '@akashjs/runtime';",
      '',
      'const store = createStore({ count: 0 });',
    ].join('\n');

    const result = renameImport(input, '@akashjs/runtime', 'createStore', 'defineStore');

    expect(result).toContain("import { defineStore } from '@akashjs/runtime'");
    expect(result).toContain('const store = defineStore({ count: 0 })');
    expect(result).not.toContain('createStore');
  });
});

describe('renameCall()', () => {
  it('renames function calls', () => {
    const input = 'const client = createHttpClient({ baseURL: "/" });';
    const result = renameCall(input, 'createHttpClient', 'createClient');

    expect(result).toBe('const client = createClient({ baseURL: "/" });');
  });
});

describe('addImport()', () => {
  it('adds to existing import from the same package', () => {
    const input = "import { signal } from '@akashjs/runtime';";
    const result = addImport(input, '@akashjs/runtime', 'computed');

    expect(result).toContain('signal');
    expect(result).toContain('computed');
    expect(result).toContain("from '@akashjs/runtime'");
  });

  it('adds new import line if package not imported', () => {
    const input = "const x = 1;\n";
    const result = addImport(input, '@akashjs/router', 'Router');

    expect(result).toContain("import { Router } from '@akashjs/router'");
    expect(result).toContain('const x = 1;');
  });
});

describe('removeImport()', () => {
  it('removes specifier from multi-import', () => {
    const input = "import { signal, computed, effect } from '@akashjs/runtime';";
    const result = removeImport(input, '@akashjs/runtime', 'computed');

    expect(result).toContain('signal');
    expect(result).toContain('effect');
    expect(result).not.toMatch(/\bcomputed\b/);
  });
});

describe('registerCodemod()', () => {
  it('adds a codemod', () => {
    registerCodemod({
      id: 'test-codemod',
      from: '0.5.0',
      to: '0.6.0',
      description: 'Test codemod',
      extensions: ['.ts'],
      transform: (content) => content.replace('old', 'new'),
    });

    const matches = getCodemodsFor('0.5.0', '0.6.0');
    expect(matches.some((c) => c.id === 'test-codemod')).toBe(true);
  });
});

describe('getCodemodsFor()', () => {
  it('returns matching codemods for version range', () => {
    registerCodemod({
      id: 'range-test',
      from: '0.3.0',
      to: '0.4.0',
      description: 'Range test',
      extensions: ['.ts'],
      transform: () => null,
    });

    const matches = getCodemodsFor('0.1.0', '0.5.0');
    expect(matches.some((c) => c.id === 'range-test')).toBe(true);

    const noMatch = getCodemodsFor('0.5.0', '0.5.0');
    expect(noMatch.some((c) => c.id === 'range-test')).toBe(false);
  });
});
