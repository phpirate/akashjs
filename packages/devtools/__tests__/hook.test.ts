import { describe, it, expect } from 'vitest';
import {
  createDevToolsHook,
  trackComponent,
  untrackComponent,
  trackSignal,
  updateTrackedSignal,
  recordEvent,
  nextComponentId,
} from '../src/hook.js';

describe('createDevToolsHook', () => {
  it('creates a hook with version', () => {
    const hook = createDevToolsHook();
    expect(hook.version).toBe('0.1.0');
    expect(hook.connected).toBe(false);
  });

  it('starts with empty collections', () => {
    const hook = createDevToolsHook();
    expect(hook.components.size).toBe(0);
    expect(hook.signals.size).toBe(0);
    expect(hook.events).toHaveLength(0);
  });
});

describe('trackComponent', () => {
  it('registers a component', () => {
    const hook = createDevToolsHook();
    trackComponent(hook, 'c-1', 'Counter', { initial: 0 }, null);

    expect(hook.components.size).toBe(1);
    expect(hook.components.get('c-1')!.name).toBe('Counter');
  });

  it('records a mount event', () => {
    const hook = createDevToolsHook();
    trackComponent(hook, 'c-1', 'Counter', {}, null);

    expect(hook.events).toHaveLength(1);
    expect(hook.events[0].type).toBe('component-mount');
  });

  it('links child to parent', () => {
    const hook = createDevToolsHook();
    trackComponent(hook, 'c-1', 'App', {}, null);
    trackComponent(hook, 'c-2', 'Counter', {}, 'c-1');

    expect(hook.components.get('c-1')!.children).toContain('c-2');
  });
});

describe('untrackComponent', () => {
  it('removes a component', () => {
    const hook = createDevToolsHook();
    trackComponent(hook, 'c-1', 'Counter', {}, null);
    untrackComponent(hook, 'c-1');

    expect(hook.components.size).toBe(0);
  });

  it('records an unmount event', () => {
    const hook = createDevToolsHook();
    trackComponent(hook, 'c-1', 'Counter', {}, null);
    untrackComponent(hook, 'c-1');

    const unmountEvents = hook.events.filter((e) => e.type === 'component-unmount');
    expect(unmountEvents).toHaveLength(1);
  });

  it('removes child from parent', () => {
    const hook = createDevToolsHook();
    trackComponent(hook, 'c-1', 'App', {}, null);
    trackComponent(hook, 'c-2', 'Child', {}, 'c-1');
    untrackComponent(hook, 'c-2');

    expect(hook.components.get('c-1')!.children).not.toContain('c-2');
  });
});

describe('trackSignal', () => {
  it('registers a signal', () => {
    const hook = createDevToolsHook();
    const id = trackSignal(hook, 42, 'count');

    expect(hook.signals.size).toBe(1);
    expect(hook.signals.get(id)!.value).toBe(42);
    expect(hook.signals.get(id)!.label).toBe('count');
  });

  it('returns unique IDs', () => {
    const hook = createDevToolsHook();
    const id1 = trackSignal(hook, 1);
    const id2 = trackSignal(hook, 2);
    expect(id1).not.toBe(id2);
  });
});

describe('updateTrackedSignal', () => {
  it('updates value and subscriber count', () => {
    const hook = createDevToolsHook();
    const id = trackSignal(hook, 0, 'count');

    updateTrackedSignal(hook, id, 5, 3);
    expect(hook.signals.get(id)!.value).toBe(5);
    expect(hook.signals.get(id)!.subscriberCount).toBe(3);
  });

  it('records a signal-update event', () => {
    const hook = createDevToolsHook();
    const id = trackSignal(hook, 0);
    updateTrackedSignal(hook, id, 1, 0);

    const updateEvents = hook.events.filter((e) => e.type === 'signal-update');
    expect(updateEvents.length).toBeGreaterThan(0);
  });
});

describe('getComponentTree', () => {
  it('builds a tree from flat components', () => {
    const hook = createDevToolsHook();
    trackComponent(hook, 'c-1', 'App', {}, null);
    trackComponent(hook, 'c-2', 'Header', {}, 'c-1');
    trackComponent(hook, 'c-3', 'Footer', {}, 'c-1');

    const tree = hook.getComponentTree();
    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe('App');
    expect(tree[0].children).toHaveLength(2);
  });
});

describe('getSignals', () => {
  it('returns signal snapshots', () => {
    const hook = createDevToolsHook();
    trackSignal(hook, 42, 'count');
    trackSignal(hook, 'hello', 'name');

    const signals = hook.getSignals();
    expect(signals).toHaveLength(2);
    expect(signals.some((s) => s.value === 42)).toBe(true);
    expect(signals.some((s) => s.value === 'hello')).toBe(true);
  });
});

describe('getEvents', () => {
  it('returns all events', () => {
    const hook = createDevToolsHook();
    trackComponent(hook, 'c-1', 'A', {}, null);
    trackComponent(hook, 'c-2', 'B', {}, null);

    expect(hook.getEvents()).toHaveLength(2);
  });

  it('filters events by timestamp', () => {
    const hook = createDevToolsHook();
    trackComponent(hook, 'c-1', 'A', {}, null);

    const since = performance.now();
    trackComponent(hook, 'c-2', 'B', {}, null);

    const recent = hook.getEvents(since);
    expect(recent).toHaveLength(1);
  });
});

describe('event limit', () => {
  it('evicts old events when maxEvents is reached', () => {
    const hook = createDevToolsHook();
    hook.maxEvents = 3;

    for (let i = 0; i < 5; i++) {
      recordEvent(hook, { type: 'signal-update', data: { i } });
    }

    expect(hook.events).toHaveLength(3);
  });
});

describe('nextComponentId', () => {
  it('returns unique IDs', () => {
    const a = nextComponentId();
    const b = nextComponentId();
    expect(a).not.toBe(b);
    expect(a).toContain('akash-c-');
  });
});
