/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from 'vitest';
import {
  getTransitionClasses,
  generateTransitionCSS,
  Transition,
} from '../src/transition.js';

describe('getTransitionClasses', () => {
  it('generates correct class names', () => {
    const classes = getTransitionClasses('fade');
    expect(classes.enterFrom).toBe('fade-enter-from');
    expect(classes.enterActive).toBe('fade-enter-active');
    expect(classes.enterTo).toBe('fade-enter-to');
    expect(classes.exitFrom).toBe('fade-exit-from');
    expect(classes.exitActive).toBe('fade-exit-active');
    expect(classes.exitTo).toBe('fade-exit-to');
  });

  it('works with custom names', () => {
    const classes = getTransitionClasses('slide-up');
    expect(classes.enterFrom).toBe('slide-up-enter-from');
  });
});

describe('generateTransitionCSS', () => {
  it('generates CSS for a transition', () => {
    const css = generateTransitionCSS('fade');
    expect(css).toContain('.fade-enter-active');
    expect(css).toContain('.fade-exit-active');
    expect(css).toContain('transition:');
    expect(css).toContain('opacity: 0');
    expect(css).toContain('opacity: 1');
  });

  it('accepts custom options', () => {
    const css = generateTransitionCSS('custom', {
      property: 'transform',
      duration: '0.5s',
      easing: 'ease-in-out',
    });
    expect(css).toContain('transform');
    expect(css).toContain('0.5s');
    expect(css).toContain('ease-in-out');
  });
});

describe('Transition component', () => {
  it('is a valid component', () => {
    expect(Transition._akash).toBe(true);
  });

  it('renders children when when=true', () => {
    const node = Transition({
      when: true,
      children: () => {
        const el = document.createElement('div');
        el.textContent = 'visible';
        return el;
      },
    });
    const container = document.createElement('div');
    container.appendChild(node);
    expect(container.textContent).toContain('visible');
  });

  it('renders nothing when when=false', () => {
    const node = Transition({
      when: false,
      children: () => {
        const el = document.createElement('div');
        el.textContent = 'hidden';
        return el;
      },
    });
    const container = document.createElement('div');
    container.appendChild(node);
    expect(container.textContent).not.toContain('hidden');
  });
});
