/** @vitest-environment happy-dom */
import { describe, it, expect } from 'vitest';
import { deepSignal, toRaw, isDeepSignal } from '../src/deep-signal.js';

describe('deepSignal', () => {
  it('creates proxy with initial values readable', () => {
    const state = deepSignal({ count: 0, label: 'test' });
    expect(state.count).toBe(0);
    expect(state.label).toBe('test');
  });

  it('nested property access works', () => {
    const state = deepSignal({ user: { name: 'Alice', age: 30 } });
    expect(state.user.name).toBe('Alice');
    expect(state.user.age).toBe(30);
  });

  it('setting nested property changes value', () => {
    const state = deepSignal({ user: { name: 'Alice' } });
    state.user.name = 'Bob';
    expect(state.user.name).toBe('Bob');
  });

  it('$raw returns plain object copy', () => {
    const state = deepSignal({ user: { name: 'Alice' }, items: [1, 2] });
    const raw = state.$raw;
    expect(raw).toEqual({ user: { name: 'Alice' }, items: [1, 2] });
    // Should be a copy, not the same reference
    expect(typeof raw).toBe('object');
  });

  it('toRaw returns the raw value', () => {
    const state = deepSignal({ x: 10 });
    const raw = toRaw(state);
    expect(raw).toEqual({ x: 10 });
  });

  it('isDeepSignal returns true for deep signal, false for plain object', () => {
    const state = deepSignal({ a: 1 });
    expect(isDeepSignal(state)).toBe(true);
    expect(isDeepSignal({ a: 1 })).toBe(false);
    expect(isDeepSignal(null)).toBe(false);
  });
});
