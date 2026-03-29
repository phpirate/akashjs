import { describe, it, expect, vi } from 'vitest';
import { defineMiddleware, runMiddleware, composeMiddleware } from '../src/middleware.js';

function createContext(overrides: Partial<{ to: string; from: string; params: Record<string, string> }> = {}) {
  return {
    to: overrides.to ?? '/dashboard',
    from: overrides.from ?? '/',
    params: overrides.params ?? {},
    redirect: (path: string) => ({ _type: 'redirect' as const, path }),
  };
}

describe('defineMiddleware', () => {
  it('returns a function', () => {
    const mw = defineMiddleware(() => {});
    expect(typeof mw).toBe('function');
  });

  it('the returned function is the same as the input', () => {
    const fn = () => {};
    const mw = defineMiddleware(fn);
    expect(mw).toBe(fn);
  });
});

describe('runMiddleware', () => {
  it('runs all middleware in order', async () => {
    const order: number[] = [];
    const mw1 = defineMiddleware(() => { order.push(1); });
    const mw2 = defineMiddleware(() => { order.push(2); });
    const mw3 = defineMiddleware(() => { order.push(3); });

    await runMiddleware([mw1, mw2, mw3], createContext());
    expect(order).toEqual([1, 2, 3]);
  });

  it('returns null when no middleware redirects', async () => {
    const mw = defineMiddleware(() => {});
    const result = await runMiddleware([mw], createContext());
    expect(result).toBe(null);
  });

  it('stops at a redirect and returns the redirect result', async () => {
    const order: number[] = [];
    const mw1 = defineMiddleware(() => { order.push(1); });
    const mw2 = defineMiddleware(({ redirect }) => {
      order.push(2);
      return redirect('/login');
    });
    const mw3 = defineMiddleware(() => { order.push(3); });

    const result = await runMiddleware([mw1, mw2, mw3], createContext());
    expect(result).toEqual({ _type: 'redirect', path: '/login' });
    expect(order).toEqual([1, 2]); // mw3 should not run
  });

  it('passes context to each middleware', async () => {
    const spy = vi.fn();
    const mw = defineMiddleware((ctx) => {
      spy(ctx.to, ctx.from, ctx.params);
    });

    await runMiddleware([mw], createContext({ to: '/about', from: '/home', params: { id: '42' } }));
    expect(spy).toHaveBeenCalledWith('/about', '/home', { id: '42' });
  });

  it('handles async middleware', async () => {
    const mw = defineMiddleware(async ({ redirect }) => {
      await new Promise((r) => setTimeout(r, 1));
      return redirect('/login');
    });

    const result = await runMiddleware([mw], createContext());
    expect(result).toEqual({ _type: 'redirect', path: '/login' });
  });
});

describe('composeMiddleware', () => {
  it('combines multiple middleware into one', async () => {
    const order: number[] = [];
    const mw1 = defineMiddleware(() => { order.push(1); });
    const mw2 = defineMiddleware(() => { order.push(2); });

    const composed = composeMiddleware(mw1, mw2);
    expect(typeof composed).toBe('function');

    await composed(createContext());
    expect(order).toEqual([1, 2]);
  });

  it('composed middleware stops at redirect', async () => {
    const order: number[] = [];
    const mw1 = defineMiddleware(({ redirect }) => {
      order.push(1);
      return redirect('/blocked');
    });
    const mw2 = defineMiddleware(() => { order.push(2); });

    const composed = composeMiddleware(mw1, mw2);
    const result = await composed(createContext());
    expect(result).toEqual({ _type: 'redirect', path: '/blocked' });
    expect(order).toEqual([1]);
  });
});
