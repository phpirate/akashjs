/** @vitest-environment happy-dom */
import { describe, it, expect } from 'vitest';
import { createFlip, flip } from '../src/flip.js';

describe('flip', () => {
  it('createFlip returns controller with measure/animate/flip', () => {
    const container = document.createElement('div');
    const controller = createFlip(container);
    expect(typeof controller.measure).toBe('function');
    expect(typeof controller.animate).toBe('function');
    expect(typeof controller.flip).toBe('function');
  });

  it('flip is a function', () => {
    expect(typeof flip).toBe('function');
  });
});
