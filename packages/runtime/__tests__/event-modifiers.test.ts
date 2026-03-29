/** @vitest-environment happy-dom */
import { describe, it, expect, vi } from 'vitest';
import {
  withModifiers,
  onEvent,
  bindClass,
  bindStyle,
  bindElement,
  bindDimensions,
} from '../src/event-modifiers.js';
import { signal } from '../src/signals.js';
import { flushSync } from '../src/scheduler.js';

describe('withModifiers', () => {
  it('calls handler', () => {
    const handler = vi.fn();
    const wrapped = withModifiers(handler, {});
    const event = new MouseEvent('click');
    wrapped(event);
    expect(handler).toHaveBeenCalledWith(event);
  });

  it('with preventDefault calls e.preventDefault', () => {
    const handler = vi.fn();
    const wrapped = withModifiers(handler, { preventDefault: true });
    const event = new MouseEvent('click', { cancelable: true });
    const spy = vi.spyOn(event, 'preventDefault');
    wrapped(event);
    expect(spy).toHaveBeenCalled();
  });

  it('with self skips when target !== currentTarget', () => {
    const handler = vi.fn();
    const wrapped = withModifiers(handler, { self: true });
    const parent = document.createElement('div');
    const child = document.createElement('span');
    parent.appendChild(child);
    const event = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(event, 'target', { value: child });
    Object.defineProperty(event, 'currentTarget', { value: parent });
    wrapped(event);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('onEvent', () => {
  it('attaches handler and returns dispose function', () => {
    const el = document.createElement('button');
    const handler = vi.fn();
    const dispose = onEvent(el, 'click', handler);
    el.click();
    expect(handler).toHaveBeenCalledTimes(1);
    dispose();
    el.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('bindClass', () => {
  it('adds/removes class based on condition', () => {
    const el = document.createElement('div');
    const active = signal(false);
    bindClass(el, 'active', () => active());
    expect(el.classList.contains('active')).toBe(false);
    active.set(true);
    flushSync();
    expect(el.classList.contains('active')).toBe(true);
    active.set(false);
    flushSync();
    expect(el.classList.contains('active')).toBe(false);
  });
});

describe('bindStyle', () => {
  it('sets style property', () => {
    const el = document.createElement('div');
    const color = signal('red');
    bindStyle(el, 'color', () => color());
    expect(el.style.color).toBe('red');
  });
});

describe('bindElement', () => {
  it('returns a signal initialized to null', () => {
    const ref = bindElement();
    expect(ref()).toBeNull();
  });
});

describe('bindDimensions', () => {
  it('returns width/height signals', () => {
    const el = document.createElement('div');
    const { width, height } = bindDimensions(el);
    expect(typeof width).toBe('function');
    expect(typeof height).toBe('function');
  });
});
