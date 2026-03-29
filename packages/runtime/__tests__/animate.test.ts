/** @vitest-environment happy-dom */
import { describe, it, expect } from 'vitest';
import { keyframes, defineStates, animate } from '../src/animate.js';

describe('animate', () => {
  it('keyframes returns array of keyframes', () => {
    const frames = keyframes([
      { offset: 0, opacity: '0' },
      { offset: 0.5, opacity: '0.5' },
      { offset: 1, opacity: '1' },
    ]);
    expect(Array.isArray(frames)).toBe(true);
    expect(frames).toHaveLength(3);
    expect(frames[0]).toEqual({ offset: 0, opacity: '0' });
  });

  it('defineStates returns object with states and transitionTo', () => {
    const toggle = defineStates({
      open: { opacity: 1 },
      closed: { opacity: 0 },
    });
    expect(toggle.states).toHaveProperty('open');
    expect(toggle.states).toHaveProperty('closed');
    expect(typeof toggle.transitionTo).toBe('function');
  });

  it('animate is a function', () => {
    expect(typeof animate).toBe('function');
  });
});
