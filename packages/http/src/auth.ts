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
  /** URL for logout POST/GET (server-side session invalidation) */
  logoutUrl?: string;
  /** URL for signup POST */
  signupUrl?: string;
  /** URL for token refresh POST */
  refreshUrl?: string;
  /** URL for fetching current user GET */
  userUrl?: string;
  /** URL for fetching auth config GET (SSO enabled, signup enabled, etc.) */
  configUrl?: string;
  /** URL for forgot password POST */
  forgotPasswordUrl?: string;
  /** URL for reset password POST */
  resetPasswordUrl?: string;
  /** Auth mode: 'token' (Bearer header) or 'cookie' (httpOnly cookies, no token mgmt) */
  mode?: 'token' | 'cookie';
  /** Where to store the token (default: 'localStorage'). Ignored in cookie mode. */
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
  /** Transform login credentials before POST */
  loginPayload?: (credentials: unknown) => unknown;
  /** Auto-restore session on creation (fetch user if token exists or in cookie mode) */
  autoRestore?: boolean;
  /** Called after successful login */
  onLogin?: (user: U) => void;
  /** Called after logout */
  onLogout?: () => void;
  /** Called when a 401 is detected and refresh fails */
  onSessionExpired?: () => void;
}

export interface Auth<U = unknown> {
  /** Current user (reactive) */
  user: ReadonlySignal<U | null>;
  /** Access token (reactive) — null in cookie mode */
  token: ReadonlySignal<string | null>;
  /** Whether the user is logged in */
  isLoggedIn: ReadonlySignal<boolean>;
  /** Whether auth state is loading */
  loading: ReadonlySignal<boolean>;
  /** Auth config fetched from configUrl (reactive) */
  config: ReadonlySignal<unknown>;
  /** Login with credentials */
  login(credentials: unknown): Promise<void>;
  /** Signup with user data */
  signup(data: unknown): Promise<void>;
  /** Send forgot password email */
  forgotPassword(email: string): Promise<void>;
  /** Reset password with token */
  resetPassword(token: string, newPassword: string): Promise<void>;
  /** Logout and clear tokens */
  logout(): void;
  /** Manually set the token */
  setToken(token: string, refreshToken?: string): void;
  /** Fetch the current user */
  fetchUser(): Promise<void>;
  /** Refresh the token */
  refreshToken(): Promise<boolean>;
  /** Fetch auth config from configUrl */
  fetchConfig(): Promise<void>;
  /** HTTP interceptor that attaches the auth token */
  interceptor: HttpInterceptor;
  /** Router guard that redirects to login if not authenticated */
  guard(redirectTo?: string): (ctx: { redirect: (p: string) => any }) => any;
}

// --- Implementation ---

