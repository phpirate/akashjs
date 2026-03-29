/** @vitest-environment happy-dom */
import { describe, it, expect } from 'vitest';
import { Switch, match } from '../src/switch.js';

describe('switch', () => {
  it('Switch is a valid component (_akash true)', () => {
    expect((Switch as any)._akash).toBe(true);
  });

  it('match returns matching branch result', () => {
    const result = match('loading', {
      loading: () => 'spinner',
      error: () => 'error-view',
    });
    expect(result).toBe('spinner');
  });

  it('match returns default when no match', () => {
    const result = match('unknown', {
      loading: () => 'spinner',
      _: () => 'fallback',
    });
    expect(result).toBe('fallback');
  });

  it('match returns undefined when no match and no default', () => {
    const result = match('unknown', {
      loading: () => 'spinner',
    });
    expect(result).toBeUndefined();
  });
});
