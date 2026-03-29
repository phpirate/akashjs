/** @vitest-environment happy-dom */
import { describe, it, expect, vi } from 'vitest';
import { Await, awaitSignal } from '../src/await-block.js';

describe('Await component', () => {
  it('is a valid component (_akash true)', () => {
    expect((Await as any)._akash).toBe(true);
  });
});

describe('awaitSignal', () => {
  it('returns a function', () => {
    const result = awaitSignal(Promise.resolve('ok'));
    expect(typeof result).toBe('function');
  });

  it('starts with pending status', () => {
    const result = awaitSignal(new Promise(() => {}));
    expect(result().status).toBe('pending');
  });

  it('resolves to resolved status', async () => {
    const result = awaitSignal(Promise.resolve('hello'));
    await vi.waitFor(() => {
      expect(result().status).toBe('resolved');
    });
    const state = result() as { status: 'resolved'; value: string };
    expect(state.value).toBe('hello');
  });

  it('rejects to rejected status', async () => {
    const result = awaitSignal(Promise.reject(new Error('fail')));
    await vi.waitFor(() => {
      expect(result().status).toBe('rejected');
    });
    const state = result() as { status: 'rejected'; error: Error };
    expect(state.error.message).toBe('fail');
  });
});