export function createAuth<U = unknown>(config: AuthConfig<U> = {}): Auth<U> {
  const {
    mode = 'token',
    tokenStorage = 'localStorage',
    tokenKey = 'akash-auth-token',
    refreshTokenKey = 'akash-refresh-token',
    getToken = (r: any) => r.token ?? r.access_token,
    getRefreshToken = (r: any) => r.refreshToken ?? r.refresh_token ?? null,
    getUser = (r: any) => r.user ?? r,
    fetch: customFetch = globalThis.fetch.bind(globalThis),
    loginPayload,
  } = config;

  const isCookieMode = mode === 'cookie';

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
  const token = signal<string | null>(isCookieMode ? null : store.getItem(tokenKey));
  const user = signal<U | null>(null);
  const loading = signal(false);
  const authConfigSignal = signal<unknown>(null);
  const isLoggedIn = computed(() => isCookieMode ? user() !== null : token() !== null);
  let loginAbort: AbortController | null = null;

  // Helper: build fetch options for cookie mode
  function fetchOpts(init?: RequestInit): RequestInit {
    return isCookieMode
      ? { ...init, credentials: 'include' as RequestCredentials }
      : init ?? {};
  }

  function setTokenFn(accessToken: string, refreshTkn?: string): void {
    if (isCookieMode) return; // No token management in cookie mode
    token.set(accessToken);
    store.setItem(tokenKey, accessToken);
    if (refreshTkn) {
      store.setItem(refreshTokenKey, refreshTkn);
    }
  }

  function clearTokens(): void {
    token.set(null);
    user.set(null);
    if (!isCookieMode) {
      store.removeItem(tokenKey);
      store.removeItem(refreshTokenKey);
    }
  }

  async function login(credentials: unknown): Promise<void> {
    if (!config.loginUrl) throw new Error('[AkashJS Auth] loginUrl not configured');
    // Abort any previous in-flight login
    if (loginAbort) loginAbort.abort();
    loginAbort = new AbortController();
    const { signal: abortSignal } = loginAbort;

    loading.set(true);
    try {
      const payload = loginPayload ? loginPayload(credentials) : credentials;
      const response = await customFetch(config.loginUrl, fetchOpts({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: abortSignal,
      }));
      if (abortSignal.aborted) return; // logout was called during login
      if (!response.ok) throw new Error(`Login failed: ${response.status}`);
      const data = await response.json();
      if (abortSignal.aborted) return;
      if (!isCookieMode) {
        setTokenFn(getToken(data), getRefreshToken(data) ?? undefined);
      }
      if (config.userUrl) {
        await fetchUser();
      } else {
        const u = getUser(data);
        if (u && !abortSignal.aborted) user.set(u);
      }
      if (!abortSignal.aborted) config.onLogin?.(user() as U);
    } catch (err) {
      // Swallow abort errors — logout intentionally cancelled the login
      if (err instanceof DOMException && err.name === 'AbortError') return;
      throw err;
    } finally {
      loading.set(false);
      loginAbort = null;
    }
  }

  async function signup(data: unknown): Promise<void> {
    if (!config.signupUrl) throw new Error('[AkashJS Auth] signupUrl not configured');
    loading.set(true);
    try {
      const response = await customFetch(config.signupUrl, fetchOpts({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }));
      if (!response.ok) throw new Error(`Signup failed: ${response.status}`);
    } finally {
      loading.set(false);
    }
  }

  async function forgotPassword(email: string): Promise<void> {
    if (!config.forgotPasswordUrl) throw new Error('[AkashJS Auth] forgotPasswordUrl not configured');
    const response = await customFetch(config.forgotPasswordUrl, fetchOpts({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }));
    if (!response.ok) throw new Error(`Forgot password failed: ${response.status}`);
  }

  async function resetPassword(resetToken: string, newPassword: string): Promise<void> {
    if (!config.resetPasswordUrl) throw new Error('[AkashJS Auth] resetPasswordUrl not configured');
    const response = await customFetch(config.resetPasswordUrl, fetchOpts({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, password: newPassword }),
    }));
    if (!response.ok) throw new Error(`Reset password failed: ${response.status}`);
  }

  async function fetchUser(): Promise<void> {
    if (!config.userUrl) return;
    if (!isCookieMode && !token()) return;
    loading.set(true);
    try {
      const headers: Record<string, string> = {};
      if (!isCookieMode && token()) headers.Authorization = `Bearer ${token()}`;
      const response = await customFetch(config.userUrl, fetchOpts({ headers }));
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

  async function fetchConfig(): Promise<void> {
    if (!config.configUrl) return;
    try {
      const response = await customFetch(config.configUrl, fetchOpts());
      if (response.ok) {
        authConfigSignal.set(await response.json());
      }
    } catch { /* config fetch failed — non-critical */ }
  }

  async function refreshTokenFn(): Promise<boolean> {
    if (!config.refreshUrl) return false;
    if (isCookieMode) {
      // Cookie mode: just call the refresh endpoint, cookies are sent automatically
      try {
        const response = await customFetch(config.refreshUrl, fetchOpts({ method: 'POST' }));
        return response.ok;
      } catch { return false; }
    }
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
      setTokenFn(getToken(data), getRefreshToken(data) ?? undefined);
      return true;
    } catch {
      clearTokens();
      return false;
    }
  }

  function logout(): void {
    // Abort any in-flight login to prevent it from overwriting the logout
    if (loginAbort) { loginAbort.abort(); loginAbort = null; }
    // Server-side logout if configured
    if (config.logoutUrl) {
      customFetch(config.logoutUrl, fetchOpts({ method: 'POST' })).catch(() => {});
    }
    clearTokens();
    config.onLogout?.();
  }

  // HTTP interceptor
  const interceptor: HttpInterceptor = async (request, next) => {
    if (!isCookieMode) {
      const t = token();
      if (t) {
        request.headers.set('Authorization', `Bearer ${t}`);
      }
    }
    const response = await next(request);
    if (response.status === 401) {
      if (config.refreshUrl) {
        const refreshed = await refreshTokenFn();
        if (refreshed) {
          if (!isCookieMode) {
            request.headers.set('Authorization', `Bearer ${token()}`);
          }
          return next(request);
        }
      }
      // Session expired — refresh failed or no refresh URL
      config.onSessionExpired?.();
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

  // Auto-restore session on creation
  if (config.autoRestore) {
    if (isCookieMode && config.userUrl) {
      fetchUser();
    } else if (!isCookieMode && token() && config.userUrl) {
      fetchUser();
    }
    if (config.configUrl) {
      fetchConfig();
    }
  }

  return {
    user: () => user(),
    token: () => token(),
    isLoggedIn,
    loading: () => loading(),
    config: () => authConfigSignal(),
    login,
    signup,
    forgotPassword,
    resetPassword,
    logout,
    setToken: setTokenFn,
    fetchUser,
    refreshToken: refreshTokenFn,
    fetchConfig,
    interceptor,
    guard,
  };
}
