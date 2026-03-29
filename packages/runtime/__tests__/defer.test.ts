/** @vitest-environment happy-dom */
import { describe, it, expect } from 'vitest';
import { defer } from '../src/defer.js';
import { defineComponent } from '../src/component.js';

describe('defer', () => {
  it('defer returns a component (_akash is true) when given a loader function', () => {
    const MockComponent = defineComponent(() => {
      return () => document.createElement('div');
    });

    const loader = () => Promise.resolve({ default: MockComponent });
    const Deferred = defer(loader);

    expect(Deferred._akash).toBe(true);
    expect(typeof Deferred).toBe('function');
  });
});
