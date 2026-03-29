/** @vitest-environment happy-dom */

import { describe, it, expect, beforeEach } from 'vitest';
import { injectRippleStyles, addRipple } from '../src/components/ripple.js';

describe('Ripple', () => {
  beforeEach(() => {
    // Clean up any injected styles between tests
    const existing = document.getElementById('akash-ripple-styles');
    if (existing) existing.remove();
  });

  describe('injectRippleStyles', () => {
    it('adds a style element to document.head', () => {
      injectRippleStyles();
      const style = document.getElementById('akash-ripple-styles');
      expect(style).not.toBeNull();
      expect(style!.tagName.toLowerCase()).toBe('style');
      expect(document.head.contains(style)).toBe(true);
    });

    it('is idempotent — calling twice does not add duplicate', () => {
      injectRippleStyles();
      injectRippleStyles();
      const styles = document.querySelectorAll('#akash-ripple-styles');
      expect(styles.length).toBe(1);
    });
  });

  describe('addRipple', () => {
    it('sets position relative and overflow hidden on element', () => {
      const el = document.createElement('div');
      addRipple(el);
      expect(el.style.position).toBe('relative');
      expect(el.style.overflow).toBe('hidden');
    });
  });
});
