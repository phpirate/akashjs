import { describe, it, expect, vi } from 'vitest';
import { retry, dedup, createQueue } from '../src/retry.js';

describe('retry', () => {
  it('succeeds on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await retry(fn, { maxRetries: 3, delay: 0, jitter: false });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and eventually succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('ok');

    const result = await retry(fn, { maxRetries: 3, delay: 0, jitter: false });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws after maxRetries exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));

    await expect(
      retry(fn, { maxRetries: 2, delay: 0, jitter: false }),
    ).rejects.toThrow('always fails');

    // initial + 2 retries = 3 calls
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('calls onRetry callback', async () => {
    const onRetry = vi.fn();
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');

    await retry(fn, { maxRetries: 3, delay: 0, jitter: false, onRetry });

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1);
  });
});

describe('dedup', () => {
  it('returns same promise for concurrent calls with same args', async () => {
    let callCount = 0;
    const fn = dedup(async (id: string) => {
      callCount++;
      return `result-${id}`;
    });

    const [a, b] = await Promise.all([fn('1'), fn('1')]);
    expect(a).toBe('result-1');
    expect(b).toBe('result-1');
    expect(callCount).toBe(1);
  });

  it('allows new call after previous resolves', async () => {
    let callCount = 0;
    const fn = dedup(async (id: string) => {
      callCount++;
      return `result-${id}-${callCount}`;
    });

    const first = await fn('1');
    const second = await fn('1');
    expect(callCount).toBe(2);
    expect(first).toBe('result-1-1');
    expect(second).toBe('result-1-2');
  });
});

describe('createQueue', () => {
  it('processes tasks with concurrency limit', async () => {
    const queue = createQueue({ concurrency: 1 });
    const order: number[] = [];

    const t1 = queue.add(async () => { order.push(1); return 1; });
    const t2 = queue.add(async () => { order.push(2); return 2; });
    const t3 = queue.add(async () => { order.push(3); return 3; });

    const results = await Promise.all([t1, t2, t3]);
    expect(results).toEqual([1, 2, 3]);
    expect(order).toEqual([1, 2, 3]);
  });

  it('pending and running track counts', async () => {
    const queue = createQueue({ concurrency: 1 });

    let resolveFn!: () => void;
    const blocker = new Promise<void>((r) => { resolveFn = r; });

    const t1 = queue.add(() => blocker);
    // t1 is running, so running should be 1

    const t2 = queue.add(async () => 'done');
    // t2 is pending since concurrency is 1

    expect(queue.running()).toBe(1);
    expect(queue.pending()).toBe(1);

    resolveFn();
    await t1;
    await t2;
    // Wait for queue internals to settle
    await new Promise((r) => setTimeout(r, 10));

    expect(queue.running()).toBe(0);
    expect(queue.pending()).toBe(0);
  });
});
