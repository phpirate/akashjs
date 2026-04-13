# State Management

AkashJS includes a built-in store system powered by signals. No external state management library needed — `defineStore()` gives you shared state, derived getters, and actions out of the box.

## Defining a Store

A store has three parts: **state** (reactive values), **getters** (derived computations), and **actions** (methods that mutate state).

```ts
import { defineStore } from '@akashjs/runtime';

const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0,
    name: 'My Counter',
  }),
  getters: {
    doubled: (state) => state.count() * 2,
    label: (state) => `${state.name()}: ${state.count()}`,
  },
  actions: {
    increment() {
      this.count.update((c) => c + 1);
    },
    decrement() {
      this.count.update((c) => c - 1);
    },
    setName(name: string) {
      this.name.set(name);
    },
  },
});
```

`defineStore()` returns a composable function. Calling it always returns the same singleton instance — state is shared across your entire app.

## Using Stores in Components

Call the composable inside your component to get the store. State properties are signals, getters are computed signals, and actions are plain functions.

```ts
import { defineComponent } from '@akashjs/runtime';

const Counter = defineComponent((ctx) => {
  const counter = useCounterStore();

  return () => (
    <div>
      <p>{counter.label()}</p>
      <button on:click={counter.increment}>+</button>
      <button on:click={counter.decrement}>-</button>
    </div>
  );
});
```

Because state properties are signals, reads inside the render function automatically track dependencies. Only the DOM nodes that depend on changed state will update.

## State

The `state` option is a factory function that returns your initial values. Each property becomes a `Signal` on the store instance.

```ts
const store = useCounterStore();

// Read state (call the signal)
store.count();    // 0
store.name();     // 'My Counter'

// Write state
store.count.set(10);
store.name.set('Updated');

// Update from previous value
store.count.update((c) => c + 1);
```

## Getters

Getters are computed signals derived from state. They receive the signalified state object and return a derived value.

```ts
const useTodoStore = defineStore('todos', {
  state: () => ({
    todos: [] as { text: string; done: boolean }[],
  }),
  getters: {
    completed: (state) => state.todos().filter((t) => t.done),
    remaining: (state) => state.todos().filter((t) => !t.done),
    count: (state) => state.todos().length,
  },
  actions: {
    add(text: string) {
      this.todos.update((list) => [...list, { text, done: false }]);
    },
  },
});
```

Getters recompute lazily — only when their dependencies change and something reads them.

## Actions

Actions are methods that mutate state. Inside an action, `this` refers to the store's state signals.

```ts
const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as { name: string } | null,
    token: '',
  }),
  getters: {
    isLoggedIn: (state) => state.user() !== null,
  },
  actions: {
    login(user: { name: string }, token: string) {
      this.user.set(user);
      this.token.set(token);
    },
    logout() {
      this.user.set(null);
      this.token.set('');
    },
  },
});
```

## $reset

Reset all state back to its initial values:

```ts
const store = useCounterStore();
store.count.set(99);
store.count();   // 99

store.$reset();
store.count();   // 0
store.name();    // 'My Counter'
```

This calls the `state()` factory again and sets every signal to the fresh value.

## $patch

Merge partial state into the store. Only the specified keys are updated — other state is untouched:

```ts
const store = useCounterStore();

store.$patch({ count: 10, name: 'Updated' });
store.count();  // 10
store.name();   // 'Updated'
```

`$patch` calls `.set()` on each signal internally, so all updates are batched into a single flush.

## $snapshot

Get a plain JavaScript object of the current state (no signals, just values):

```ts
const store = useCounterStore();
store.count.set(5);

const snap = store.$snapshot();
// { count: 5, name: 'My Counter' }

// Useful for logging, serialization, or sending to an API
console.log(JSON.stringify(snap));
```

## $subscribe

Listen to all state changes in a store. The callback fires only when state actually changes — not on initial subscription:

```ts
const store = useCounterStore();

const unsubscribe = store.$subscribe((state) => {
  console.log('State changed:', state);
});
// (no log yet — callback is not called on subscribe)

store.count.set(1);
// Logs: State changed: { count: 1, name: 'My Counter' }

store.increment();
// Logs: State changed: { count: 2, name: 'My Counter' }

// Stop listening
unsubscribe();
```

The internal effect is automatically disposed when all subscribers unsubscribe.

## Multiple Stores

Split your state into domain-specific stores. Each store is independent and identified by its string ID.

```ts
const useUserStore = defineStore('user', {
  state: () => ({ name: '', email: '' }),
  actions: {
    setUser(name: string, email: string) {
      this.name.set(name);
      this.email.set(email);
    },
  },
});

const useCartStore = defineStore('cart', {
  state: () => ({
    items: [] as { id: string; qty: number }[],
  }),
  getters: {
    totalItems: (state) => state.items().reduce((sum, i) => sum + i.qty, 0),
  },
  actions: {
    addItem(id: string) {
      this.items.update((list) => {
        const existing = list.find((i) => i.id === id);
        if (existing) {
          return list.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i));
        }
        return [...list, { id, qty: 1 }];
      });
    },
  },
});
```

Use them together in a component:

```ts
const Checkout = defineComponent((ctx) => {
  const user = useUserStore();
  const cart = useCartStore();

  return () => (
    <div>
      <p>Hi {user.name()}, you have {cart.totalItems()} items.</p>
    </div>
  );
});
```

