import { describe, it, expect } from 'vitest';
import {
  urlToFilePath,
  discoverStaticRoutes,
  generatePaths,
  prerender,
} from '../src/ssg.js';

describe('ssg', () => {
  describe('urlToFilePath', () => {
    it('/ maps to index.html', () => {
      expect(urlToFilePath('/')).toBe('index.html');
    });

    it('/about maps to about/index.html', () => {
      expect(urlToFilePath('/about')).toBe('about/index.html');
    });

    it('/blog/hello maps to blog/hello/index.html', () => {
      expect(urlToFilePath('/blog/hello')).toBe('blog/hello/index.html');
    });
  });

  it('discoverStaticRoutes filters out parameterized routes', () => {
    const manifest = [
      { path: '/' },
      { path: '/about' },
      { path: '/blog/:slug' },
      { path: '/users/*' },
    ];
    const routes = discoverStaticRoutes(manifest);
    expect(routes).toContain('/');
    expect(routes).toContain('/about');
    expect(routes).not.toContain('/blog/:slug');
    expect(routes).not.toContain('/users/*');
  });

  it('generatePaths fills in params', () => {
    const paths = generatePaths('/blog/:slug', [
      { slug: 'a' },
      { slug: 'b' },
    ]);
    expect(paths).toEqual(['/blog/a', '/blog/b']);
  });

  it('prerender renders routes and returns results with rendered array', async () => {
    const result = await prerender({
      routes: ['/', '/about'],
      render: (url) => `<h1>${url}</h1>`,
    });
    expect(result.rendered).toBeInstanceOf(Array);
    expect(result.rendered.length).toBe(2);
    expect(result.rendered[0].url).toBe('/');
    expect(result.rendered[1].url).toBe('/about');
  });
});
