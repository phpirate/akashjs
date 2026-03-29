import { describe, it, expect, vi } from 'vitest';
import { createEventBus } from '../src/event-bus.js';

type TestEvents = {
  greet: string;
  count: number;
};

describe('createEventBus', () => {
  it('creates bus with on/emit/off/clear', () => {
    const bus = createEventBus<TestEvents>();
    expect(typeof bus.on).toBe('function');
    expect(typeof bus.emit).toBe('function');
    expect(typeof bus.off).toBe('function');
    expect(typeof bus.clear).toBe('function');
  });

  it('on + emit delivers data to handler', () => {
    const bus = createEventBus<TestEvents>();
    const spy = vi.fn();

    bus.on('greet', spy);
    bus.emit('greet', 'hello');

    expect(spy).toHaveBeenCalledWith('hello');
  });

  it('on returns unsubscribe function', () => {
    const bus = createEventBus<TestEvents>();
    const spy = vi.fn();

    const unsub = bus.on('greet', spy);
    unsub();

    bus.emit('greet', 'hello');
    expect(spy).not.toHaveBeenCalled();
  });

  it('multiple listeners all receive events', () => {
    const bus = createEventBus<TestEvents>();
    const spy1 = vi.fn();
    const spy2 = vi.fn();

    bus.on('count', spy1);
    bus.on('count', spy2);
    bus.emit('count', 42);

    expect(spy1).toHaveBeenCalledWith(42);
    expect(spy2).toHaveBeenCalledWith(42);
  });

  it('once only fires handler once', () => {
    const bus = createEventBus<TestEvents>();
    const spy = vi.fn();

    bus.once('greet', spy);
    bus.emit('greet', 'first');
    bus.emit('greet', 'second');

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('first');
  });

  it('off removes a specific handler', () => {
    const bus = createEventBus<TestEvents>();
    const spy = vi.fn();

    bus.on('greet', spy);
    bus.off('greet', spy);
    bus.emit('greet', 'hello');

    expect(spy).not.toHaveBeenCalled();
  });

  it('clear removes all handlers for an event', () => {
    const bus = createEventBus<TestEvents>();
    const spy1 = vi.fn();
    const spy2 = vi.fn();

    bus.on('greet', spy1);
    bus.on('greet', spy2);
    bus.clear('greet');
    bus.emit('greet', 'hello');

    expect(spy1).not.toHaveBeenCalled();
    expect(spy2).not.toHaveBeenCalled();
  });

  it('clear with no args removes all handlers', () => {
    const bus = createEventBus<TestEvents>();
    const spyGreet = vi.fn();
    const spyCount = vi.fn();

    bus.on('greet', spyGreet);
    bus.on('count', spyCount);
    bus.clear();
    bus.emit('greet', 'hello');
    bus.emit('count', 1);

    expect(spyGreet).not.toHaveBeenCalled();
    expect(spyCount).not.toHaveBeenCalled();
  });

  it('listenerCount returns correct count', () => {
    const bus = createEventBus<TestEvents>();

    expect(bus.listenerCount('greet')).toBe(0);
    bus.on('greet', () => {});
    expect(bus.listenerCount('greet')).toBe(1);
    bus.on('greet', () => {});
    expect(bus.listenerCount('greet')).toBe(2);
  });

  it('hasListeners returns true/false correctly', () => {
    const bus = createEventBus<TestEvents>();

    expect(bus.hasListeners('greet')).toBe(false);
    const unsub = bus.on('greet', () => {});
    expect(bus.hasListeners('greet')).toBe(true);
    unsub();
    expect(bus.hasListeners('greet')).toBe(false);
  });
});
