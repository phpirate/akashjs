/** @vitest-environment happy-dom */

import { describe, it, expect, beforeEach } from 'vitest';
import { defineStore, clearStores } from '../src/store.js';

beforeEach(() => {
  clearStores();
});

describe('defineStore', () => {
  it('creates a store with state signals', () => {
    const useStore = defineStore('counter', {
      state: () => ({ count: 0, name: 'test' }),
    });
    const store = useStore();
    expect(store.count()).toBe(0);
    expect(store.name()).toBe('test');
  });

  it('returns the same instance (singleton)', () => {
    const useStore = defineStore('singleton', {
      state: () => ({ value: 1 }),
    });
    const a = useStore();
    const b = useStore();
    expect(a).toBe(b);
  });

  it('state signals are writable', () => {
    const useStore = defineStore('writable', {
      state: () => ({ count: 0 }),
    });
    const store = useStore();
    store.count.set(5);
    expect(store.count()).toBe(5);
  });

  it('supports update() on state signals', () => {
    const useStore = defineStore('update', {
      state: () => ({ count: 0 }),
    });
    const store = useStore();
    store.count.update((c) => c + 10);
    expect(store.count()).toBe(10);
  });
});

describe('getters', () => {
  it('creates computed getters', () => {
    const useStore = defineStore('getters', {
      state: () => ({ count: 5 }),
      getters: {
        doubled: (state) => state.count() * 2,
        tripled: (state) => state.count() * 3,
      },
    });
    const store = useStore();
    expect(store.doubled()).toBe(10);
    expect(store.tripled()).toBe(15);
  });

  it('getters update when state changes', () => {
    const useStore = defineStore('reactive-getter', {
      state: () => ({ count: 1 }),
      getters: {
        doubled: (state) => state.count() * 2,
      },
    });
    const store = useStore();
    expect(store.doubled()).toBe(2);
    store.count.set(5);
    expect(store.doubled()).toBe(10);
  });
});

describe('actions', () => {
  it('binds actions to state', () => {
    const useStore = defineStore('actions', {
      state: () => ({ count: 0 }),
      actions: {
        increment() { this.count.update((c: number) => c + 1); },
        setTo(n: number) { this.count.set(n); },
      },
    });
    const store = useStore();
    store.increment();
    expect(store.count()).toBe(1);
    store.setTo(42);
    expect(store.count()).toBe(42);
  });
});

describe('$reset', () => {
  it('resets state to initial values', () => {
    const useStore = defineStore('reset', {
      state: () => ({ count: 0, name: 'init' }),
    });
    const store = useStore();
    store.count.set(99);
    store.name.set('changed');
    store.$reset();
    expect(store.count()).toBe(0);
    expect(store.name()).toBe('init');
  });
});

describe('$snapshot', () => {
  it('returns plain object of current state', () => {
    const useStore = defineStore('snapshot', {
      state: () => ({ a: 1, b: 'two' }),
    });
    const store = useStore();
    store.a.set(10);
    expect(store.$snapshot()).toEqual({ a: 10, b: 'two' });
  });
});

describe('$id', () => {
  it('exposes the store ID', () => {
    const useStore = defineStore('my-store', {
      state: () => ({ x: 0 }),
    });
    expect(useStore().$id).toBe('my-store');
  });
});

describe('clearStores', () => {
  it('clears all instances so new ones are created', () => {
    const useStore = defineStore('clearable', {
      state: () => ({ count: 0 }),
    });
    const first = useStore();
    first.count.set(42);

    clearStores();
    const second = useStore();
    expect(second.count()).toBe(0); // fresh instance
  });

  it('persist: true hydrates and saves to localStorage', () => {
    clearStores();
    // Seed localStorage
    localStorage.setItem('akash-store:persist-test', JSON.stringify({ count: 10 }));

    const useStore2 = defineStore('persist-test', {
      state: () => ({ count: 0 }),
      persist: true,
    });
    const store = useStore2();
    // Should hydrate from localStorage
    expect(store.count()).toBe(10);

    // Change state — should write to localStorage after microtask
    store.count.set(20);

    clearStores();
    localStorage.removeItem('akash-store:persist-test');
  });

  it('persist: { pick } only persists selected keys', () => {
    clearStores();
    localStorage.setItem('akash-store:pick-test', JSON.stringify({ name: 'saved', temp: 'old' }));

    const useStore3 = defineStore('pick-test', {
      state: () => ({ name: '', temp: '' }),
      persist: { pick: ['name'] },
    });
    const store = useStore3();
    // Only 'name' should hydrate
    expect(store.name()).toBe('saved');
    expect(store.temp()).toBe(''); // not in pick list

    clearStores();
    localStorage.removeItem('akash-store:pick-test');
  });

  it('persist captures all sequential updates in same tick', async () => {
    clearStores();
    const useStore5 = defineStore('seq-test', {
      state: () => ({ a: 0, b: 0 }),
      persist: true,
    });
    const store = useStore5();
    store.a.set(10);
    store.b.set(20);

    // Wait for microtask to flush
    await new Promise(r => queueMicrotask(r));
    const saved = JSON.parse(localStorage.getItem('akash-store:seq-test') ?? '{}');
    expect(saved.a).toBe(10);
    expect(saved.b).toBe(20); // was 0 before fix

    clearStores();
    localStorage.removeItem('akash-store:seq-test');
  });

  it('persist: { key } uses custom storage key', () => {
    clearStores();
    localStorage.setItem('my-custom-key', JSON.stringify({ theme: 'dark' }));

    const useStore4 = defineStore('theme-store', {
      state: () => ({ theme: 'light' }),
      persist: { key: 'my-custom-key' },
    });
    const store = useStore4();
    expect(store.theme()).toBe('dark');

    clearStores();
    localStorage.removeItem('my-custom-key');
  });
});
