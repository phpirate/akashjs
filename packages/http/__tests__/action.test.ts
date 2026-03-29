import { describe, it, expect, vi } from 'vitest';
import { createAction } from '../src/action.js';

describe('createAction', () => {
  it('executes the mutation and returns result', async () => {
    const action = createAction(
      async (input: { name: string }) => ({ id: 1, name: input.name }),
    );

    const result = await action.execute({ name: 'Alice' });
    expect(result).toEqual({ id: 1, name: 'Alice' });
  });

  it('tracks loading state', async () => {
    let resolve!: (v: string) => void;
    const action = createAction(() => new Promise<string>((r) => { resolve = r; }));

    const promise = action.execute(null);
    expect(action.loading()).toBe(true);

    resolve('done');
    await promise;
    expect(action.loading()).toBe(false);
  });

  it('tracks error state', async () => {
    const action = createAction(async () => {
      throw new Error('fail');
    });

    await expect(action.execute(null)).rejects.toThrow('fail');
    expect(action.error()?.message).toBe('fail');
    expect(action.loading()).toBe(false);
  });

  it('tracks data state', async () => {
    const action = createAction(async () => 42);
    expect(action.data()).toBeUndefined();

    await action.execute(null);
    expect(action.data()).toBe(42);
  });

  it('calls onSuccess callback', async () => {
    const onSuccess = vi.fn();
    const action = createAction(
      async (n: number) => n * 2,
      { onSuccess },
    );

    await action.execute(5);
    expect(onSuccess).toHaveBeenCalledWith(10, 5);
  });

  it('calls onError callback', async () => {
    const onError = vi.fn();
    const action = createAction(
      async () => { throw new Error('oops'); },
      { onError },
    );

    await action.execute(null).catch(() => {});
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].message).toBe('oops');
  });

  it('calls onSettled on success', async () => {
    const onSettled = vi.fn();
    const action = createAction(async () => 'ok', { onSettled });
    await action.execute('input');
    expect(onSettled).toHaveBeenCalledWith('input');
  });

  it('calls onSettled on error', async () => {
    const onSettled = vi.fn();
    const action = createAction(
      async () => { throw new Error('e'); },
      { onSettled },
    );
    await action.execute('x').catch(() => {});
    expect(onSettled).toHaveBeenCalledWith('x');
  });

  it('calls optimistic and revertOptimistic on error', async () => {
    const optimistic = vi.fn();
    const revertOptimistic = vi.fn();
    const action = createAction(
      async () => { throw new Error('e'); },
      { optimistic, revertOptimistic },
    );

    await action.execute('data').catch(() => {});
    expect(optimistic).toHaveBeenCalledWith('data');
    expect(revertOptimistic).toHaveBeenCalledWith('data');
  });

  it('does not revert optimistic on success', async () => {
    const revertOptimistic = vi.fn();
    const action = createAction(
      async () => 'ok',
      { optimistic: vi.fn(), revertOptimistic },
    );

    await action.execute('data');
    expect(revertOptimistic).not.toHaveBeenCalled();
  });

  it('reset() clears data and error', async () => {
    const action = createAction(async () => 42);
    await action.execute(null);
    expect(action.data()).toBe(42);

    action.reset();
    expect(action.data()).toBeUndefined();
    expect(action.error()).toBeUndefined();
  });
});
