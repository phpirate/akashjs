/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useStorage, useOnline } from '../src/browser.js';
import { flushSync } from '../src/scheduler.js';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('useStorage', () => {
  it('returns the default value when key is absent', () => {
    const name = useStorage('test-key', 'Guest');
    expect(name()).toBe('Guest');
  });

  it('reads an existing value from localStorage', () => {
    localStorage.setItem('stored', JSON.stringify('Alice'));
    const name = useStorage('stored', 'Guest');
    expect(name()).toBe('Alice');
  });

  it('writes to localStorage when the signal is set', () => {
    const name = useStorage('write-key', 'initial');
    flushSync();
    name.set('updated');
    flushSync();
    expect(JSON.parse(localStorage.getItem('write-key')!)).toBe('updated');
  });

  it('updates the signal value reactively', () => {
    const count = useStorage('count', 0);
    expect(count()).toBe(0);
    count.set(5);
    expect(count()).toBe(5);
  });

  it('persists objects as JSON', () => {
    const data = useStorage('obj', { x: 1 });
    flushSync();
    data.set({ x: 2 });
    flushSync();
    expect(JSON.parse(localStorage.getItem('obj')!)).toEqual({ x: 2 });
  });
});

describe('useOnline', () => {
  it('returns a boolean signal', () => {
    const online = useOnline();
    expect(typeof online()).toBe('boolean');
  });
});
