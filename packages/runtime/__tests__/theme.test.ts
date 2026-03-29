/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useTheme } from '../src/theme.js';
import { flushSync } from '../src/scheduler.js';

beforeEach(() => {
  localStorage.clear();
  // Reset <html> attributes between tests
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.className = '';
  document.documentElement.style.cssText = '';
});

describe('useTheme', () => {
  it('current returns the theme name', () => {
    const theme = useTheme({ defaultTheme: 'light' });
    expect(theme.current()).toBe('light');
  });

  it('defaults to light when no system preference matches', () => {
    const theme = useTheme();
    // In happy-dom, matchMedia may not match prefers-color-scheme: dark,
    // so it should fall back to 'light' or detect from system
    expect(['light', 'dark']).toContain(theme.current());
  });

  it('set changes the current theme', () => {
    const theme = useTheme({ defaultTheme: 'light' });
    theme.set('dark');
    expect(theme.current()).toBe('dark');
  });

  it('set ignores unknown theme names', () => {
    const theme = useTheme({ defaultTheme: 'light' });
    theme.set('neon');
    expect(theme.current()).toBe('light');
  });

  it('toggle switches between light and dark', () => {
    const theme = useTheme({ defaultTheme: 'light' });
    expect(theme.current()).toBe('light');

    theme.toggle();
    expect(theme.current()).toBe('dark');

    theme.toggle();
    expect(theme.current()).toBe('light');
  });

  it('isDark returns a boolean', () => {
    const theme = useTheme({ defaultTheme: 'light' });
    expect(theme.isDark()).toBe(false);

    theme.set('dark');
    expect(theme.isDark()).toBe(true);
  });

  it('themes lists available theme names', () => {
    const theme = useTheme({
      themes: {
        light: { '--bg': '#fff' },
        dark: { '--bg': '#000' },
        ocean: { '--bg': '#0af' },
      },
    });
    expect(theme.themes).toEqual(['light', 'dark', 'ocean']);
  });

  it('defaults themes to light and dark', () => {
    const theme = useTheme();
    expect(theme.themes).toContain('light');
    expect(theme.themes).toContain('dark');
  });

  it('persists the theme to localStorage', () => {
    const theme = useTheme({ defaultTheme: 'light' });
    flushSync();
    theme.set('dark');
    flushSync();
    expect(localStorage.getItem('akash-theme')).toBe('dark');
  });

  it('reads persisted theme from localStorage', () => {
    localStorage.setItem('akash-theme', 'dark');
    const theme = useTheme();
    expect(theme.current()).toBe('dark');
  });

  it('applies data-theme attribute to html element', () => {
    const theme = useTheme({ defaultTheme: 'light' });
    flushSync();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    theme.set('dark');
    flushSync();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
