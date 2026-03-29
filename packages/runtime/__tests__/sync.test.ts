import { describe, it, expect, vi } from 'vitest';
import { LWWRegister, createSync, createLocalTransport } from '../src/sync.js';

describe('LWWRegister', () => {
  it('set updates value', () => {
    const reg = new LWWRegister('hello', 'peer-a');
    reg.set('world', 'peer-a');
    expect(reg.value).toBe('world');
  });

  it('higher timestamp wins', () => {
    const reg = new LWWRegister('initial', 'peer-a');
    const first = reg.timestamp;

    // Advance time so set succeeds
    vi.spyOn(Date, 'now').mockReturnValue(first + 100);
    const updated = reg.set('updated', 'peer-a');
    expect(updated).toBe(true);
    expect(reg.value).toBe('updated');
    vi.restoreAllMocks();
  });

  it('merge with higher timestamp updates', () => {
    const reg = new LWWRegister('local', 'peer-a');
    const merged = reg.merge({
      value: 'remote',
      timestamp: Date.now() + 1000,
      peerId: 'peer-b',
    });
    expect(merged).toBe(true);
    expect(reg.value).toBe('remote');
  });

  it('merge with lower timestamp is rejected', () => {
    const reg = new LWWRegister('local', 'peer-a');
    const merged = reg.merge({
      value: 'old-remote',
      timestamp: 0,
      peerId: 'peer-b',
    });
    expect(merged).toBe(false);
    expect(reg.value).toBe('local');
  });
});

describe('createSync', () => {
  it('creates doc with state signals', () => {
    const doc = createSync('room-1', { title: '', count: 0 });
    expect(doc.state).toBeDefined();
    expect(doc.state.title).toBeDefined();
    expect(doc.state.count).toBeDefined();
  });

  it('state signals are readable', () => {
    const doc = createSync('room-2', { title: 'hello', count: 42 });
    expect(doc.state.title()).toBe('hello');
    expect(doc.state.count()).toBe(42);
  });

  it('state.set updates value', () => {
    const doc = createSync('room-3', { title: '' });
    doc.state.title.set('updated');
    expect(doc.state.title()).toBe('updated');
  });

  it('peerId is set', () => {
    const doc = createSync('room-4', { x: 0 }, { peerId: 'my-peer' });
    expect(doc.peerId).toBe('my-peer');
  });

  it('createLocalTransport works (send triggers onReceive)', () => {
    const transport = createLocalTransport();
    const received: unknown[] = [];

    transport.onReceive((op) => {
      received.push(op);
    });

    const op = { type: 'set' as const, key: 'title', value: 'hi', timestamp: Date.now(), peerId: 'p1' };
    transport.send(op);

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual(op);
  });
});
