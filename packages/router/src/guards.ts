/**
 * Route guard utilities.
 *
 * Guards are async functions that run before a route renders.
 * They can allow navigation (return void) or redirect.
 */

import type { RouteGuard, GuardContext, NavigationResult } from './types.js';

/**
 * Compose multiple guards into a single guard.
 * Guards run in order; the first redirect wins.
 */
export function composeGuards(...guards: RouteGuard[]): RouteGuard {
  return async (ctx: GuardContext): Promise<NavigationResult | void> => {
    for (const guard of guards) {
      const result = await guard(ctx);
      if (result && result._type === 'redirect') {
        return result;
      }
    }
  };
}

/**
 * Create a guard that checks a condition and redirects if it fails.
 */
export function guardWith(
  check: (ctx: GuardContext) => Promise<boolean> | boolean,
  redirectTo: string,
): RouteGuard {
  return async (ctx) => {
    const allowed = await check(ctx);
    if (!allowed) {
      return ctx.redirect(redirectTo);
    }
  };
}
