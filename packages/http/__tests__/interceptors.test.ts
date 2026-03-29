import { describe, it, expect, vi } from 'vitest';
import { createHttpClient } from '../src/client.js';
import { buildInterceptorChain } from '../src/interceptors.js';
import type { HttpInterceptor } from '../src/types.js';

function mockFetch(body: unknown = {}) {
  return vi.fn(async () => new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  }));
}

describe('buildInterceptorChain', () => {
  it('calls fetch when no interceptors', async () => {
    const fetch = mockFetch({ ok: true });
    const chain = buildInterceptorChain([], fetch);

    const request = new Request('http://localhost/test');
    const response = await chain(request);
    expect(response.ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('passes request through a single interceptor', async () => {
    const fetch = mockFetch();
    const interceptor: HttpInterceptor = async (req, next) => {
      const modified = new Request(req, {
        headers: { ...Object.fromEntries(req.headers), 'X-Token': 'abc' },
      });
      return next(modified);
    };

    const chain = buildInterceptorChain([interceptor], fetch);
    await chain(new Request('http://localhost/test'));

    const passedReq = fetch.mock.calls[0][0] as Request;
    expect(passedReq.headers.get('x-token')).toBe('abc');
  });

  it('executes interceptors in order', async () => {
    const order: number[] = [];
    const fetch = mockFetch();

    const first: HttpInterceptor = async (req, next) => {
      order.push(1);
      const resp = await next(req);
      order.push(4);
      return resp;
    };

    const second: HttpInterceptor = async (req, next) => {
      order.push(2);
      const resp = await next(req);
      order.push(3);
      return resp;
    };

    const chain = buildInterceptorChain([first, second], fetch);
    await chain(new Request('http://localhost/test'));

    expect(order).toEqual([1, 2, 3, 4]);
  });

  it('interceptor can short-circuit without calling next', async () => {
    const fetch = mockFetch();

    const cacheInterceptor: HttpInterceptor = async () => {
      return new Response(JSON.stringify({ cached: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };

    const chain = buildInterceptorChain([cacheInterceptor], fetch);
    const response = await chain(new Request('http://localhost/test'));
    const body = await response.json();

    expect(body).toEqual({ cached: true });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('interceptor can retry on failure', async () => {
    let callCount = 0;
    const fetch = vi.fn(async () => {
      callCount++;
      if (callCount === 1) {
        return new Response('', { status: 401, headers: { 'content-type': 'application/json' } });
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    const retryInterceptor: HttpInterceptor = async (req, next) => {
      const response = await next(req);
      if (response.status === 401) {
        // "refresh token" and retry
        return next(req);
      }
      return response;
    };

    const chain = buildInterceptorChain([retryInterceptor], fetch);
    const response = await chain(new Request('http://localhost/test'));

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe('interceptors with createHttpClient', () => {
  const BASE = 'http://localhost';

  it('applies interceptors to client requests', async () => {
    const fetch = mockFetch({ data: 'secret' });
    const authInterceptor: HttpInterceptor = async (req, next) => {
      req.headers.set('Authorization', 'Bearer token123');
      return next(req);
    };

    const http = createHttpClient({
      baseUrl: BASE,
      fetch,
      interceptors: [authInterceptor],
    });

    await http.get('/secret');
    const request = fetch.mock.calls[0][0] as Request;
    expect(request.headers.get('authorization')).toBe('Bearer token123');
  });

  it('logging interceptor sees method and status', async () => {
    const fetch = mockFetch({ ok: true });
    const logs: string[] = [];

    const loggingInterceptor: HttpInterceptor = async (req, next) => {
      logs.push(`${req.method} ${new URL(req.url).pathname}`);
      const response = await next(req);
      logs.push(`${response.status}`);
      return response;
    };

    const http = createHttpClient({
      baseUrl: BASE,
      fetch,
      interceptors: [loggingInterceptor],
    });

    await http.get('/users');
    expect(logs).toEqual(['GET /users', '200']);
  });
});
