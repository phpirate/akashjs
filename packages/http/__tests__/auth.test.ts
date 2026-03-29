import { describe, it, expect } from 'vitest';
import { createAuth } from '../src/auth.js';

describe('createAuth', () => {
  it('returns user/token/isLoggedIn signals; starts with null user and token from storage', () => {
    const auth = createAuth({ tokenStorage: 'memory' });

    expect(auth.user()).toBeNull();
    expect(auth.token()).toBeNull();
    expect(auth.isLoggedIn()).toBe(false);
  });

  it('setToken sets the token and isLoggedIn becomes true', () => {
    const auth = createAuth({ tokenStorage: 'memory' });

    auth.setToken('abc123');
    expect(auth.token()).toBe('abc123');
    expect(auth.isLoggedIn()).toBe(true);
  });

  it('logout clears token and user', () => {
    const auth = createAuth({ tokenStorage: 'memory' });

    auth.setToken('abc123');
    expect(auth.isLoggedIn()).toBe(true);

    auth.logout();
    expect(auth.token()).toBeNull();
    expect(auth.user()).toBeNull();
    expect(auth.isLoggedIn()).toBe(false);
  });

  it('guard returns redirect when not logged in', () => {
    const auth = createAuth({ tokenStorage: 'memory' });

    const guardFn = auth.guard('/login');
    const redirectResult = 'redirected-to-login';
    const ctx = { redirect: (path: string) => `${redirectResult}:${path}` };

    const result = guardFn(ctx);
    expect(result).toBe('redirected-to-login:/login');
  });

  it('guard returns void when logged in', () => {
    const auth = createAuth({ tokenStorage: 'memory' });
    auth.setToken('valid-token');

    const guardFn = auth.guard('/login');
    const ctx = { redirect: (path: string) => `redirected:${path}` };

    const result = guardFn(ctx);
    expect(result).toBeUndefined();
  });

  it('interceptor adds Authorization header when token is set', async () => {
    const auth = createAuth({ tokenStorage: 'memory' });
    auth.setToken('my-token');

    const request = new Request('https://api.example.com/data');
    const next = async (req: Request) => {
      expect(req.headers.get('Authorization')).toBe('Bearer my-token');
      return new Response('ok', { status: 200 });
    };

    await auth.interceptor(request, next);
  });
});
