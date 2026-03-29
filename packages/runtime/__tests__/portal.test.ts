/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from 'vitest';
import { Portal } from '../src/portal.js';

describe('Portal', () => {
  it('is a valid AkashJS component', () => {
    expect(Portal._akash).toBe(true);
  });

  it('is a callable function', () => {
    expect(typeof Portal).toBe('function');
  });
});
