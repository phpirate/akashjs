import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signal } from '@akashjs/runtime';
import { flushSync } from '@akashjs/runtime';
import { createResource } from '../src/resource.js';

describe('createResource', () => {
  it('fetches data and exposes it as a signal', async () => {
    const resource = createResource(() => Promise.resolve({ name: 'Alice' }));

    // Initially loading
    expect(resource.loading()).toBe(true);
    expect(resource()).toBeUndefined();

    await vi.waitFor(() => {
      expect(resource()).toEqual({ name: 'Alice' });
    });

    expect(resource.loading()).toBe(false);
    expect(resource.error()).toBeUndefined();

    resource.dispose();
  });

  it('exposes loading state', async () => {
    let resolve!: (value: string) => void;
    const fetcher = () => new Promise<string>((r) => { resolve = r; });

    const resource = createResource(fetcher);
    expect(resource.loading()).toBe(true);

    resolve('done');
    await vi.waitFor(() => {
      expect(resource.loading()).toBe(false);
    });

    expect(resource()).toBe('done');
    resource.dispose();
  });

  it('exposes error state', async () => {
    const resource = createResource(() => Promise.reject(new Error('fail')));

    await vi.waitFor(() => {
      expect(resource.error()).toBeDefined();
    });

    expect(resource.error()!.message).toBe('fail');
    expect(resource.loading()).toBe(false);
    expect(resource()).toBeUndefined();

    resource.dispose();
  });

  it('refetches manually', async () => {
    let count = 0;
    const resource = createResource(() => Promise.resolve(++count));

    await vi.waitFor(() => {
      expect(resource()).toBe(1);
    });

    resource.refetch();

    await vi.waitFor(() => {
      expect(resource()).toBe(2);
    });

    resource.dispose();
  });

  it('supports optimistic mutation', async () => {
    const resource = createResource(() => Promise.resolve('server'));

    await vi.waitFor(() => {
      expect(resource()).toBe('server');
    });

    resource.mutate('optimistic');
    expect(resource()).toBe('optimistic');

    resource.dispose();
  });

  it('uses initialData before fetch completes', async () => {
    let resolve!: (value: string) => void;
    const fetcher = () => new Promise<string>((r) => { resolve = r; });

    const resource = createResource(fetcher, { initialData: 'initial' });

    expect(resource()).toBe('initial');

    resolve('fetched');
    await vi.waitFor(() => {
      expect(resource()).toBe('fetched');
    });

    resource.dispose();
  });

  it('refetches when reactive key changes', async () => {
    const userId = signal(1);
    let fetchCount = 0;

    const resource = createResource(
      () => {
        const id = userId();
        fetchCount++;
        return Promise.resolve({ id });
      },
      { key: () => userId() },
    );

    await vi.waitFor(() => {
      expect(resource()).toEqual({ id: 1 });
    });

    const initialFetchCount = fetchCount;
    userId.set(2);
    flushSync();

    await vi.waitFor(() => {
      expect(resource()).toEqual({ id: 2 });
    });

    expect(fetchCount).toBeGreaterThan(initialFetchCount);
    resource.dispose();
  });

  it('disposes cleanly', async () => {
    const resource = createResource(() => Promise.resolve('data'));

    await vi.waitFor(() => {
      expect(resource()).toBe('data');
    });

    resource.dispose();
    // No errors after dispose
  });

  it('converts non-Error rejections to Error', async () => {
    const resource = createResource(() => Promise.reject('string error'));

    await vi.waitFor(() => {
      expect(resource.error()).toBeDefined();
    });

    expect(resource.error()).toBeInstanceOf(Error);
    expect(resource.error()!.message).toBe('string error');

    resource.dispose();
  });
});
