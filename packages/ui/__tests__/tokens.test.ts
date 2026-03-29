import { describe, it, expect } from 'vitest';
import {
  colors,
  darkColors,
  typography,
  spacing,
  elevation,
  shape,
  generateTokenCSS,
} from '../src/tokens/index.js';

describe('Design Tokens', () => {
  describe('colors', () => {
    it('has primary, onPrimary, surface, error keys', () => {
      expect(colors).toHaveProperty('primary');
      expect(colors).toHaveProperty('onPrimary');
      expect(colors).toHaveProperty('surface');
      expect(colors).toHaveProperty('error');
    });
  });

  describe('darkColors', () => {
    it('has primary and surface keys', () => {
      expect(darkColors).toHaveProperty('primary');
      expect(darkColors).toHaveProperty('surface');
    });
  });

  describe('typography', () => {
    it('has displayLarge with fontSize and lineHeight', () => {
      expect(typography.displayLarge).toHaveProperty('fontSize');
      expect(typography.displayLarge).toHaveProperty('lineHeight');
    });

    it('has bodyMedium with fontSize and lineHeight', () => {
      expect(typography.bodyMedium).toHaveProperty('fontSize');
      expect(typography.bodyMedium).toHaveProperty('lineHeight');
    });

    it('has labelSmall with fontSize and lineHeight', () => {
      expect(typography.labelSmall).toHaveProperty('fontSize');
      expect(typography.labelSmall).toHaveProperty('lineHeight');
    });
  });

  describe('spacing', () => {
    it('has keys 0 through 16', () => {
      expect(spacing).toHaveProperty('0');
      expect(spacing).toHaveProperty('1');
      expect(spacing).toHaveProperty('2');
      expect(spacing).toHaveProperty('3');
      expect(spacing).toHaveProperty('4');
      expect(spacing).toHaveProperty('5');
      expect(spacing).toHaveProperty('6');
      expect(spacing).toHaveProperty('8');
      expect(spacing).toHaveProperty('10');
      expect(spacing).toHaveProperty('12');
      expect(spacing).toHaveProperty('16');
    });
  });

  describe('elevation', () => {
    it('has keys 0 through 5', () => {
      expect(elevation).toHaveProperty('0');
      expect(elevation).toHaveProperty('1');
      expect(elevation).toHaveProperty('2');
      expect(elevation).toHaveProperty('3');
      expect(elevation).toHaveProperty('4');
      expect(elevation).toHaveProperty('5');
    });
  });

  describe('shape', () => {
    it('has none through full', () => {
      expect(shape).toHaveProperty('none');
      expect(shape).toHaveProperty('extraSmall');
      expect(shape).toHaveProperty('small');
      expect(shape).toHaveProperty('medium');
      expect(shape).toHaveProperty('large');
      expect(shape).toHaveProperty('extraLarge');
      expect(shape).toHaveProperty('full');
    });
  });

  describe('generateTokenCSS', () => {
    it('returns a string containing :root and --md-sys-color-primary', () => {
      const css = generateTokenCSS();
      expect(typeof css).toBe('string');
      expect(css).toContain(':root');
      expect(css).toContain('--md-sys-color-primary');
    });

    it('uses dark colors when passed true', () => {
      const css = generateTokenCSS(true);
      expect(css).toContain(':root');
      expect(css).toContain(darkColors.primary);
    });
  });
});
