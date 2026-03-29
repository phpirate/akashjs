/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from 'vitest';
import { renderHeadToString } from '../src/head.js';
import type { HeadConfig } from '../src/head.js';

describe('renderHeadToString', () => {
  it('renders title', () => {
    const configs: HeadConfig[] = [{ title: 'My Page' }];
    const html = renderHeadToString(configs);
    expect(html).toContain('<title>My Page</title>');
  });

  it('applies title template', () => {
    const configs: HeadConfig[] = [
      { titleTemplate: '%s | MySite', title: 'About' },
    ];
    const html = renderHeadToString(configs);
    expect(html).toContain('<title>About | MySite</title>');
  });

  it('last title wins', () => {
    const configs: HeadConfig[] = [
      { title: 'First' },
      { title: 'Second' },
    ];
    const html = renderHeadToString(configs);
    expect(html).toContain('<title>Second</title>');
    expect(html).not.toContain('First');
  });

  it('renders meta tags', () => {
    const configs: HeadConfig[] = [{
      meta: [
        { name: 'description', content: 'A description' },
        { property: 'og:title', content: 'OG Title' },
      ],
    }];
    const html = renderHeadToString(configs);
    expect(html).toContain('name="description"');
    expect(html).toContain('content="A description"');
    expect(html).toContain('property="og:title"');
  });

  it('renders link tags', () => {
    const configs: HeadConfig[] = [{
      link: [{ rel: 'canonical', href: 'https://example.com' }],
    }];
    const html = renderHeadToString(configs);
    expect(html).toContain('rel="canonical"');
    expect(html).toContain('href="https://example.com"');
  });

  it('handles empty config', () => {
    const html = renderHeadToString([]);
    expect(html).toBe('');
  });
});
