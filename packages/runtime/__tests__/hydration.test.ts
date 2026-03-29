/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from 'vitest';
import {
  isHydrationActive,
  findHydrationBoundaries,
  HYDRATE_ATTR,
} from '../src/hydration.js';

describe('isHydrationActive', () => {
  it('returns false when not hydrating', () => {
    expect(isHydrationActive()).toBe(false);
  });
});

describe('HYDRATE_ATTR', () => {
  it('is a valid data attribute name', () => {
    expect(HYDRATE_ATTR).toBe('data-akash-hydrate');
  });
});

describe('findHydrationBoundaries', () => {
  it('finds elements with the hydration attribute', () => {
    const root = document.createElement('div');
    const boundary1 = document.createElement('div');
    boundary1.setAttribute(HYDRATE_ATTR, 'comments');
    const boundary2 = document.createElement('div');
    boundary2.setAttribute(HYDRATE_ATTR, 'sidebar');
    const plain = document.createElement('div');

    root.appendChild(boundary1);
    root.appendChild(plain);
    root.appendChild(boundary2);

    const boundaries = findHydrationBoundaries(root);
    expect(boundaries).toHaveLength(2);
    expect(boundaries[0]).toBe(boundary1);
    expect(boundaries[1]).toBe(boundary2);
  });

  it('returns empty array when no boundaries', () => {
    const root = document.createElement('div');
    root.innerHTML = '<p>Hello</p>';
    expect(findHydrationBoundaries(root)).toEqual([]);
  });

  it('finds nested boundaries', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <div>
        <div ${HYDRATE_ATTR}="nested">content</div>
      </div>
    `;
    expect(findHydrationBoundaries(root)).toHaveLength(1);
  });
});
