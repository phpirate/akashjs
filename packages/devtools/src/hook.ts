/**
 * DevTools runtime hook.
 *
 * Exposes `window.__AKASH_DEVTOOLS__` in dev mode for the browser
 * extension to connect to. Provides component tree inspection,
 * signal value reading, and performance timeline data.
 */

// --- Types ---

export interface DevToolsHook {
  /** Framework version */
  version: string;
  /** Whether devtools are connected */
  connected: boolean;
  /** Registered components */
  components: Map<string, ComponentInfo>;
  /** Registered signals */
  signals: Map<number, SignalInfo>;
  /** Event log for performance timeline */
  events: DevToolsEvent[];
  /** Max events to keep */
  maxEvents: number;

  // --- Methods for the extension to call ---
  /** Get the component tree */
  getComponentTree(): ComponentTreeNode[];
  /** Get all signal values */
  getSignals(): SignalSnapshot[];
  /** Get recent events */
  getEvents(since?: number): DevToolsEvent[];
  /** Trigger a signal update (for debugging) */
  setSignal(id: number, value: unknown): void;
}

export interface ComponentInfo {
  id: string;
  name: string;
  props: Record<string, unknown>;
  parent: string | null;
  children: string[];
  mountedAt: number;
}

export interface ComponentTreeNode {
  id: string;
  name: string;
  props: Record<string, unknown>;
  children: ComponentTreeNode[];
}

export interface SignalInfo {
  id: number;
  label?: string;
  value: unknown;
  subscriberCount: number;
  componentId?: string;
}

export interface SignalSnapshot {
  id: number;
  label?: string;
  value: unknown;
  subscriberCount: number;
}

export interface DevToolsEvent {
  type: 'signal-update' | 'effect-run' | 'component-mount' | 'component-unmount';
  timestamp: number;
  data: Record<string, unknown>;
}

// --- Hook implementation ---

let signalIdCounter = 0;

export function createDevToolsHook(): DevToolsHook {
  const hook: DevToolsHook = {
    version: '0.1.0',
    connected: false,
    components: new Map(),
    signals: new Map(),
    events: [],
    maxEvents: 1000,

    getComponentTree(): ComponentTreeNode[] {
      // Build tree from flat map
      const roots: ComponentTreeNode[] = [];
      const nodeMap = new Map<string, ComponentTreeNode>();

      for (const [id, info] of hook.components) {
        nodeMap.set(id, {
          id,
          name: info.name,
          props: info.props,
          children: [],
        });
      }

      for (const [id, info] of hook.components) {
        const node = nodeMap.get(id)!;
        if (info.parent && nodeMap.has(info.parent)) {
          nodeMap.get(info.parent)!.children.push(node);
        } else {
          roots.push(node);
        }
      }

      return roots;
    },

    getSignals(): SignalSnapshot[] {
      return Array.from(hook.signals.values()).map((s) => ({
        id: s.id,
        label: s.label,
        value: s.value,
        subscriberCount: s.subscriberCount,
      }));
    },

    getEvents(since?: number): DevToolsEvent[] {
      if (since === undefined) return hook.events;
      return hook.events.filter((e) => e.timestamp >= since);
    },

    setSignal(_id: number, _value: unknown): void {
      // Will be connected to actual signal.set() via the runtime integration
    },
  };

  return hook;
}

// --- Event recording ---

export function recordEvent(hook: DevToolsHook, event: Omit<DevToolsEvent, 'timestamp'>): void {
  if (hook.events.length >= hook.maxEvents) {
    hook.events.shift();
  }
  hook.events.push({ ...event, timestamp: performance.now() });
}

// --- Component tracking ---

export function trackComponent(
  hook: DevToolsHook,
  id: string,
  name: string,
  props: Record<string, unknown>,
  parentId: string | null,
): void {
  hook.components.set(id, {
    id,
    name,
    props,
    parent: parentId,
    children: [],
    mountedAt: performance.now(),
  });

  if (parentId && hook.components.has(parentId)) {
    hook.components.get(parentId)!.children.push(id);
  }

  recordEvent(hook, {
    type: 'component-mount',
    data: { id, name },
  });
}

export function untrackComponent(hook: DevToolsHook, id: string): void {
  const info = hook.components.get(id);
  if (info?.parent && hook.components.has(info.parent)) {
    const parent = hook.components.get(info.parent)!;
    parent.children = parent.children.filter((c) => c !== id);
  }
  hook.components.delete(id);

  recordEvent(hook, {
    type: 'component-unmount',
    data: { id },
  });
}

// --- Signal tracking ---

export function trackSignal(
  hook: DevToolsHook,
  value: unknown,
  label?: string,
  componentId?: string,
): number {
  const id = ++signalIdCounter;
  hook.signals.set(id, {
    id,
    label,
    value,
    subscriberCount: 0,
    componentId,
  });
  return id;
}

export function updateTrackedSignal(
  hook: DevToolsHook,
  id: number,
  value: unknown,
  subscriberCount: number,
): void {
  const info = hook.signals.get(id);
  if (info) {
    info.value = value;
    info.subscriberCount = subscriberCount;
  }

  recordEvent(hook, {
    type: 'signal-update',
    data: { id, value },
  });
}

// --- Allocation ID ---

let componentIdCounter = 0;
export function nextComponentId(): string {
  return `akash-c-${++componentIdCounter}`;
}
