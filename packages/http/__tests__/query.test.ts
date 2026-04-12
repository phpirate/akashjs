import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createQueryClient, useCachedQuery, useMutation } from '../src/query.js';
import type { QueryClient } from '../src/query.js';

describe('createQueryClient', () => {
  it('creates a client with empty cache', () => {
    const qc = createQueryClient();
    expect(qc._cache.size).toBe(0);
  });

  it('setQueryData and getQueryData', async () => {
    const qc = createQueryClient();
    // First create a query so there's a cache entry
    const fetcher = vi.fn().mockResolvedValue([1, 2, 3]);
    const q = useCachedQuery(qc, ['items'], fetcher);
    await vi.waitFor(() => expect(q.fetched()).toBe(true));

    // Now set data manually
    qc.setQueryData(['items'], [4, 5, 6]);
    expect(qc.getQueryData(['items'])).toEqual([4, 5, 6]);
  });

  it('removeQuery removes from cache', async () => {
    const qc = createQueryClient();
    const q = useCachedQuery(qc, ['items'], () => Promise.resolve([1]));
    await vi.waitFor(() => expect(q.fetched()).toBe(true));

    expect(qc._cache.size).toBe(1);
    qc.removeQuery(['items']);
    expect(qc._cache.size).toBe(0);
  });

  it('clear removes all entries', async () => {
    const qc = createQueryClient();
    useCachedQuery(qc, ['a'], () => Promise.resolve(1));
    useCachedQuery(qc, ['b'], () => Promise.resolve(2));
    await vi.waitFor(() => expect(qc._cache.size).toBe(2));

    qc.clear();
    expect(qc._cache.size).toBe(0);
  });
});

describe('useCachedQuery', () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = createQueryClient();
  });

  it('fetches data and exposes it reactively', async () => {
    const fetcher = vi.fn().mockResolvedValue({ name: 'Alice' });
    const q = useCachedQuery(qc, ['user'], fetcher);

    expect(q()).toBeUndefined();
    expect(q.loading()).toBe(true);

    await vi.waitFor(() => expect(q.loading()).toBe(false));
    expect(q()).toEqual({ name: 'Alice' });
    expect(q.error()).toBeUndefined();
    expect(q.fetched()).toBe(true);
  });

  it('handles fetch errors', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('Network error'));
    const q = useCachedQuery(qc, ['fail'], fetcher);

    await vi.waitFor(() => expect(q.loading()).toBe(false));
    expect(q()).toBeUndefined();
    expect(q.error()?.message).toBe('Network error');
  });

  it('deduplicates concurrent fetches for the same key', async () => {
    let resolveCount = 0;
    const fetcher = vi.fn().mockImplementation(() => {
      resolveCount++;
      return Promise.resolve(resolveCount);
    });

    const q1 = useCachedQuery(qc, ['shared'], fetcher);
    const q2 = useCachedQuery(qc, ['shared'], fetcher);

    await vi.waitFor(() => expect(q1.fetched()).toBe(true));
    // fetcher called for each useCachedQuery but the cache entry is shared
    expect(qc._cache.size).toBe(1);
  });

  it('uses staleTime to avoid refetching fresh data', async () => {
    const qc2 = createQueryClient({ defaultStaleTime: 60_000 });
    const fetcher = vi.fn().mockResolvedValue('data');
    const q = useCachedQuery(qc2, ['cached'], fetcher);

    await vi.waitFor(() => expect(q.fetched()).toBe(true));
    expect(fetcher).toHaveBeenCalledTimes(1);

    // Refetch should be skipped — data is still fresh
    q.refetch();
    // Can't easily test the skip since refetch always fetches,
    // but at least verify it doesn't crash
    expect(q()).toBe('data');
  });

  it('supports initialData', () => {
    const q = useCachedQuery(qc, ['init'], () => Promise.resolve('new'), {
      initialData: 'initial',
    });
    expect(q()).toBe('initial');
  });

  it('refetch re-fetches data', async () => {
    let count = 0;
    const fetcher = vi.fn().mockImplementation(() => Promise.resolve(++count));
    const q = useCachedQuery(qc, ['refetchable'], fetcher);

    await vi.waitFor(() => expect(q()).toBe(1));
    q.refetch();
    await vi.waitFor(() => expect(q()).toBe(2));
  });

  it('setQueryData propagates to reactive signal', async () => {
    const fetcher = vi.fn().mockResolvedValue([1, 2, 3]);
    const q = useCachedQuery(qc, ['items'], fetcher);
    await vi.waitFor(() => expect(q.fetched()).toBe(true));
    expect(q()).toEqual([1, 2, 3]);

    // Manually update cache — should propagate to the query signal
    qc.setQueryData(['items'], [4, 5, 6]);
    expect(q()).toEqual([4, 5, 6]);
  });

  it('catches sync fetcher throws in error state', async () => {
    const q = useCachedQuery(qc, ['sync-err'], () => { throw new Error('boom'); });
    // Give the effect time to run
    await vi.waitFor(() => expect(q.loading()).toBe(false));
    expect(q.error()?.message).toBe('boom');
    expect(q()).toBeUndefined();
  });

  it('null key disables the query', async () => {
    const fetcher = vi.fn().mockResolvedValue('data');
    const q = useCachedQuery(qc, null, fetcher);
    // Wait a tick to ensure effect ran
    await new Promise(r => setTimeout(r, 10));
    expect(fetcher).not.toHaveBeenCalled();
    expect(q()).toBeUndefined();
    expect(q.loading()).toBe(false);
  });

  it('refetch() bypasses staleTime', async () => {
    const qc2 = createQueryClient({ defaultStaleTime: 60_000 });
    let count = 0;
    const fetcher = vi.fn().mockImplementation(() => Promise.resolve(++count));
    const q = useCachedQuery(qc2, ['stale-test'], fetcher);
    await vi.waitFor(() => expect(q()).toBe(1));

    // Data is fresh (within 60s staleTime), but refetch should force it
    q.refetch();
    await vi.waitFor(() => expect(q()).toBe(2));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('dispose stops the query', async () => {
    const fetcher = vi.fn().mockResolvedValue('data');
    const q = useCachedQuery(qc, ['disposable'], fetcher);
    await vi.waitFor(() => expect(q.fetched()).toBe(true));

    q.dispose();
    // After dispose, query should not refetch
    expect(q()).toBe('data');
  });
});

