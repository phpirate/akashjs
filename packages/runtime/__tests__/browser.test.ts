/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useStorage, useOnline, useClickOutside } from '../src/browser.js';
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

describe('useClickOutside', () => {
  it('calls handler when clicking outside the target', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    let called = false;
    const dispose = useClickOutside(target, () => { called = true; });

    // Click outside
    document.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(called).toBe(true);

    dispose();
    target.remove();
  });

  it('does not call handler when clicking inside the target', () => {
    const target = document.createElement('div');
    const child = document.createElement('span');
    target.appendChild(child);
    document.body.appendChild(target);

    let called = false;
    const dispose = useClickOutside(target, () => { called = true; });

    // Click inside
    child.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(called).toBe(false);

    dispose();
    target.remove();
  });

  it('returns a dispose function that removes the listener', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    let callCount = 0;
    const dispose = useClickOutside(target, () => { callCount++; });

    document.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(callCount).toBe(1);

    dispose();

    document.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(callCount).toBe(1); // not called again

    target.remove();
  });

  it('ignores clicks on elements matching ignore selectors', () => {
    const target = document.createElement('div');
    const trigger = document.createElement('button');
    trigger.className = 'trigger';
    document.body.appendChild(target);
    document.body.appendChild(trigger);

    let called = false;
    const dispose = useClickOutside(target, () => { called = true; }, {
      ignore: ['.trigger'],
    });

    trigger.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(called).toBe(false);

    dispose();
    target.remove();
    trigger.remove();
  });

  it('accepts a function target', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    let called = false;
    const dispose = useClickOutside(() => target, () => { called = true; });

    document.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(called).toBe(true);

    dispose();
    target.remove();
  });
});
