/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from 'vitest';
import { Suspense, getSuspenseContext } from '../src/suspense.js';

describe('Suspense', () => {
  it('is a valid component', () => {
    expect(Suspense._akash).toBe(true);
  });

  it('renders children when no async work', () => {
    const node = Suspense({
      fallback: () => {
        const el = document.createElement('div');
        el.textContent = 'Loading...';
        return el;
      },
      children: () => {
        const el = document.createElement('div');
        el.textContent = 'Content';
        return el;
      },
    });

    const container = document.createElement('div');
    container.appendChild(node);

    // Should render content (no pending promises)
    expect(container.textContent).toContain('Content');
  });
});

describe('getSuspenseContext', () => {
  it('returns null when not inside Suspense', () => {
    expect(getSuspenseContext()).toBeNull();
  });
});
