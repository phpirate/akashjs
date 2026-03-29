import { describe, it, expect } from 'vitest';
import { compilePath, matchPath, resolvePath, resolveRoutes } from '../src/router.js';
import type { RouteConfig } from '../src/types.js';

describe('compilePath', () => {
  it('compiles a root path', () => {
    const { regex, paramNames } = compilePath('/');
    expect(regex.test('/')).toBe(true);
    expect(regex.test('/about')).toBe(false);
    expect(paramNames).toEqual([]);
  });

  it('compiles a static path', () => {
    const { regex } = compilePath('/about');
    expect(regex.test('/about')).toBe(true);
    expect(regex.test('/about/')).toBe(false);
    expect(regex.test('/')).toBe(false);
  });

  it('compiles nested static paths', () => {
    const { regex } = compilePath('/blog/archive');
    expect(regex.test('/blog/archive')).toBe(true);
    expect(regex.test('/blog')).toBe(false);
  });

  it('compiles :param dynamic segments', () => {
    const { regex, paramNames } = compilePath('/blog/:slug');
    expect(paramNames).toEqual(['slug']);
    expect(regex.test('/blog/hello-world')).toBe(true);
    expect(regex.test('/blog/')).toBe(false);
    expect(regex.test('/blog')).toBe(false);
  });

  it('compiles [param] bracket dynamic segments', () => {
    const { regex, paramNames } = compilePath('/blog/[slug]');
    expect(paramNames).toEqual(['slug']);
    expect(regex.test('/blog/hello-world')).toBe(true);
  });

  it('compiles multiple params', () => {
    const { regex, paramNames } = compilePath('/users/:id/posts/:postId');
    expect(paramNames).toEqual(['id', 'postId']);
    expect(regex.test('/users/42/posts/100')).toBe(true);
    expect(regex.test('/users/42/posts')).toBe(false);
  });

  it('compiles catch-all [...param]', () => {
    const { regex, paramNames } = compilePath('/[...rest]');
    expect(paramNames).toEqual(['rest']);
    expect(regex.test('/anything/here/works')).toBe(true);
    expect(regex.test('/a')).toBe(true);
  });
});

describe('matchPath', () => {
  it('matches root path', () => {
    const result = matchPath('/', '/');
    expect(result).toEqual({ params: {} });
  });

  it('matches static path', () => {
    expect(matchPath('/about', '/about')).toEqual({ params: {} });
    expect(matchPath('/other', '/about')).toBe(null);
  });

  it('extracts :param parameters', () => {
    const result = matchPath('/blog/hello-world', '/blog/:slug');
    expect(result).toEqual({ params: { slug: 'hello-world' } });
  });

  it('extracts [param] parameters', () => {
    const result = matchPath('/blog/my-post', '/blog/[slug]');
    expect(result).toEqual({ params: { slug: 'my-post' } });
  });

  it('extracts multiple parameters', () => {
    const result = matchPath('/users/42/posts/100', '/users/:id/posts/:postId');
    expect(result).toEqual({ params: { id: '42', postId: '100' } });
  });

  it('extracts catch-all parameter', () => {
    const result = matchPath('/docs/api/v2/users', '/docs/[...rest]');
    expect(result).toEqual({ params: { rest: 'api/v2/users' } });
  });

  it('decodes URI components', () => {
    const result = matchPath('/blog/hello%20world', '/blog/:slug');
    expect(result).toEqual({ params: { slug: 'hello world' } });
  });

  it('returns null for non-matching paths', () => {
    expect(matchPath('/about', '/contact')).toBe(null);
    expect(matchPath('/blog', '/blog/:slug')).toBe(null);
    expect(matchPath('/blog/a/b', '/blog/:slug')).toBe(null);
  });
});

describe('resolvePath', () => {
  it('fills in :param placeholders', () => {
    expect(resolvePath('/blog/:slug', { slug: 'hello' })).toBe('/blog/hello');
  });

  it('fills in [param] placeholders', () => {
    expect(resolvePath('/blog/[slug]', { slug: 'hello' })).toBe('/blog/hello');
  });

  it('fills in multiple params', () => {
    expect(resolvePath('/users/:id/posts/:postId', { id: '42', postId: '7' }))
      .toBe('/users/42/posts/7');
  });

  it('encodes special characters', () => {
    expect(resolvePath('/blog/:slug', { slug: 'hello world' }))
      .toBe('/blog/hello%20world');
  });

  it('fills in catch-all [...param]', () => {
    expect(resolvePath('/docs/[...rest]', { rest: 'api/users' }))
      .toBe('/docs/api/users');
  });
});

describe('resolveRoutes', () => {
  const routes: RouteConfig[] = [
    {
      path: '/',
      component: () => Promise.resolve({ default: {} as any }),
    },
    {
      path: '/about',
      component: () => Promise.resolve({ default: {} as any }),
    },
    {
      path: '/blog/:slug',
      component: () => Promise.resolve({ default: {} as any }),
    },
    {
      path: '/users/:id',
      component: () => Promise.resolve({ default: {} as any }),
      children: [
        {
          path: '/users/:id/posts/:postId',
          component: () => Promise.resolve({ default: {} as any }),
        },
      ],
    },
  ];

  it('resolves root path', () => {
    const matches = resolveRoutes(routes, '/');
    expect(matches).toHaveLength(1);
    expect(matches![0].path).toBe('/');
  });

  it('resolves static path', () => {
    const matches = resolveRoutes(routes, '/about');
    expect(matches).toHaveLength(1);
    expect(matches![0].path).toBe('/about');
  });

  it('resolves parameterized path', () => {
    const matches = resolveRoutes(routes, '/blog/hello');
    expect(matches).toHaveLength(1);
    expect(matches![0].params).toEqual({ slug: 'hello' });
  });

  it('resolves nested routes', () => {
    const matches = resolveRoutes(routes, '/users/42/posts/7');
    expect(matches).toHaveLength(2);
    expect(matches![0].path).toBe('/users/:id');
    expect(matches![1].path).toBe('/users/:id/posts/:postId');
    expect(matches![1].params).toEqual({ id: '42', postId: '7' });
  });

  it('returns null for unmatched paths', () => {
    expect(resolveRoutes(routes, '/nonexistent')).toBe(null);
  });
});
