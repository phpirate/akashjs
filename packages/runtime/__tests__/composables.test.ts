import { describe, it, expect, vi } from 'vitest';
import { useCounter, useToggle, useDebounce, useThrottle } from '../src/composables.js';
import { signal } from '../src/signals.js';
import { flushSync } from '../src/scheduler.js';

describe('useCounter', () => {
  it('starts at the initial value', () => {
    const { count } = useCounter(10);
    expect(count()).toBe(10);
  });

  it('defaults to 0', () => {
    const { count } = useCounter();
    expect(count()).toBe(0);
  });

  it('increments by 1 by default', () => {
    const { count, inc } = useCounter(0);
    inc();
    expect(count()).toBe(1);
  });

  it('increments by a custom delta', () => {
    const { count, inc } = useCounter(0);
    inc(5);
    expect(count()).toBe(5);
  });

  it('decrements by 1 by default', () => {
    const { count, dec } = useCounter(10);
    dec();
    expect(count()).toBe(9);
  });

  it('decrements by a custom delta', () => {
    const { count, dec } = useCounter(10);
    dec(3);
    expect(count()).toBe(7);
  });

  it('sets an arbitrary value', () => {
    const { count, set } = useCounter(0);
    set(42);
    expect(count()).toBe(42);
  });

  it('resets to the initial value', () => {
    const { count, inc, reset } = useCounter(5);
    inc();
    inc();
    expect(count()).toBe(7);
    reset();
    expect(count()).toBe(5);
  });

  it('clamps at max on inc', () => {
    const { count, inc } = useCounter(9, { min: 0, max: 10 });
    inc();
    expect(count()).toBe(10);
    inc();
    expect(count()).toBe(10);
  });

  it('clamps at min on dec', () => {
    const { count, dec } = useCounter(1, { min: 0, max: 10 });
    dec();
    expect(count()).toBe(0);
    dec();
    expect(count()).toBe(0);
  });

  it('clamps on set', () => {
    const { count, set } = useCounter(0, { min: -5, max: 10 });
    set(100);
    expect(count()).toBe(10);
    set(-100);
    expect(count()).toBe(-5);
  });
});

describe('useToggle', () => {
  it('starts at the initial value', () => {
    const { value } = useToggle(true);
    expect(value()).toBe(true);
  });

  it('defaults to false', () => {
    const { value } = useToggle();
    expect(value()).toBe(false);
  });

  it('toggles the value', () => {
    const { value, toggle } = useToggle(false);
    toggle();
    expect(value()).toBe(true);
    toggle();
    expect(value()).toBe(false);
  });

  it('setTrue sets value to true', () => {
    const { value, setTrue } = useToggle(false);
    setTrue();
    expect(value()).toBe(true);
    // calling again stays true
    setTrue();
    expect(value()).toBe(true);
  });

  it('setFalse sets value to false', () => {
    const { value, setFalse } = useToggle(true);
    setFalse();
    expect(value()).toBe(false);
    // calling again stays false
    setFalse();
    expect(value()).toBe(false);
  });
});

describe('useDebounce', () => {
  it('debounces value updates', () => {
    vi.useFakeTimers();
    const source = signal('a');
    const debounced = useDebounce(() => source(), 100);
    flushSync();

    // Initial value should be set immediately
    expect(debounced()).toBe('a');

    source.set('b');
    flushSync();
    // Before the delay elapses, debounced should still be 'a'
    expect(debounced()).toBe('a');

    vi.advanceTimersByTime(50);
    expect(debounced()).toBe('a');

    vi.advanceTimersByTime(50);
    // After full delay, debounced should update
    expect(debounced()).toBe('b');

    vi.useRealTimers();
  });

  it('resets the delay on rapid changes', () => {
    vi.useFakeTimers();
    const source = signal('x');
    const debounced = useDebounce(() => source(), 100);
    flushSync();

    source.set('y');
    flushSync();
    vi.advanceTimersByTime(50);

    source.set('z');
    flushSync();
    vi.advanceTimersByTime(50);
    // Only 50ms since last change, should not have updated yet
    expect(debounced()).toBe('x');

    vi.advanceTimersByTime(50);
    // Now 100ms since last change
    expect(debounced()).toBe('z');

    vi.useRealTimers();
  });
});

describe('useThrottle', () => {
  it('throttles value updates', () => {
    vi.useFakeTimers();
    const source = signal(0);
    const throttled = useThrottle(() => source(), 100);
    flushSync();

    expect(throttled()).toBe(0);

    // Advance time so the first real update passes the interval check
    vi.advanceTimersByTime(100);

    source.set(1);
    flushSync();
    expect(throttled()).toBe(1);

    // Rapid subsequent update within interval should be throttled
    source.set(2);
    flushSync();
    expect(throttled()).toBe(1);

    vi.advanceTimersByTime(100);
    // After the interval, the trailing update should apply
    expect(throttled()).toBe(2);

    vi.useRealTimers();
  });
});
