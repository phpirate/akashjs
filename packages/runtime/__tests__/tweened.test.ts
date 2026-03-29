import { describe, it, expect } from 'vitest';
import { tweened, easings } from '../src/tweened.js';

describe('tweened', () => {
  it('creates a readable value with initial value', () => {
    const t = tweened(42);
    expect(t()).toBe(42);
  });

  it('setImmediate updates value instantly', () => {
    const t = tweened(0);
    t.setImmediate(100);
    expect(t()).toBe(100);
  });

  it('target() returns the target value', () => {
    const t = tweened(10);
    t.setImmediate(50);
    expect(t.target()).toBe(50);
  });

  it('easings.linear(0.5) === 0.5', () => {
    expect(easings.linear(0.5)).toBe(0.5);
  });

  it('easings.cubicOut is a function', () => {
    expect(typeof easings.cubicOut).toBe('function');
  });
});
