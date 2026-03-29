/** @vitest-environment happy-dom */
import { describe, it, expect } from 'vitest';
import { createOfflineStore } from '../src/offline.js';

describe('createOfflineStore', () => {
  it('returns items/put/remove/clear/pending/syncing/online', () => {
    const store = createOfflineStore('test-store');
    expect(store.items).toBeTypeOf('function');
    expect(store.put).toBeTypeOf('function');
    expect(store.remove).toBeTypeOf('function');
    expect(store.clear).toBeTypeOf('function');
    expect(store.pending).toBeTypeOf('function');
    expect(store.syncing).toBeTypeOf('function');
    expect(store.online).toBeTypeOf('function');
    store.dispose();
  });

  it('items starts as empty array', () => {
    const store = createOfflineStore('test-empty');
    expect(store.items()).toEqual([]);
    store.dispose();
  });

  it('online reflects navigator.onLine', () => {
    const store = createOfflineStore('test-online');
    // happy-dom defaults navigator.onLine to true
    expect(store.online()).toBe(navigator.onLine);
    store.dispose();
  });

  it('pending starts at 0', () => {
    const store = createOfflineStore('test-pending');
    expect(store.pending()).toBe(0);
    store.dispose();
  });
});
