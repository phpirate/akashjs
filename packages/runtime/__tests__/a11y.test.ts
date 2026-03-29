/** @vitest-environment happy-dom */
import { describe, it, expect, vi } from 'vitest';
import { useFocusTrap, useAnnounce, useKeyboard } from '../src/a11y.js';

describe('useFocusTrap', () => {
  it('creates a trap with activate/deactivate and active() signal reflects state', () => {
    const container = document.createElement('div');
    const btn = document.createElement('button');
    container.appendChild(btn);
    document.body.appendChild(container);

    const trap = useFocusTrap(container);

    expect(trap.active()).toBe(false);

    trap.activate();
    expect(trap.active()).toBe(true);

    trap.deactivate();
    expect(trap.active()).toBe(false);

    document.body.removeChild(container);
  });
});

describe('useAnnounce', () => {
  it('returns a function', () => {
    const announce = useAnnounce();
    expect(typeof announce).toBe('function');
  });

  it('calling it creates/updates aria-live region in DOM', () => {
    const announce = useAnnounce();
    announce('Hello screen reader');

    const region = document.querySelector('[aria-live]');
    expect(region).not.toBeNull();
    expect(region!.getAttribute('aria-live')).toBe('polite');
  });
});

describe('useKeyboard', () => {
  it('bind registers a shortcut and dispose removes the listener', () => {
    const kb = useKeyboard();
    const handler = vi.fn();
    const dispose = kb.bind('Escape', handler, { description: 'Close' });

    expect(kb.getBindings()).toHaveLength(1);

    dispose();
    expect(kb.getBindings()).toHaveLength(0);
  });

  it('getBindings returns the list of registered bindings', () => {
    const kb = useKeyboard();
    kb.bind('mod+k', () => {}, { description: 'Search' });
    kb.bind('mod+s', () => {}, { description: 'Save' });

    const bindings = kb.getBindings();
    expect(bindings).toHaveLength(2);
    expect(bindings[0].description).toBe('Search');
    expect(bindings[1].description).toBe('Save');

    kb.dispose();
  });

  it('enableScope/disableScope works', () => {
    const kb = useKeyboard();
    const handler = vi.fn();
    kb.bind('Escape', handler, { scope: 'modal' });

    // Scope not enabled — simulate keydown, handler should not fire
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    document.dispatchEvent(event);
    expect(handler).not.toHaveBeenCalled();

    // Enable scope
    kb.enableScope('modal');
    const event2 = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    document.dispatchEvent(event2);
    expect(handler).toHaveBeenCalledTimes(1);

    // Disable scope
    kb.disableScope('modal');
    const event3 = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    document.dispatchEvent(event3);
    expect(handler).toHaveBeenCalledTimes(1);

    kb.dispose();
  });

  it('formatKeyCombo shows platform-appropriate labels in getBindings', () => {
    const kb = useKeyboard();
    kb.bind('mod+k', () => {}, { description: 'Search' });

    const bindings = kb.getBindings();
    // In happy-dom, navigator.platform may or may not include 'Mac'
    // Just verify the key is formatted (not raw 'mod+k')
    const key = bindings[0].key;
    expect(key).toBeDefined();
    // Should have replaced 'mod' with either Ctrl or the mac symbol
    expect(key).not.toBe('mod+k');

    kb.dispose();
  });
});
