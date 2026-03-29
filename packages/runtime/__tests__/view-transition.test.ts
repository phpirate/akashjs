/** @vitest-environment happy-dom */
import { describe, it, expect } from 'vitest';
import {
  supportsViewTransitions,
  startViewTransition,
  viewTransitionCSS,
  assignTransitionName,
} from '../src/view-transition.js';

describe('view-transition', () => {
  it('supportsViewTransitions returns boolean', () => {
    const result = supportsViewTransitions();
    expect(typeof result).toBe('boolean');
  });

  it('startViewTransition calls updateCallback', async () => {
    let called = false;
    const transition = startViewTransition(() => {
      called = true;
    });
    await transition.finished;
    expect(called).toBe(true);
  });

  it('startViewTransition returns object with finished/updateCallbackDone/ready/skipTransition', () => {
    const transition = startViewTransition(() => {});
    expect(transition.finished).toBeInstanceOf(Promise);
    expect(transition.updateCallbackDone).toBeInstanceOf(Promise);
    expect(transition.ready).toBeInstanceOf(Promise);
    expect(typeof transition.skipTransition).toBe('function');
  });

  it('viewTransitionCSS returns CSS string containing ::view-transition', () => {
    const css = viewTransitionCSS({ duration: '0.3s' });
    expect(typeof css).toBe('string');
    expect(css).toContain('::view-transition');
  });

  it('assignTransitionName sets style on element', () => {
    const el = document.createElement('div');
    assignTransitionName(el, 'hero-image');
    expect(el.style.viewTransitionName).toBe('hero-image');
  });
});
