/**
 * <NavigationProgress /> — Drop-in loading indicator for route transitions.
 *
 * Shows a thin progress bar at the top of the viewport during async navigation
 * (lazy component loads, guards, loaders). Automatically hides when idle.
 */

import { defineComponent, effect } from '@akashjs/runtime';
import { useNavigationState } from './router.js';

export interface NavigationProgressProps {
  /** Bar color. Default: 'var(--md-sys-color-primary, #6750a4)' */
  color?: string;
  /** Bar height. Default: '3px' */
  height?: string;
  /** Delay in ms before showing the bar. Prevents flash on fast navigations. Default: 150 */
  delay?: number;
}

export const NavigationProgress = defineComponent<NavigationProgressProps>((ctx) => {
  const props = ctx.props;
  const color = props.color ?? 'var(--md-sys-color-primary, #6750a4)';
  const height = props.height ?? '3px';
  const delay = props.delay ?? 150;

  const nav = useNavigationState();

  // Create the bar element
  const bar = document.createElement('div');
  bar.setAttribute('data-akash-nav-progress', '');
  Object.assign(bar.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    height,
    zIndex: '9999',
    background: color,
    width: '0%',
    opacity: '0',
    pointerEvents: 'none',
    transition: 'none',
  } satisfies Partial<CSSStyleDeclaration>);

  let delayTimer: ReturnType<typeof setTimeout> | null = null;
  let completeTimer: ReturnType<typeof setTimeout> | null = null;
  let fadeTimer: ReturnType<typeof setTimeout> | null = null;

  function clearTimers(): void {
    if (delayTimer) { clearTimeout(delayTimer); delayTimer = null; }
    if (completeTimer) { clearTimeout(completeTimer); completeTimer = null; }
    if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = null; }
  }

  effect(() => {
    const state = nav.state();

    if (state === 'loading') {
      clearTimers();

      // Wait for delay before showing — prevents flash on fast navigations
      delayTimer = setTimeout(() => {
        delayTimer = null;
        // Start the slow progress animation (0% → 80% over 8s)
        bar.style.transition = 'width 8s cubic-bezier(0.1, 0.5, 0.3, 1)';
        bar.style.width = '80%';
        bar.style.opacity = '1';
      }, delay);
    } else {
      // idle — complete and fade out
      clearTimers();

      if (bar.style.opacity === '1') {
        // Bar is visible — snap to 100% then fade out
        bar.style.transition = 'width 200ms ease';
        bar.style.width = '100%';

        completeTimer = setTimeout(() => {
          completeTimer = null;
          bar.style.transition = 'opacity 150ms ease';
          bar.style.opacity = '0';

          fadeTimer = setTimeout(() => {
            fadeTimer = null;
            // Reset for next navigation
            bar.style.transition = 'none';
            bar.style.width = '0%';
          }, 150);
        }, 200);
      } else {
        // Bar never became visible (fast navigation within delay) — just reset
        bar.style.transition = 'none';
        bar.style.width = '0%';
        bar.style.opacity = '0';
      }
    }
  });

  return () => bar;
});
