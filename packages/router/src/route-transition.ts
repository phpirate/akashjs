/**
 * Route animations and canDeactivate guard.
 *
 * Animated page transitions on navigation + "unsaved changes" guard.
 */

import type { NavigationResult, GuardContext } from './types.js';

// =========================================================================
// Route transition config
// =========================================================================

export interface RouteTransitionConfig {
  /** CSS class prefix for route transitions (default: 'route') */
  name?: string;
  /** Transition mode */
  mode?: 'in-out' | 'out-in' | 'simultaneous';
  /** Duration override in ms */
  duration?: number;
  /** Custom enter class */
  enterClass?: string;
  /** Custom exit class */
  exitClass?: string;
}

/**
 * Get route transition CSS classes.
 */
export function getRouteTransitionClasses(name = 'route'): {
  enterFrom: string; enterActive: string; enterTo: string;
  exitFrom: string; exitActive: string; exitTo: string;
} {
  return {
    enterFrom: `${name}-enter-from`,
    enterActive: `${name}-enter-active`,
    enterTo: `${name}-enter-to`,
    exitFrom: `${name}-exit-from`,
    exitActive: `${name}-exit-active`,
    exitTo: `${name}-exit-to`,
  };
}

/**
 * Generate CSS for common route transitions.
 */
export function generateRouteTransitionCSS(
  name = 'route',
  type: 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'scale' = 'fade',
): string {
  const base = `
.${name}-enter-active,
.${name}-exit-active {
  transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
}`;

  switch (type) {
    case 'fade':
      return `${base}
.${name}-enter-from, .${name}-exit-to { opacity: 0; }
.${name}-enter-to, .${name}-exit-from { opacity: 1; }`;

    case 'slide-left':
      return `${base}
.${name}-enter-from { transform: translateX(100%); opacity: 0; }
.${name}-exit-to { transform: translateX(-100%); opacity: 0; }`;

    case 'slide-right':
      return `${base}
.${name}-enter-from { transform: translateX(-100%); opacity: 0; }
.${name}-exit-to { transform: translateX(100%); opacity: 0; }`;

    case 'slide-up':
      return `${base}
.${name}-enter-from { transform: translateY(20px); opacity: 0; }
.${name}-exit-to { transform: translateY(-20px); opacity: 0; }`;

    case 'scale':
      return `${base}
.${name}-enter-from { transform: scale(0.95); opacity: 0; }
.${name}-exit-to { transform: scale(1.05); opacity: 0; }`;
  }
}

// =========================================================================
// canDeactivate guard
// =========================================================================

export type CanDeactivateFn = () => boolean | Promise<boolean>;

export interface CanDeactivateOptions {
  /** Function that returns true if navigation should be allowed */
  canLeave: CanDeactivateFn;
  /** Message shown in confirmation dialog (if using browser confirm) */
  message?: string;
  /** Use browser's native confirm dialog (default: true) */
  useNativeConfirm?: boolean;
}

/**
 * Create a canDeactivate guard that prevents navigation when
 * there are unsaved changes.
 *
 * ```ts
 * const guard = canDeactivate({
 *   canLeave: () => !form.dirty(),
 *   message: 'You have unsaved changes. Leave anyway?',
 * });
 * ```
 */
export function canDeactivate(options: CanDeactivateOptions) {
  const {
    canLeave,
    message = 'You have unsaved changes. Are you sure you want to leave?',
    useNativeConfirm = true,
  } = options;

  // Route guard
  const guard = async (ctx: GuardContext): Promise<NavigationResult | void> => {
    const allowed = await canLeave();
    if (allowed) return; // allow navigation

    if (useNativeConfirm && typeof window !== 'undefined') {
      const confirmed = window.confirm(message);
      if (confirmed) return; // user confirmed, allow
    }

    // Block navigation by redirecting to current path
    return ctx.redirect(window?.location?.pathname ?? '/');
  };

  // Also handle browser beforeunload (tab close, external navigation)
  if (typeof window !== 'undefined') {
    const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
      const result = canLeave();
      // Only sync check for beforeunload
      if (result === false || (result instanceof Promise)) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', beforeUnloadHandler);

    // Return cleanup
    (guard as any).dispose = () => {
      window.removeEventListener('beforeunload', beforeUnloadHandler);
    };
  }

  return guard;
}
