/** @vitest-environment happy-dom */
import { describe, it, expect } from 'vitest';
import {
  defineSnippet,
  inspect,
  defineFormAction,
  enableSnapshots,
} from '../src/snippets.js';

describe('defineSnippet', () => {
  it('returns a function', () => {
    const snippet = defineSnippet((name: string) => {
      const el = document.createElement('span');
      el.textContent = name;
      return el;
    });
    expect(typeof snippet).toBe('function');
  });

  it('result produces AkashNode when called', () => {
    const snippet = defineSnippet((name: string) => {
      const el = document.createElement('span');
      el.textContent = name;
      return el;
    });
    const node = snippet('hello');
    expect(node).toBeInstanceOf(HTMLSpanElement);
    expect((node as HTMLSpanElement).textContent).toBe('hello');
  });
});

describe('inspect', () => {
  it('is a function that returns a dispose function', () => {
    expect(typeof inspect).toBe('function');
    const dispose = inspect(() => 42);
    expect(typeof dispose).toBe('function');
    dispose();
  });
});

describe('defineFormAction', () => {
  it('returns object with submitting/result/error/handle/submit', () => {
    const action = defineFormAction('/api/test');
    expect(typeof action.submitting).toBe('function');
    expect(typeof action.result).toBe('function');
    expect(typeof action.error).toBe('function');
    expect(typeof action.handle).toBe('function');
    expect(typeof action.submit).toBe('function');
  });
});

describe('enableSnapshots', () => {
  it('returns a dispose function', () => {
    const dispose = enableSnapshots();
    expect(typeof dispose).toBe('function');
    dispose();
  });
});
