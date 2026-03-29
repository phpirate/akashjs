import { describe, it, expect } from 'vitest';
import { cx, css, applyStyles } from '../src/css.js';

describe('cx', () => {
  it('joins strings', () => {
    expect(cx('a', 'b')).toBe('a b');
  });

  it('filters falsy values', () => {
    expect(cx('a', false, null, undefined, 'b')).toBe('a b');
  });

  it('handles objects', () => {
    expect(cx({ active: true, disabled: false })).toBe('active');
  });

  it('handles arrays', () => {
    expect(cx(['a', 'b'])).toBe('a b');
  });

  it('handles mixed inputs', () => {
    const isActive = true;
    expect(cx('btn', isActive && 'active', { large: true })).toBe('btn active large');
  });
});

describe('css', () => {
  it('converts object to style string', () => {
    expect(css({ color: 'red' })).toContain('color: red');
  });

  it('converts camelCase to kebab-case', () => {
    expect(css({ backgroundColor: 'blue' })).toContain('background-color: blue');
  });

  it('adds px to number values', () => {
    expect(css({ fontSize: 16 })).toContain('font-size: 16px');
  });

  it('skips px for unitless properties', () => {
    const result = css({ opacity: 0.5, zIndex: 10 });
    expect(result).toContain('opacity: 0.5');
    expect(result).toContain('z-index: 10');
    expect(result).not.toContain('0.5px');
    expect(result).not.toContain('10px');
  });

  it('filters null/undefined values', () => {
    const result = css({ color: 'red', display: null as any });
    expect(result).toContain('color: red');
    expect(result).not.toContain('display');
  });
});

describe('applyStyles', () => {
  /** @vitest-environment happy-dom */
  it('sets style on element', async () => {
    // Dynamically check for DOM availability
    if (typeof document === 'undefined') return;

    const el = document.createElement('div');
    applyStyles(el, { color: 'red', marginTop: 10 });

    expect(el.style.color).toBe('red');
    expect(el.style.marginTop).toBe('10px');
  });
});