## Testing Stores

Stores are singletons, so you need to clear them between tests to avoid shared state. Use `clearStores()` from `@akashjs/runtime`.

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { clearStores } from '@akashjs/runtime';

beforeEach(() => {
  clearStores();
});

it('starts at zero', () => {
  const store = useCounterStore();
  expect(store.count()).toBe(0);
});

it('increments', () => {
  const store = useCounterStore();
  store.increment();
  expect(store.count()).toBe(1);
  expect(store.doubled()).toBe(2);
});

it('resets', () => {
  const store = useCounterStore();
  store.count.set(50);
  store.$reset();
  expect(store.count()).toBe(0);
});

it('snapshots', () => {
  const store = useCounterStore();
  store.count.set(7);
  expect(store.$snapshot()).toEqual({ count: 7, name: 'My Counter' });
});
```

## Store Plugins

Extend all stores with shared behavior using plugins. A plugin is an object with `init` and/or `onAction` hooks.

```ts
import { configureStores } from '@akashjs/runtime';

configureStores({
  plugins: [
    {
      init(store) {
        // Called when a store is first created
        console.log(`Store "${store.$id}" initialized`);
      },
      onAction(store, name, args) {
        console.log(`Action "${name}" called on "${store.$id}" with`, args);
      },
    },
  ],
});
```

**Plugin interface:**

| Hook | Description |
|---|---|
| `init(store)` | Called once when the store is first instantiated. Use it to add properties, subscribe, or set up side effects. |
| `onAction(store, name, args)` | Called before every action executes. Receives the store instance, action name, and arguments array. |

## Persistence

Stores can automatically persist state to `localStorage` or `sessionStorage` using the `persist` option.

### Basic persistence

Set `persist: true` to save all state to `localStorage` under the store's ID:

```ts
const useSettingsStore = defineStore('settings', {
  state: () => ({
    theme: 'light',
    locale: 'en',
  }),
  persist: true,
});
```

State is hydrated from storage when the store is first created. If stored data exists, it overwrites the factory defaults.

### Selective persistence

Pick which keys to persist, change the storage key, or use `sessionStorage`:

```ts
const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as { name: string } | null,
    token: '',
    loginAttempts: 0,
  }),
  persist: {
    pick: ['user', 'token'],
    key: 'my-auth',
    storage: 'sessionStorage',
  },
});
```

Only `user` and `token` are saved. `loginAttempts` is always fresh on reload.

### Multiple targets

Persist different keys to different storage backends:

```ts
const useAppStore = defineStore('app', {
  state: () => ({
    preferences: { theme: 'dark' },
    session: { tabId: '' },
  }),
  persist: [
    { pick: ['preferences'], storage: 'localStorage' },
    { pick: ['session'], storage: 'sessionStorage' },
  ],
});
```

### Cross-tab sync

Persisted stores automatically listen to `storage` events. When another tab writes to the same key, the store updates in real time — no extra configuration needed.

## Real-time Sync

The `sync` option connects a store to other clients over a real-time transport, enabling collaborative and multiplayer state.

### Basic setup

```ts
import { defineStore } from '@akashjs/runtime';
import { createWebSocketTransport } from '@akashjs/runtime';

const wsTransport = createWebSocketTransport('wss://sync.example.com');

const useTodoStore = defineStore('todos', {
  state: () => ({
    items: [] as { text: string; done: boolean }[],
  }),
  actions: {
    add(text: string) {
      this.items.update((list) => [...list, { text, done: false }]);
    },
    toggle(index: number) {
      this.items.update((list) =>
        list.map((t, i) => (i === index ? { ...t, done: !t.done } : t)),
      );
    },
  },
  sync: {
    transport: wsTransport,
    room: 'project-42',
    presence: true,
  },
});
```

All mutations are broadcast to peers in the same room. Incoming changes merge into local state automatically.

### Presence and peer info

When `presence: true` is set, the store exposes sync metadata through `$sync`:

```ts
const store = useTodoStore();

store.$sync.connected();        // true | false
store.$sync.peers();            // ['peer-a', 'peer-b']
store.$sync.presence;           // signal — your own presence data
store.$sync.peerPresence();     // Map { 'peer-a' => { cursor: 3 }, ... }

// Set your own presence
store.$sync.presence.set({ cursor: 5 });
```

### Offline + sync

Combine `persist` and `sync` for offline-first apps. State saves locally so the app works without a connection, then syncs when the transport reconnects:

```ts
const useDocStore = defineStore('doc', {
  state: () => ({ blocks: [] as string[] }),
  persist: true,
  sync: {
    transport: createWebSocketTransport('wss://sync.example.com'),
    room: 'doc-1',
  },
});
```

## TypeScript

Actions have full `this` typing out of the box. Inside any action, `this` is typed as the union of state signals, getters, and other actions — powered by `ThisType`. No manual annotations needed:

```ts
const useStore = defineStore('example', {
  state: () => ({ count: 0, label: '' }),
  getters: {
    summary: (state) => `${state.label()}: ${state.count()}`,
  },
  actions: {
    reset() {
      this.count.set(0);    // Signal<number>
      this.label.set('');   // Signal<string>
      this.summary();       // string (getter)
      this.bump();          // other action
    },
    bump() {
      this.count.update((c) => c + 1);
    },
  },
});
```
