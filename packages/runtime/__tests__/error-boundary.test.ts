/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from 'vitest';
import { ErrorBoundary } from '../src/error-boundary.js';
import { defineComponent } from '../src/component.js';

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    const node = ErrorBoundary({
      fallback: (err) => {
        const el = document.createElement('span');
        el.textContent = `Error: ${err.message}`;
        return el;
      },
      children: () => {
        const el = document.createElement('div');
        el.textContent = 'OK';
        return el;
      },
    });

    const container = document.createElement('div');
    container.appendChild(node);
    expect(container.textContent).toContain('OK');
  });

  it('is a valid component', () => {
    expect(ErrorBoundary._akash).toBe(true);
  });
});
