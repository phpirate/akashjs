import { describe, it, expect } from 'vitest';
import { generateSWScript } from '../src/pwa.js';

describe('pwa', () => {
  it('generateSWScript returns string containing addEventListener and fetch', () => {
    const script = generateSWScript([]);
    expect(script).toContain('addEventListener');
    expect(script).toContain('fetch');
  });

  it('generateSWScript with cache-first route contains caches.match', () => {
    const script = generateSWScript([
      { match: /\.js$/, strategy: 'cache-first', cacheName: 'assets' },
    ]);
    expect(script).toContain('caches.match');
  });

  it('generateSWScript with network-first route contains fetch', () => {
    const script = generateSWScript([
      { match: '/api/', strategy: 'network-first' },
    ]);
    expect(script).toContain('fetch');
  });
});
