/**
 * Authentication utilities.
 *
 * Token management, refresh flow, and reactive user state.
 * Integrates with the HTTP client via interceptor and with
 * the router via guard.
 *
 * ```ts
 * const auth = createAuth({
 *   loginUrl: '/api/auth/login',
 *   refreshUrl: '/api/auth/refresh',
 *   userUrl: '/api/auth/me',
 *   tokenStorage: 'localStorage',
 * });
 *
 * await auth.login({ email, password });
 * auth.user();        // User | null
 * auth.isLoggedIn();  // boolean
 * auth.token();       // string | null
 * auth.logout();
 * ```
 */

import { signal, computed } from '@akashjs/runtime';
import type { ReadonlySignal } from '@akashjs/runtime';
import type { HttpInterceptor } from './types.js';

// --- Types ---

export interface AuthConfig<U = unknown> {
  /** URL for login POST */
  loginUrl?: string;
  /** URL for token refresh POST */
  refreshUrl?: string;
  /** URL for fetching current user GET */
  userUrl?: string;
  /** Where to store the token (default: 'localStorage') */
  tokenStorage?: 'localStorage' | 'sessionStorage' | 'memory';
  /** localStorage/sessionStorage key (default: 'akash-auth-token') */
  tokenKey?: string;
  /** Key for refresh token (default: 'akash-refresh-token') */
  refreshTokenKey?: string;
  /** Extract token from login response */
  getToken?: (response: unknown) => string;
  /** Extract refresh token from login response */
  getRefreshToken?: (response: unknown) => string | null;
  /** Extract user from user response */
  getUser?: (response: unknown) => U;
  /** Custom fetch function */
  fetch?: typeof globalThis.fetch;
}

export interface Auth<U = unknown> {
  /** Current user (reactive) */
  user: ReadonlySignal<U | null>;
  /** Access token (reactive) */
  token: ReadonlySignal<string | null>;
  /** Whether the user is logged in */
  isLoggedIn: ReadonlySignal<boolean>;
  /** Whether auth state is loading */
  loading: ReadonlySignal<boolean>;
  /** Login with credentials */
  login(credentials: unknown): Promise<void>;
  /** Logout and clear tokens */
  logout(): void;
  /** Manually set the token */
  setToken(token: string, refreshToken?: string): void;
  /** Fetch the current user */
  fetchUser(): Promise<void>;
  /** Refresh the token */
  refreshToken(): Promise<boolean>;
  /** HTTP interceptor that attaches the auth token */
  interceptor: HttpInterceptor;
  /** Router guard that redirects to login if not authenticated */
  guard(redirectTo?: string): (ctx: { redirect: (p: string) => any }) => any;
}

// --- Implementation ---

export function createAuth<U = unknown>(config: AuthConfig<U> = {}): Auth<U> {
  const {
    tokenStorage = 'localStorage',
    tokenKey = 'akash-auth-token',
    refreshTokenKey = 'akash-refresh-token',
    getToken = (r: any) => r.token ?? r.access_token,
    getRefreshToken = (r: any) => r.refreshToken ?? r.refresh_token ?? null,
    getUser = (r: any) => r.user ?? r,
    fetch: customFetch = globalThis.fetch.bind(globalThis),
  } = config;

  // Storage abstraction
  const memoryStore: Record<string, string> = {};
  function getStore(): { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void } {
    if (tokenStorage === 'memory' || typeof window === 'undefined') {
      return {
        getItem: (k) => memoryStore[k] ?? null,
        setItem: (k, v) => { memoryStore[k] = v; },
        removeItem: (k) => { delete memoryStore[k]; },
      };
    }
    return tokenStorage === 'sessionStorage' ? sessionStorage : localStorage;
  }

  const store = getStore();
  const token = signal<string | null>(store.getItem(tokenKey));
  const user = signal<U | null>(null);
  const loading = signal(false);
  const isLoggedIn = computed(() => token() !== null);

  function setToken(accessToken: string, refreshTkn?: string): void {
    token.set(accessToken);
    store.setItem(tokenKey, accessToken);
    if (refreshTkn) {
      store.setItem(refreshTokenKey, refreshTkn);
    }
  }

  function clearTokens(): void {
    token.set(null);
    user.set(null);
    store.removeItem(tokenKey);
    store.removeItem(refreshTokenKey);
  }

  async function login(credentials: unknown): Promise<void> {
    if (!config.loginUrl) throw new Error('[AkashJS Auth] loginUrl not configured');
    loading.set(true);
    try {
      const response = await customFetch(config.loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      if (!response.ok) throw new Error(`Login failed: ${response.status}`);
      const data = await response.json();
      setToken(getToken(data), getRefreshToken(data) ?? undefined);
      if (config.userUrl) {
        await fetchUser();
      } else {
        const u = getUser(data);
        if (u) user.set(u);
      }
    } finally {
      loading.set(false);
    }
  }

  async function fetchUser(): Promise<void> {
    if (!config.userUrl || !token()) return;
    loading.set(true);
    try {
      const response = await customFetch(config.userUrl, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (response.ok) {
        const data = await response.json();
        user.set(getUser(data));
      } else {
        user.set(null);
      }
    } finally {
      loading.set(false);
    }
  }

  async function refreshTokenFn(): Promise<boolean> {
    if (!config.refreshUrl) return false;
    const refreshTkn = store.getItem(refreshTokenKey);
    if (!refreshTkn) return false;

    try {
      const response = await customFetch(config.refreshUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refreshTkn }),
      });
      if (!response.ok) {
        clearTokens();
        return false;
      }
      const data = await response.json();
      setToken(getToken(data), getRefreshToken(data) ?? undefined);
      return true;
    } catch {
      clearTokens();
      return false;
    }
  }

  // HTTP interceptor
  const interceptor: HttpInterceptor = async (request, next) => {
    const t = token();
    if (t) {
      request.headers.set('Authorization', `Bearer ${t}`);
    }
    const response = await next(request);
    if (response.status === 401 && config.refreshUrl) {
      const refreshed = await refreshTokenFn();
      if (refreshed) {
        request.headers.set('Authorization', `Bearer ${token()}`);
        return next(request);
      }
    }
    return response;
  };

  // Router guard factory
  function guard(redirectTo = '/login') {
    return (ctx: { redirect: (p: string) => any }) => {
      if (!isLoggedIn()) {
        return ctx.redirect(redirectTo);
      }
    };
  }

  return {
    user: () => user(),
    token: () => token(),
    isLoggedIn,
    loading: () => loading(),
    login,
    logout: clearTokens,
    setToken,
    fetchUser,
    refreshToken: refreshTokenFn,
    interceptor,
    guard,
  };
}
