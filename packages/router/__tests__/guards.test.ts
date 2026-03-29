import { describe, it, expect, vi } from 'vitest';
import { composeGuards, guardWith } from '../src/guards.js';
import type { GuardContext, NavigationResult } from '../src/types.js';

function makeCtx(params: Record<string, string> = {}): GuardContext {
  return {
    params,
    redirect: (path: string): NavigationResult => ({ _type: 'redirect', path }),
  };
}

describe('composeGuards', () => {
  it('allows navigation when all guards pass', async () => {
    const g1 = vi.fn();
    const g2 = vi.fn();
    const composed = composeGuards(g1, g2);

    const result = await composed(makeCtx());
    expect(result).toBeUndefined();
    expect(g1).toHaveBeenCalledTimes(1);
    expect(g2).toHaveBeenCalledTimes(1);
  });

  it('stops at first redirect', async () => {
    const g1 = vi.fn((ctx: GuardContext) => ctx.redirect('/login'));
    const g2 = vi.fn();
    const composed = composeGuards(g1, g2);

    const result = await composed(makeCtx());
    expect(result).toEqual({ _type: 'redirect', path: '/login' });
    expect(g2).not.toHaveBeenCalled();
  });

  it('handles async guards', async () => {
    const g1 = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 1));
    });
    const g2 = vi.fn();
    const composed = composeGuards(g1, g2);

    const result = await composed(makeCtx());
    expect(result).toBeUndefined();
    expect(g1).toHaveBeenCalled();
    expect(g2).toHaveBeenCalled();
  });
});

describe('guardWith', () => {
  it('allows when check returns true', async () => {
    const guard = guardWith(() => true, '/login');
    const result = await guard(makeCtx());
    expect(result).toBeUndefined();
  });

  it('redirects when check returns false', async () => {
    const guard = guardWith(() => false, '/login');
    const result = await guard(makeCtx());
    expect(result).toEqual({ _type: 'redirect', path: '/login' });
  });

  it('handles async checks', async () => {
    const guard = guardWith(async () => {
      await new Promise((r) => setTimeout(r, 1));
      return false;
    }, '/unauthorized');

    const result = await guard(makeCtx());
    expect(result).toEqual({ _type: 'redirect', path: '/unauthorized' });
  });

  it('passes context to check function', async () => {
    const check = vi.fn(() => true);
    const guard = guardWith(check, '/login');

    const ctx = makeCtx({ id: '42' });
    await guard(ctx);
    expect(check).toHaveBeenCalledWith(ctx);
  });
});
