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
});
