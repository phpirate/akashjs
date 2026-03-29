/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildUrl, parseQuery, parseHash } from '../src/history.js';

describe('buildUrl', () => {
  it('returns pathname alone', () => {
    expect(buildUrl('/about')).toBe('/about');
  });

  it('appends query string', () => {
    expect(buildUrl('/search', { q: 'hello', page: '1' })).toContain('?');
    const url = buildUrl('/search', { q: 'hello' });
    expect(url).toBe('/search?q=hello');
  });

  it('appends hash', () => {
    expect(buildUrl('/docs', undefined, 'section')).toBe('/docs#section');
  });

  it('appends both query and hash', () => {
    expect(buildUrl('/search', { q: 'hello' }, 'top')).toBe('/search?q=hello#top');
  });

  it('skips empty query object', () => {
    expect(buildUrl('/about', {})).toBe('/about');
  });
});

describe('parseQuery', () => {
  it('parses a query string', () => {
    expect(parseQuery('?q=hello&page=1')).toEqual({ q: 'hello', page: '1' });
  });

  it('returns empty object for empty string', () => {
    expect(parseQuery('')).toEqual({});
  });

  it('returns empty object for just ?', () => {
    expect(parseQuery('?')).toEqual({});
  });
});

describe('parseHash', () => {
  it('strips the # prefix', () => {
    expect(parseHash('#section')).toBe('section');
  });

  it('returns as-is if no # prefix', () => {
    expect(parseHash('section')).toBe('section');
  });

  it('returns empty for empty string', () => {
    expect(parseHash('')).toBe('');
  });
});
