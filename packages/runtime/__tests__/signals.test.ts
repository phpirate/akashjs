import { describe, it, expect, vi } from 'vitest';
import { signal, computed, effect, untrack } from '../src/signals.js';
import { batch, flushSync } from '../src/scheduler.js';

describe('signal', () => {
  it('reads and writes a value', () => {
    const count = signal(0);
    expect(count()).toBe(0);
    count.set(5);
    expect(count()).toBe(5);
  });

  it('updates using previous value', () => {
    const count = signal(10);
    count.update((c) => c + 1);
    expect(count()).toBe(11);
  });

  it('skips update when value is the same (Object.is)', () => {
    const spy = vi.fn();
    const count = signal(1);
    effect(() => {
      spy(count());
    });
    expect(spy).toHaveBeenCalledTimes(1);

    count.set(1); // same value
    flushSync();
    expect(spy).toHaveBeenCalledTimes(1); // should NOT re-run
  });

  it('supports custom equality function', () => {
    const spy = vi.fn();
    const obj = signal({ x: 1 }, { equals: (a, b) => a.x === b.x });
    effect(() => {
      spy(obj());
    });
    expect(spy).toHaveBeenCalledTimes(1);

    obj.set({ x: 1 }); // same .x
    flushSync();
    expect(spy).toHaveBeenCalledTimes(1);

    obj.set({ x: 2 }); // different .x
    flushSync();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('peek reads without tracking', () => {
    const count = signal(0);
    const spy = vi.fn();

    effect(() => {
      spy(count.peek());
    });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(0);

    count.set(5);
    flushSync();
    // Should NOT re-run because peek doesn't track
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('computed', () => {
  it('derives a value from signals', () => {
    const count = signal(3);
    const doubled = computed(() => count() * 2);
    expect(doubled()).toBe(6);
  });

  it('is lazy — does not compute until read', () => {
    const spy = vi.fn(() => 42);
    const c = computed(spy);
    expect(spy).not.toHaveBeenCalled();
    expect(c()).toBe(42);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('caches result and reuses on subsequent reads', () => {
    const spy = vi.fn(() => 42);
    const c = computed(spy);
    c();
    c();
    c();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('recomputes when dependency changes', () => {
    const count = signal(1);
    const doubled = computed(() => count() * 2);
    expect(doubled()).toBe(2);

    count.set(5);
    expect(doubled()).toBe(10);
  });

  it('chains through multiple computed levels', () => {
    const a = signal(1);
    const b = computed(() => a() + 1);
    const c = computed(() => b() * 2);
    expect(c()).toBe(4); // (1 + 1) * 2

    a.set(3);
    expect(c()).toBe(8); // (3 + 1) * 2
  });

  it('handles diamond dependency without glitches', () => {
    const source = signal(1);
    const left = computed(() => source() * 2);
    const right = computed(() => source() * 3);
    const combined = computed(() => left() + right());

    expect(combined()).toBe(5); // 2 + 3

    source.set(2);
    // Should be 4 + 6 = 10, NOT an intermediate state
    expect(combined()).toBe(10);
  });

  it('supports custom equality', () => {
    const spy = vi.fn();
    const a = signal(1);
    const rounded = computed(() => Math.floor(a()), {
      equals: (prev, next) => prev === next,
    });

    effect(() => spy(rounded()));
    expect(spy).toHaveBeenCalledTimes(1);

    a.set(1.5); // floor(1.5) = 1, same as before
    flushSync();
    expect(spy).toHaveBeenCalledTimes(1);

    a.set(2.5); // floor(2.5) = 2, different
    flushSync();
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

describe('effect', () => {
  it('runs immediately to establish dependencies', () => {
    const spy = vi.fn();
    effect(spy);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('re-runs when a tracked signal changes', () => {
    const count = signal(0);
    const spy = vi.fn();

    effect(() => spy(count()));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(0);

    count.set(1);
    flushSync();
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith(1);
  });

  it('re-runs when a tracked computed changes', () => {
    const count = signal(1);
    const doubled = computed(() => count() * 2);
    const spy = vi.fn();

    effect(() => spy(doubled()));
    expect(spy).toHaveBeenCalledWith(2);

    count.set(3);
    flushSync();
    expect(spy).toHaveBeenCalledWith(6);
  });

  it('calls cleanup before re-run', () => {
    const count = signal(0);
    const cleanup = vi.fn();

    effect(() => {
      count();
      return cleanup;
    });
    expect(cleanup).not.toHaveBeenCalled();

    count.set(1);
    flushSync();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('calls cleanup on dispose', () => {
    const cleanup = vi.fn();
    const dispose = effect(() => cleanup);
    expect(cleanup).not.toHaveBeenCalled();

    dispose();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('stops running after dispose', () => {
    const count = signal(0);
    const spy = vi.fn();

    const dispose = effect(() => spy(count()));
    expect(spy).toHaveBeenCalledTimes(1);

    dispose();
    count.set(1);
    flushSync();
    expect(spy).toHaveBeenCalledTimes(1); // no re-run
  });

  it('tracks dynamic dependencies correctly', () => {
    const toggle = signal(true);
    const a = signal('A');
    const b = signal('B');
    const spy = vi.fn();

    effect(() => {
      spy(toggle() ? a() : b());
    });
    expect(spy).toHaveBeenCalledWith('A');

    // Changing b should NOT trigger re-run (not tracked)
    b.set('B2');
    flushSync();
    expect(spy).toHaveBeenCalledTimes(1);

    // Switch to b branch
    toggle.set(false);
    flushSync();
    expect(spy).toHaveBeenCalledWith('B2');

    // Now changing a should NOT trigger re-run
    a.set('A2');
    flushSync();
    expect(spy).toHaveBeenCalledTimes(2);

    // But changing b should
    b.set('B3');
    flushSync();
    expect(spy).toHaveBeenCalledWith('B3');
  });
});

describe('untrack', () => {
  it('prevents dependency tracking inside untrack()', () => {
    const count = signal(0);
    const spy = vi.fn();

    effect(() => {
      spy(untrack(() => count()));
    });
    expect(spy).toHaveBeenCalledWith(0);

    count.set(1);
    flushSync();
    // Should NOT re-run because count was read inside untrack
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('batch', () => {
  it('batches multiple writes into a single effect run', () => {
    const a = signal(0);
    const b = signal(0);
    const spy = vi.fn();

    effect(() => spy(a() + b()));
    expect(spy).toHaveBeenCalledTimes(1);

    batch(() => {
      a.set(1);
      b.set(2);
    });
    // Effect should run only once after batch, not twice
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith(3);
  });

  it('supports nested batches', () => {
    const count = signal(0);
    const spy = vi.fn();

    effect(() => spy(count()));
    expect(spy).toHaveBeenCalledTimes(1);

    batch(() => {
      count.set(1);
      batch(() => {
        count.set(2);
      });
      count.set(3);
    });

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith(3);
  });
});