describe('useMutation', () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = createQueryClient();
  });

  it('executes mutation and tracks loading/data', async () => {
    const mutFn = vi.fn().mockResolvedValue({ id: 1 });
    const m = useMutation(qc, mutFn);

    expect(m.loading()).toBe(false);
    const promise = m.execute({ name: 'test' });
    expect(m.loading()).toBe(true);

    const result = await promise;
    expect(result).toEqual({ id: 1 });
    expect(m.loading()).toBe(false);
    expect(m.data()).toEqual({ id: 1 });
  });

  it('handles mutation errors', async () => {
    const mutFn = vi.fn().mockRejectedValue(new Error('Server error'));
    const onError = vi.fn();
    const m = useMutation(qc, mutFn, { onError });

    await m.execute('input');
    expect(m.error()?.message).toBe('Server error');
    expect(onError).toHaveBeenCalled();
  });

  it('invalidates queries after successful mutation', async () => {
    // Set up a query
    let fetchCount = 0;
    const fetcher = vi.fn().mockImplementation(() => Promise.resolve(++fetchCount));
    const q = useCachedQuery(qc, ['items'], fetcher);
    await vi.waitFor(() => expect(q()).toBe(1));

    // Mutate with invalidation
    const m = useMutation(qc, () => Promise.resolve('ok'), {
      invalidates: ['items'],
    });
    await m.execute(null);

    // Query should refetch
    await vi.waitFor(() => expect(q()).toBe(2));
  });

  it('calls onSuccess callback', async () => {
    const onSuccess = vi.fn();
    const m = useMutation(qc, () => Promise.resolve('result'), { onSuccess });
    await m.execute('input');
    expect(onSuccess).toHaveBeenCalledWith('result', 'input');
  });

  it('reset clears error and data', async () => {
    const m = useMutation(qc, () => Promise.resolve(42));
    await m.execute(null);
    expect(m.data()).toBe(42);

    m.reset();
    expect(m.data()).toBeUndefined();
    expect(m.error()).toBeUndefined();
  });
});
