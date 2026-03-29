/** @vitest-environment happy-dom */

import { describe, it, expect } from 'vitest';
import {
  sanitize,
  escapeHtml,
  generateCSP,
  generateSecurityHeaders,
  safeMerge,
  deepFreeze,
  sanitizeURL,
  createRateLimiter,
  generateCSRFToken,
} from '../src/security.js';

describe('sanitize', () => {
  it('removes script tags from HTML', () => {
    const result = sanitize('<p>Hello</p><script>alert("xss")</script>');
    expect(result).not.toContain('<script');
    expect(result).toContain('<p>Hello</p>');
  });

  it('removes onclick attributes', () => {
    const result = sanitize('<button onclick="alert(1)">Click</button>');
    expect(result).not.toContain('onclick');
  });

  it('removes javascript: URLs from href', () => {
    const result = sanitize('<a href="javascript:alert(1)">Link</a>');
    expect(result).not.toContain('javascript:');
  });

  it('preserves safe HTML (p, b, a with https href)', () => {
    const html = '<p>Hello <b>world</b> <a href="https://example.com">link</a></p>';
    const result = sanitize(html);
    expect(result).toContain('<p>');
    expect(result).toContain('<b>world</b>');
    expect(result).toContain('href="https://example.com"');
  });

  it('respects allowTags option', () => {
    const html = '<iframe src="https://example.com"></iframe>';
    const without = sanitize(html);
    expect(without).not.toContain('<iframe');

    const withOption = sanitize(html, { allowTags: ['iframe'] });
    expect(withOption).toContain('<iframe');
  });
});

describe('escapeHtml', () => {
  it('escapes <, >, &, ", \'', () => {
    const result = escapeHtml('<div class="a" data-x=\'b\'>Tom & Jerry</div>');
    expect(result).toContain('&lt;');
    expect(result).toContain('&gt;');
    expect(result).toContain('&amp;');
    expect(result).toContain('&quot;');
    expect(result).toContain('&#39;');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });
});

describe('generateCSP', () => {
  it('returns string with default-src', () => {
    const csp = generateCSP();
    expect(csp).toContain('default-src');
    expect(typeof csp).toBe('string');
  });

  it('includes nonce when provided', () => {
    const csp = generateCSP({ nonce: 'abc123' });
    expect(csp).toContain("'nonce-abc123'");
  });
});

describe('generateSecurityHeaders', () => {
  it('returns all expected headers', () => {
    const headers = generateSecurityHeaders();
    expect(headers).toHaveProperty('X-Frame-Options');
    expect(headers).toHaveProperty('X-Content-Type-Options');
    expect(headers).toHaveProperty('Strict-Transport-Security');
    expect(headers).toHaveProperty('Referrer-Policy');
  });
});

describe('safeMerge', () => {
  it('merges objects', () => {
    const result = safeMerge({ a: 1 }, { b: 2 });
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('prevents __proto__ pollution', () => {
    const target = {};
    const malicious = JSON.parse('{"__proto__": {"polluted": true}}');
    safeMerge(target, malicious);
    expect(({} as any).polluted).toBeUndefined();
  });

  it('prevents constructor pollution', () => {
    const target = {};
    const malicious = { constructor: { polluted: true } };
    safeMerge(target, malicious as any);
    expect((target as any).constructor).not.toHaveProperty('polluted');
  });
});

describe('deepFreeze', () => {
  it('makes object immutable', () => {
    const obj = { a: 1, nested: { b: 2 } };
    const frozen = deepFreeze(obj);
    expect(() => {
      (frozen as any).a = 99;
    }).toThrow();
    expect(() => {
      (frozen as any).nested.b = 99;
    }).toThrow();
  });
});

describe('sanitizeURL', () => {
  it('allows https URLs', () => {
    const result = sanitizeURL('https://example.com/path');
    expect(result).toBe('https://example.com/path');
  });

  it('rejects javascript: URLs', () => {
    const result = sanitizeURL('javascript:alert(1)');
    expect(result).toBeNull();
  });

  it('allows relative URLs', () => {
    const result = sanitizeURL('/about');
    expect(result).toBe('/about');
  });

  it('rejects non-allowed hosts', () => {
    const result = sanitizeURL('https://evil.com', { allowedHosts: ['example.com'] });
    expect(result).toBeNull();
  });
});

describe('createRateLimiter', () => {
  it('allows attempts within limit', () => {
    const limiter = createRateLimiter({ maxAttempts: 3, windowMs: 60000 });
    expect(limiter.check()).toBe(true);
    expect(limiter.check()).toBe(true);
  });

  it('blocks after max attempts', () => {
    const limiter = createRateLimiter({ maxAttempts: 2, windowMs: 60000 });
    expect(limiter.check()).toBe(true);
    expect(limiter.check()).toBe(true);
    expect(limiter.check()).toBe(false);
  });

  it('reset clears attempts', () => {
    const limiter = createRateLimiter({ maxAttempts: 1, windowMs: 60000 });
    expect(limiter.check()).toBe(true);
    expect(limiter.check()).toBe(false);
    limiter.reset();
    expect(limiter.check()).toBe(true);
  });
});

describe('generateCSRFToken', () => {
  it('returns a string of 64 hex chars', () => {
    const token = generateCSRFToken();
    expect(typeof token).toBe('string');
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });
});
