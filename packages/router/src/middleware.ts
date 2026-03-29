/**
 * Router middleware.
 *
 * App-level hooks that run on every navigation. Useful for auth,
 * analytics, logging, and other cross-cutting concerns.
 *
 * ```ts
 * const authMiddleware = defineMiddleware(async ({ to, from, redirect }) => {
 *   if (to.startsWith('/dashboard') && !isLoggedIn()) {
 *     return redirect('/login');
 *   }
 * });
 *
 * const analyticsMiddleware = defineMiddleware(({ to, from }) => {
 *   analytics.track('page_view', { path: to });
 * });
 * ```
 */

import type { NavigationResult } from './types.js';

// --- Types ---

export interface MiddlewareContext {
  /** The path being navigated to */
  to: string;
  /** The path being navigated from */
  from: string;
  /** Route params for the target route */
  params: Record<string, string>;
  /** Redirect to a different path (aborts navigation) */
  redirect: (path: string) => NavigationResult;
}

export type Middleware = (
  ctx: MiddlewareContext,
) => Promise<NavigationResult | void> | NavigationResult | void;

// --- defineMiddleware ---

/**
 * Define a navigation middleware. Just a passthrough for typing.
 */
export function defineMiddleware(fn: Middleware): Middleware {
  return fn;
}

// --- Middleware runner ---

/**
 * Run a chain of middleware for a navigation.
 * Returns a redirect result if any middleware redirects, or null to proceed.
 */
export async function runMiddleware(
  middlewares: Middleware[],
  ctx: MiddlewareContext,
): Promise<NavigationResult | null> {
  for (const mw of middlewares) {
    const result = await mw(ctx);
    if (result && result._type === 'redirect') {
      return result;
    }
  }
  return null;
}

/**
 * Compose multiple middleware into one.
 */
export function composeMiddleware(...middlewares: Middleware[]): Middleware {
  return async (ctx) => {
    return runMiddleware(middlewares, ctx);
  };
}
