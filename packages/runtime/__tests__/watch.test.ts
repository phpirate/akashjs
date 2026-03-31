import { describe, it, expect, vi } from 'vitest';
import { watch, watchOnce, watchDebounced } from '../src/watch.js';
import { signal } from '../src/signals.js';
import { flushSync } from '../src/scheduler.js';

describe('watch', () => {
  it('calls callback with new and old values on change', () => {
    const count = signal(0);
    const spy = vi.fn();

    watch(() => count(), spy);

    count.set(1);
    flushSync();

    expect(spy).toHaveBeenCalledWith(1, 0);
  });

  it('with immediate fires callback immediately', () => {
    const count = signal(5);
    const spy = vi.fn();

    watch(() => count(), spy, { immediate: true });
    flushSync();

    expect(spy).toHaveBeenCalledWith(5, undefined);
  });

  it('with once only fires once then stops', () => {
    const count = signal(0);
    const spy = vi.fn();

    watch(() => count(), spy, { once: true });

    count.set(1);
    flushSync();
    expect(spy).toHaveBeenCalledTimes(1);

    count.set(2);
    flushSync();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('returns dispose function that stops watching', () => {
    const count = signal(0);
    const spy = vi.fn();

    const dispose = watch(() => count(), spy);

    count.set(1);
    flushSync();
    expect(spy).toHaveBeenCalledTimes(1);

    dispose();

    count.set(2);
    flushSync();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('watchOnce', () => {
  it('auto-disposes after first change', () => {
    const count = signal(0);
    const spy = vi.fn();

    watchOnce(() => count(), spy);
    // watchOnce defers by default — does not fire on initial value
    flushSync();
    expect(spy).toHaveBeenCalledTimes(0);

    // First change triggers the callback
    count.set(1);
    flushSync();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(1, 0);

    // Second change — should not fire (already disposed)
    count.set(2);
    flushSync();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('watchDebounced', () => {
  it('delays callback by the given ms', () => {
    vi.useFakeTimers();
    try {
      const count = signal(0);
      const spy = vi.fn();

      watchDebounced(() => count(), spy, 100);

      count.set(1);
      flushSync();

      // Not called yet — debounce pending
      expect(spy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(1, 0);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('watch multiple sources', () => {
  it('passes arrays of new/old values', () => {
    const a = signal(1);
    const b = signal('hello');
    const spy = vi.fn();

    watch([() => a(), () => b()], spy);

    a.set(2);
    flushSync();

    expect(spy).toHaveBeenCalledWith([2, 'hello'], [1, 'hello']);
  });
});
