/** @vitest-environment happy-dom */
import { describe, it, expect, vi } from 'vitest';
import {
  getRouteTransitionClasses,
  generateRouteTransitionCSS,
  canDeactivate,
} from '../src/route-transition.js';

describe('route-transition', () => {
  it('getRouteTransitionClasses returns correct class names with prefix', () => {
    const classes = getRouteTransitionClasses('page');
    expect(classes.enterFrom).toBe('page-enter-from');
    expect(classes.enterActive).toBe('page-enter-active');
    expect(classes.enterTo).toBe('page-enter-to');
    expect(classes.exitFrom).toBe('page-exit-from');
    expect(classes.exitActive).toBe('page-exit-active');
    expect(classes.exitTo).toBe('page-exit-to');
  });

  it('generateRouteTransitionCSS fade contains enter/exit classes', () => {
    const css = generateRouteTransitionCSS('route', 'fade');
    expect(css).toContain('route-enter-from');
    expect(css).toContain('route-exit-to');
    expect(css).toContain('route-enter-active');
    expect(css).toContain('route-exit-active');
  });

  it('generateRouteTransitionCSS slide-left contains translateX', () => {
    const css = generateRouteTransitionCSS('route', 'slide-left');
    expect(css).toContain('translateX');
  });

  describe('canDeactivate', () => {
    it('returns void when canLeave returns true', async () => {
      const guard = canDeactivate({
        canLeave: () => true,
        useNativeConfirm: false,
      });
      const ctx = {
        params: {},
        redirect: (path: string) => ({ _type: 'redirect' as const, path }),
      };
      const result = await guard(ctx);
      expect(result).toBeUndefined();
    });

    it('returns redirect when canLeave returns false', async () => {
      // Mock window.confirm to return false
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      const guard = canDeactivate({
        canLeave: () => false,
        useNativeConfirm: true,
      });
      const ctx = {
        params: {},
        redirect: (path: string) => ({ _type: 'redirect' as const, path }),
      };
      const result = await guard(ctx);
      expect(result).toBeDefined();
      expect(result!._type).toBe('redirect');

      vi.restoreAllMocks();
    });
  });
});
