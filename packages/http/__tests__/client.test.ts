import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHttpClient, HttpError } from '../src/client.js';

// Mock fetch helper
function mockFetch(response: {
  status?: number;
  statusText?: string;
  body?: unknown;
  headers?: Record<string, string>;
}) {
  const status = response.status ?? 200;
  const statusText = response.statusText ?? 'OK';
  const headers = new Headers({
    'content-type': 'application/json',
    ...response.headers,
  });

  return vi.fn(async () => new Response(
    response.body !== undefined ? JSON.stringify(response.body) : null,
    { status, statusText, headers },
  ));
}

describe('createHttpClient', () => {
  const BASE = 'http://localhost';

  it('makes a GET request', async () => {
    const fetch = mockFetch({ body: [{ id: 1, name: 'Alice' }] });
    const http = createHttpClient({ baseUrl: BASE, fetch });

    const result = await http.get<{ id: number; name: string }[]>('/users');
    expect(result).toEqual([{ id: 1, name: 'Alice' }]);
    expect(fetch).toHaveBeenCalledTimes(1);

    const request = fetch.mock.calls[0][0] as Request;
    expect(request.method).toBe('GET');
    expect(request.url).toContain('/users');
  });

  it('makes a POST request with JSON body', async () => {
    const fetch = mockFetch({ body: { id: 2, name: 'Bob' } });
    const http = createHttpClient({ baseUrl: BASE, fetch });

    const result = await http.post('/users', { name: 'Bob' });
    expect(result).toEqual({ id: 2, name: 'Bob' });

    const request = fetch.mock.calls[0][0] as Request;
    expect(request.method).toBe('POST');
    expect(request.headers.get('content-type')).toBe('application/json');

    const body = await request.text();
    expect(JSON.parse(body)).toEqual({ name: 'Bob' });
  });

  it('makes a PUT request', async () => {
    const fetch = mockFetch({ body: { id: 1, name: 'Updated' } });
    const http = createHttpClient({ baseUrl: BASE, fetch });

    await http.put('/users/1', { name: 'Updated' });
    const request = fetch.mock.calls[0][0] as Request;
    expect(request.method).toBe('PUT');
  });

  it('makes a PATCH request', async () => {
    const fetch = mockFetch({ body: { id: 1, name: 'Patched' } });
    const http = createHttpClient({ baseUrl: BASE, fetch });

    await http.patch('/users/1', { name: 'Patched' });
    const request = fetch.mock.calls[0][0] as Request;
    expect(request.method).toBe('PATCH');
  });

  it('makes a DELETE request', async () => {
    const fetch = mockFetch({ status: 204, body: undefined, headers: { 'content-length': '0' } });
    const http = createHttpClient({ baseUrl: BASE, fetch });

    const result = await http.delete('/users/1');
    expect(result).toBeUndefined();
    const request = fetch.mock.calls[0][0] as Request;
    expect(request.method).toBe('DELETE');
  });

  it('prepends baseUrl', async () => {
    const fetch = mockFetch({ body: [] });
    const http = createHttpClient({ baseUrl: 'http://localhost/api/v2', fetch });

    await http.get('/users');
    const request = fetch.mock.calls[0][0] as Request;
    expect(request.url).toContain('/api/v2/users');
  });

  it('applies default headers', async () => {
    const fetch = mockFetch({ body: {} });
    const http = createHttpClient({
      baseUrl: BASE,
      headers: { 'X-Custom': 'test' },
      fetch,
    });

    await http.get('/data');
    const request = fetch.mock.calls[0][0] as Request;
    expect(request.headers.get('x-custom')).toBe('test');
  });

  it('merges per-request headers over defaults', async () => {
    const fetch = mockFetch({ body: {} });
    const http = createHttpClient({
      baseUrl: BASE,
      headers: { 'X-Default': 'a', 'X-Override': 'default' },
      fetch,
    });

    await http.get('/data', { headers: { 'X-Override': 'custom' } });
    const request = fetch.mock.calls[0][0] as Request;
    expect(request.headers.get('x-default')).toBe('a');
    expect(request.headers.get('x-override')).toBe('custom');
  });

  it('appends query params', async () => {
    const fetch = mockFetch({ body: [] });
    const http = createHttpClient({ baseUrl: BASE, fetch });

    await http.get('/search', { params: { q: 'hello', page: '1' } });
    const request = fetch.mock.calls[0][0] as Request;
    expect(request.url).toContain('q=hello');
    expect(request.url).toContain('page=1');
  });

  it('throws HttpError for non-ok responses', async () => {
    const fetch = mockFetch({ status: 404, statusText: 'Not Found', body: 'not found' });
    const http = createHttpClient({ baseUrl: BASE, fetch });

    try {
      await http.get('/missing');
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError);
      const httpErr = err as HttpError;
      expect(httpErr.status).toBe(404);
      expect(httpErr.statusText).toBe('Not Found');
      expect(httpErr.message).toBe('HTTP 404: Not Found');
    }
  });

  it('throws HttpError for 500 responses', async () => {
    const fetch = mockFetch({ status: 500, statusText: 'Internal Server Error', body: 'oops' });
    const http = createHttpClient({ baseUrl: BASE, fetch });

    await expect(http.get('/broken')).rejects.toThrow('HTTP 500');
  });

  it('returns raw Response with raw()', async () => {
    const fetch = mockFetch({ body: { ok: true } });
    const http = createHttpClient({ baseUrl: BASE, fetch });

    const response = await http.raw('GET', '/health');
    expect(response).toBeInstanceOf(Response);
    expect(response.ok).toBe(true);
  });

  it('handles text responses', async () => {
    const fetch = vi.fn(async () => new Response('hello', {
      status: 200,
      headers: { 'content-type': 'text/plain' },
    }));
    const http = createHttpClient({ baseUrl: BASE, fetch });

    const result = await http.get<string>('/text');
    expect(result).toBe('hello');
  });
});
