# Offline First

AkashJS includes `createOfflineStore()` — a reactive, IndexedDB-backed store that works offline by default. Data is stored locally first, then synced to your server when a connection is available. Your app never breaks because of a bad network.

## Why Offline-First Matters

Traditional apps fail when the network drops. Offline-first apps do not — they write to local storage immediately and sync later. Users get instant feedback, data is never lost, and your app works on airplanes, in tunnels, and on spotty mobile connections.

## Setup

```ts
import { createOfflineStore } from '@akashjs/offline';

interface Todo {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
}

const todos = createOfflineStore<Todo>('todos', {
  keyPath: 'id',
  syncURL: '/api/todos',
  syncInterval: 30_000,     // sync every 30 seconds
  conflictStrategy: 'last-write-wins',
});
```

| Option | Description |
|---|---|
| `keyPath` | The property used as the unique key. Defaults to `'id'`. |
| `syncURL` | Server endpoint for background sync. Optional — omit for local-only storage. |
| `syncInterval` | Milliseconds between sync attempts. Defaults to `30000`. |
| `conflictStrategy` | How to resolve conflicts: `'last-write-wins'`, `'client-wins'`, or `'server-wins'`. |

## CRUD Operations

All operations write to IndexedDB immediately and return synchronously. Changes are queued for server sync.

### add()

Insert a new item:

```ts
await todos.add({
  id: crypto.randomUUID(),
  title: 'Buy groceries',
  done: false,
  createdAt: Date.now(),
});
```

### put()

Insert or replace an item by its key:

```ts
await todos.put({
  id: 'abc-123',
  title: 'Buy groceries (updated)',
  done: false,
  createdAt: Date.now(),
});
```

### update()

Partially update an existing item:

```ts
await todos.update('abc-123', { done: true });
```

### remove()

Delete an item by key:

```ts
await todos.remove('abc-123');
```

### clear()

Remove all items from the store:

```ts
await todos.clear();
```

## Reactive Items

`items()` is a reactive signal containing all items in the store. Use it in components and it updates automatically when data changes.

```ts
import { defineComponent } from '@akashjs/runtime';

const TodoList = defineComponent((ctx) => {
  return () => (
    <ul>
      {todos.items().map((todo) => (
        <li class={todo.done ? 'done' : ''}>
          {todo.title}
        </li>
      ))}
    </ul>
  );
});
```

You can also query a single item:

```ts
const item = todos.get('abc-123');
item();  // { id: 'abc-123', title: '...', ... } or undefined
```

## Pending Changes Queue

When offline, changes accumulate in a queue. You can inspect the queue to show sync status to users.

```ts
// Number of unsynced changes
todos.pending();  // 3

// Whether a sync is currently in progress
todos.syncing();  // true | false
```

Show sync status in your UI:

```ts
const SyncStatus = defineComponent((ctx) => {
  return () => {
    const count = todos.pending();
    const active = todos.syncing();

    if (active) return <span>Syncing...</span>;
    if (count > 0) return <span>{count} changes pending</span>;
    return <span>All synced</span>;
  };
});
```

## Online/Offline Detection

The store automatically detects network status and pauses/resumes sync accordingly.

```ts
// Reactive signal — true when the browser is online
todos.online();  // true | false

// Manual control
todos.pauseSync();
todos.resumeSync();

// Force an immediate sync attempt
await todos.sync();
```

## Background Sync Configuration

Fine-tune how syncing behaves:

```ts
const store = createOfflineStore<Item>('items', {
  syncURL: '/api/items',
  syncInterval: 10_000,
  batchSize: 50,           // send up to 50 changes per sync
  retryDelay: 5_000,       // wait 5s before retrying failed syncs
  maxRetries: 5,           // give up after 5 consecutive failures
  headers: () => ({
    Authorization: `Bearer ${getToken()}`,
  }),
});
```

The `headers` option accepts a function, so you can dynamically include auth tokens.

## Conflict Strategies

When the same item is modified both locally and on the server, the `conflictStrategy` determines which version wins.

### last-write-wins (default)

The most recent write (by timestamp) wins, regardless of whether it came from the client or server.

```ts
createOfflineStore<Item>('items', {
  conflictStrategy: 'last-write-wins',
});
```

### client-wins

Local changes always take priority. The server version is discarded.

```ts
createOfflineStore<Item>('items', {
  conflictStrategy: 'client-wins',
});
```

### server-wins

Server data always takes priority. Local changes are overwritten on sync.

```ts
createOfflineStore<Item>('items', {
  conflictStrategy: 'server-wins',
});
```

### Custom resolver

For complex cases, provide a function:

```ts
createOfflineStore<Item>('items', {
  conflictStrategy: (local, remote) => {
    // Merge fields from both versions
    return { ...remote, ...local, updatedAt: Math.max(local.updatedAt, remote.updatedAt) };
  },
});
```

## Example: Offline Todo App

A complete offline-capable todo app:

```ts
import { defineComponent, signal } from '@akashjs/runtime';
import { createOfflineStore } from '@akashjs/offline';

interface Todo {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
}

const todos = createOfflineStore<Todo>('todos', {
  keyPath: 'id',
  syncURL: '/api/todos',
  syncInterval: 15_000,
  conflictStrategy: 'last-write-wins',
});

const TodoApp = defineComponent((ctx) => {
  const newTitle = signal('');

  const addTodo = async () => {
    const title = newTitle().trim();
    if (!title) return;

    await todos.add({
      id: crypto.randomUUID(),
      title,
      done: false,
      createdAt: Date.now(),
    });
    newTitle.set('');
  };

  const toggleTodo = async (id: string, done: boolean) => {
    await todos.update(id, { done: !done });
  };

  const removeTodo = async (id: string) => {
    await todos.remove(id);
  };

  return () => (
    <div class="todo-app">
      <header>
        <h1>Todos</h1>
        <span class={todos.online() ? 'online' : 'offline'}>
          {todos.online() ? 'Online' : 'Offline'}
        </span>
        {todos.pending() > 0 && (
          <span class="pending">{todos.pending()} unsynced</span>
        )}
      </header>

      <form on:submit|preventDefault={addTodo}>
        <input
          value={newTitle()}
          on:input={(e) => newTitle.set(e.target.value)}
          placeholder="What needs to be done?"
        />
        <button type="submit">Add</button>
      </form>

      <ul>
        {todos.items().map((todo) => (
          <li>
            <input
              type="checkbox"
              checked={todo.done}
              on:change={() => toggleTodo(todo.id, todo.done)}
            />
            <span class={todo.done ? 'done' : ''}>{todo.title}</span>
            <button on:click={() => removeTodo(todo.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
});
```

The app works identically whether the user is online or offline. Changes persist in IndexedDB and sync automatically when connectivity returns.
