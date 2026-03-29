import { describe, it, expect } from 'vitest';
import { scopeStyles, generateScopeId } from '../src/style.js';

describe('generateScopeId', () => {
  it('generates a deterministic scope ID from filename', () => {
    const id1 = generateScopeId('Counter.akash');
    const id2 = generateScopeId('Counter.akash');
    expect(id1).toBe(id2);
    expect(id1).toMatch(/^data-a-[a-f0-9]{6}$/);
  });

  it('generates different IDs for different files', () => {
    const id1 = generateScopeId('Counter.akash');
    const id2 = generateScopeId('Header.akash');
    expect(id1).not.toBe(id2);
  });
});

describe('scopeStyles', () => {
  it('scopes simple class selectors', () => {
    const css = '.counter { color: red; }';
    const result = scopeStyles(css, 'data-a-abc123');
    expect(result).toContain('.counter[data-a-abc123]');
  });

  it('scopes element selectors', () => {
    const css = 'div { color: blue; }';
    const result = scopeStyles(css, 'data-a-abc123');
    expect(result).toContain('div[data-a-abc123]');
  });

  it('scopes combined selectors', () => {
    const css = 'div.active { color: green; }';
    const result = scopeStyles(css, 'data-a-abc123');
    expect(result).toContain('[data-a-abc123]');
  });

  it('scopes descendant selectors on the last part', () => {
    const css = '.parent .child { color: red; }';
    const result = scopeStyles(css, 'data-a-abc123');
    expect(result).toContain('.child[data-a-abc123]');
  });

  it('does not scope @keyframes rules', () => {
    const css = '@keyframes spin { from { } to { } }';
    const result = scopeStyles(css, 'data-a-abc123');
    expect(result).toContain('@keyframes spin');
  });

  it('does not scope :root', () => {
    const css = ':root { --color: red; }';
    const result = scopeStyles(css, 'data-a-abc123');
    expect(result).toContain(':root');
    expect(result).not.toContain(':root[data-a-abc123]');
  });

  it('handles multiple selectors separated by commas', () => {
    const css = '.a, .b { color: red; }';
    const result = scopeStyles(css, 'data-a-abc123');
    expect(result).toContain('.a[data-a-abc123]');
    expect(result).toContain('.b[data-a-abc123]');
  });
});
