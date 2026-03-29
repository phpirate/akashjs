# Watch

AkashJS provides `watch()` and related utilities for observing reactive values with fine-grained control over timing, frequency, and structure. While `effect()` is great for simple side-effects, `watch()` gives you access to old and new values, one-time execution, debouncing, and more.

## watch() vs effect()

Use `effect()` when you want to run code whenever **any** tracked dependency changes and you don't need the previous value. Use `watch()` when you need:

- Access to old and new values
- To watch a specific source (not auto-tracked)
- One-time or debounced execution
- Explicit control over when watching starts

```ts
import { signal, effect } from '@akashjs/runtime';
import { watch } from '@akashjs/runtime';

const count = signal(0);

// effect — auto-tracks, no old value
effect(() => {
  console.log(`Count is ${count()}`);
});

// watch — explicit source, old + new
watch(count, (newVal, oldVal) => {
  console.log(`Count changed from ${oldVal} to ${newVal}`);
});
```

## Basic watch

`watch()` takes a source signal (or getter function) and a callback that receives the new and old values. It returns a dispose function.

```ts
import { signal } from '@akashjs/runtime';
import { watch } from '@akashjs/runtime';

const name = signal('Alice');

const stop = watch(name, (newName, oldName) => {
  console.log(`Name changed: ${oldName} -> ${newName}`);
});

name.set('Bob');
// Logs: "Name changed: Alice -> Bob"

stop(); // stop watching
```

You can also pass a getter function as the source:

```ts
const first = signal('Alice');
const last = signal('Smith');

watch(
  () => `${first()} ${last()}`,
  (newFull, oldFull) => {
    console.log(`Full name: ${oldFull} -> ${newFull}`);
  },
);
```

## Immediate option

By default, `watch()` only fires on changes after setup. Pass `immediate: true` to run the callback immediately with the current value.

```ts
const theme = signal('light');

watch(theme, (newTheme) => {
  document.body.className = newTheme;
}, { immediate: true });
// Runs immediately with "light", then on every change
```

## Once option

Pass `once: true` to automatically dispose the watcher after the first change.

```ts
const status = signal('pending');

watch(status, (newStatus) => {
  console.log(`Status resolved to: ${newStatus}`);
}, { once: true });

status.set('complete');
// Logs once, then watcher is disposed
status.set('archived');
// No log — watcher already stopped
```

## watchOnce

A convenience shorthand for `watch(source, cb, { once: true })`.

```ts
import { watchOnce } from '@akashjs/runtime';

const ready = signal(false);

watchOnce(ready, (isReady) => {
  if (isReady) bootstrap();
});
```

## watchDebounced

`watchDebounced()` delays the callback until the source stops changing for a given number of milliseconds. Ideal for search inputs.

```ts
import { signal } from '@akashjs/runtime';
import { watchDebounced } from '@akashjs/runtime';

const query = signal('');

watchDebounced(query, async (search) => {
  const results = await api.search(search);
  hits.set(results);
}, { wait: 300 });
```

Options:

| Option | Type | Default | Description |
|---|---|---|---|
| `wait` | `number` | `250` | Debounce delay in ms |
| `immediate` | `boolean` | `false` | Run callback immediately on setup |
| `maxWait` | `number` | `undefined` | Maximum time to wait before forcing a call |

## Watching multiple sources

Pass an array of sources to watch several signals at once. The callback receives arrays of new and old values.

```ts
import { signal } from '@akashjs/runtime';
import { watch } from '@akashjs/runtime';

const lat = signal(0);
const lng = signal(0);

watch([lat, lng], ([newLat, newLng], [oldLat, oldLng]) => {
  console.log(`Moved from (${oldLat}, ${oldLng}) to (${newLat}, ${newLng})`);
});
```

## Deep watching

By default, `watch()` compares values by reference. For objects and arrays, pass `deep: true` to detect nested changes.

```ts
const filters = signal({ status: 'active', page: 1 });

watch(filters, (newFilters, oldFilters) => {
  console.log('Filters changed', newFilters);
}, { deep: true });

filters.update(f => ({ ...f, page: 2 }));
// Fires because deep comparison detects the change
```

## deepSignal()

For deeply nested reactive objects, `deepSignal()` wraps an entire object tree so every property — at any depth — is reactive.

```ts
import { deepSignal } from '@akashjs/runtime';

const state = deepSignal({
  user: {
    name: 'Alice',
    prefs: { theme: 'dark', lang: 'en' },
  },
  items: [1, 2, 3],
});

// Read nested properties reactively
effect(() => {
  console.log(state.user.prefs.theme);
});

// Write nested properties directly
state.user.prefs.theme = 'light';
// Effect re-runs: "light"
```

### $raw and toRaw

Access the underlying plain object without creating reactive proxies:

```ts
import { deepSignal, toRaw } from '@akashjs/runtime';

const state = deepSignal({ count: 0, nested: { x: 1 } });

// $raw gives the unwrapped snapshot at that level
console.log(state.$raw); // { count: 0, nested: { x: 1 } }

// toRaw() fully unwraps a deep signal at any depth
const plain = toRaw(state.nested);
console.log(plain); // { x: 1 } — plain object, not reactive
```

### isDeepSignal

Check whether a value is a deep signal proxy:

```ts
import { deepSignal, isDeepSignal } from '@akashjs/runtime';

const state = deepSignal({ x: 1 });

isDeepSignal(state);   // true
isDeepSignal({ x: 1 }); // false
```

## Event Bus

`createEventBus()` provides a lightweight, typed publish/subscribe system for decoupled communication between parts of your application.

```ts
import { createEventBus } from '@akashjs/runtime';

interface Events {
  'user:login': { id: string; name: string };
  'user:logout': void;
  'cart:update': { itemCount: number };
}

const bus = createEventBus<Events>();
```

### on / emit

Subscribe to events with `on()`, which returns an unsubscribe function. Emit events with `emit()`.

```ts
const unsub = bus.on('user:login', (user) => {
  console.log(`Welcome, ${user.name}`);
});

bus.emit('user:login', { id: '1', name: 'Alice' });
// Logs: "Welcome, Alice"

unsub(); // stop listening
```

### once

Listen for a single occurrence of an event, then automatically unsubscribe.

```ts
bus.once('user:login', (user) => {
  analytics.track('first_login', user);
});
```

### off

Remove a specific handler:

```ts
function handler(user: Events['user:login']) {
  console.log(user.name);
}

bus.on('user:login', handler);
bus.off('user:login', handler);
```

### clear

Remove all listeners for a specific event, or all listeners entirely:

```ts
bus.clear('user:login'); // clear listeners for one event
bus.clear();             // clear all listeners
```

### globalEventBus

A pre-created, untyped event bus available anywhere in your app for quick prototyping or simple use cases.

```ts
import { globalEventBus } from '@akashjs/runtime';

globalEventBus.on('notify', (msg) => {
  showToast(msg);
});

// Somewhere else
globalEventBus.emit('notify', 'Item saved!');
```

For production apps, prefer creating typed event buses with `createEventBus<Events>()` to get full type safety.
