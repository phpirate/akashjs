# @akashjs/devtools API

## installDevTools()

Install the devtools hook on `window.__AKASH_DEVTOOLS__`. Call in dev mode.

```ts
import { installDevTools } from '@akashjs/devtools';

if (import.meta.env.DEV) {
  installDevTools();
}
```

## createDevToolsHook()

Create a devtools hook instance (called internally by `installDevTools`).

```ts
function createDevToolsHook(): DevToolsHook;

interface DevToolsHook {
  version: string;
  connected: boolean;
  components: Map<string, ComponentInfo>;
  signals: Map<number, SignalInfo>;
  events: DevToolsEvent[];
  getComponentTree(): ComponentTreeNode[];
  getSignals(): SignalSnapshot[];
  getEvents(since?: number): DevToolsEvent[];
}
```

## Component Tracking

### trackComponent(hook, id, name, props, parentId)

Register a component in the devtools.

```ts
function trackComponent(
  hook: DevToolsHook,
  id: string,
  name: string,
  props: Record<string, unknown>,
  parentId: string | null,
): void;
```

### untrackComponent(hook, id)

Remove a component from devtools tracking.

```ts
function untrackComponent(hook: DevToolsHook, id: string): void;
```

## Signal Tracking

### trackSignal(hook, value, label?, componentId?)

Register a signal for inspection. Returns a tracking ID.

```ts
function trackSignal(
  hook: DevToolsHook,
  value: unknown,
  label?: string,
  componentId?: string,
): number;
```

### updateTrackedSignal(hook, id, value, subscriberCount)

Update a tracked signal's value and subscriber count.

```ts
function updateTrackedSignal(
  hook: DevToolsHook,
  id: number,
  value: unknown,
  subscriberCount: number,
): void;
```

## Events

### recordEvent(hook, event)

Record a devtools event for the performance timeline.

```ts
function recordEvent(hook: DevToolsHook, event: {
  type: 'signal-update' | 'effect-run' | 'component-mount' | 'component-unmount';
  data: Record<string, unknown>;
}): void;
```

Events are capped at `hook.maxEvents` (default: 1000). Oldest events are evicted.

## Types

### ComponentTreeNode

```ts
interface ComponentTreeNode {
  id: string;
  name: string;
  props: Record<string, unknown>;
  children: ComponentTreeNode[];
}
```

### SignalSnapshot

```ts
interface SignalSnapshot {
  id: number;
  label?: string;
  value: unknown;
  subscriberCount: number;
}
```

### DevToolsEvent

```ts
interface DevToolsEvent {
  type: 'signal-update' | 'effect-run' | 'component-mount' | 'component-unmount';
  timestamp: number;
  data: Record<string, unknown>;
}
```

## Utilities

### nextComponentId()

Generate a unique component ID string.

```ts
function nextComponentId(): string; // 'akash-c-1', 'akash-c-2', ...
```
