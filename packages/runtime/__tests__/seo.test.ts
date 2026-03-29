import { describe, it, expect } from 'vitest';
import { generateSitemap } from '../src/seo.js';

describe('generateSitemap', () => {
  it('produces valid XML with urlset and url entries', () => {
    const xml = generateSitemap('https://example.com', [
      { url: '/' },
      { url: '/about' },
    ]);

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain('<url>');
    expect(xml).toContain('</url>');
    expect(xml).toContain('</urlset>');
  });

  it('includes loc, lastmod, changefreq, and priority', () => {
    const xml = generateSitemap('https://example.com', [
      { url: '/blog', lastmod: '2026-03-29', changefreq: 'weekly', priority: 0.8 },
    ]);

    expect(xml).toContain('<loc>https://example.com/blog</loc>');
    expect(xml).toContain('<lastmod>2026-03-29</lastmod>');
    expect(xml).toContain('<changefreq>weekly</changefreq>');
    expect(xml).toContain('<priority>0.8</priority>');
  });

  it('prepends baseUrl to paths', () => {
    const xml = generateSitemap('https://mysite.dev', [
      { url: '/docs' },
      { url: '/api' },
    ]);

    expect(xml).toContain('<loc>https://mysite.dev/docs</loc>');
    expect(xml).toContain('<loc>https://mysite.dev/api</loc>');
  });
});
