# Collaborative Signals

AkashJS ships with built-in real-time collaboration powered by **CRDTs** (Conflict-free Replicated Data Types). With `createSync()`, multiple users can edit the same state simultaneously — conflicts resolve automatically, no server logic required.

## What Are CRDTs?

Imagine two people editing a shared document at the same time, even while offline. When they reconnect, their changes merge without overwriting each other. That is what CRDTs do — they are data structures designed so that any order of operations produces the same result. No central authority needed.

AkashJS wraps this complexity in a familiar signals API. You read and write state the same way you always do — the syncing happens behind the scenes.

## Basic Setup

```ts
import { createSync, createWebSocketTransport } from '@akashjs/runtime';

const sync = createSync('my-room', {
  title: 'Untitled',
  content: '',
  votes: 0,
}, {
  transport: createWebSocketTransport('wss://sync.example.com'),
});
```

`createSync()` takes three arguments:

| Argument | Description |
|---|---|
| `roomId` | A string identifying the shared room. All clients with the same room ID share state. |
| `initialState` | The default state shape. Each property becomes a synced signal. |
| `options` | Configuration — at minimum, a transport. |

## State Signals

Every property on the initial state becomes a reactive signal that auto-syncs to all connected peers.

```ts
// Read state (same as a regular signal)
sync.state.title();       // 'Untitled'
sync.state.content();     // ''

// Write state — change propagates to all peers
sync.state.title.set('Meeting Notes');
sync.state.content.set('Agenda item 1...');

// Update from previous value
sync.state.votes.update((v) => v + 1);
```

Use these in components exactly like regular signals:

```ts
import { defineComponent } from '@akashjs/runtime';

const Editor = defineComponent((ctx) => {
  const sync = createSync('doc-123', { content: '' }, {
    transport: createWebSocketTransport('wss://sync.example.com'),
  });

  return () => (
    <div>
      <textarea
        value={sync.state.content()}
        on:input={(e) => sync.state.content.set(e.target.value)}
      />
      <p>Connected peers: {sync.peers().length}</p>
    </div>
  );
});
```

## Transports

Transports define how state travels between clients.

### WebSocket (production)

```ts
import { createWebSocketTransport } from '@akashjs/runtime';

const transport = createWebSocketTransport('wss://sync.example.com', {
  reconnect: true,        // auto-reconnect on disconnect
  reconnectDelay: 1000,   // ms between retries
  maxRetries: 10,
});
```

### Local (testing)

For unit tests and local development, use a local transport that syncs in-memory:

```ts
import { createLocalTransport } from '@akashjs/runtime';

const transport = createLocalTransport();

// Both sync instances share state in memory
const syncA = createSync('room', { count: 0 }, { transport });
const syncB = createSync('room', { count: 0 }, { transport });

syncA.state.count.set(5);
syncB.state.count();  // 5
```

## Presence Tracking

Track ephemeral per-user data like cursor positions, selections, or online status. Presence data is not persisted — it exists only while a peer is connected.

```ts
const sync = createSync('room', { content: '' }, {
  transport: createWebSocketTransport('wss://sync.example.com'),
  presence: {
    cursor: { x: 0, y: 0 },
    name: 'Alice',
  },
});

// Update your own presence
sync.presence.set({ cursor: { x: 100, y: 200 } });

// Read all peers' presence (returns Map<peerId, presenceData>)
sync.peerPresence();
// Map { 'peer-xyz' => { cursor: { x: 50, y: 80 }, name: 'Bob' } }
```

Render cursors in a component:

```ts
const Cursors = defineComponent((ctx) => {
  return () => (
    <div>
      <For each={[...sync.peerPresence().entries()]} key={([id]) => id}>
        {([id, peer]) => (
          <div
            class="cursor"
            style={`left: ${peer.cursor.x}px; top: ${peer.cursor.y}px`}
          >
            {peer.name}
          </div>
        )}
      </For>
    </div>
  );
});
```

## Conflict Resolution (LWW Register)

AkashJS uses **Last-Writer-Wins (LWW) Registers** for conflict resolution. When two peers write to the same property at the same time, the write with the highest timestamp wins. This is deterministic — every client converges to the same value.

```
Peer A sets title = "Hello"   (timestamp: 1001)
Peer B sets title = "World"   (timestamp: 1002)

Result on all peers: title = "World"  (1002 > 1001)
```

This strategy works well for most real-time use cases. For text editing where you need character-level merging, combine collaborative signals with a text CRDT library.

## Peers List

Track who is currently connected to the room:

```ts
// Reactive list of connected peer IDs
sync.peers();  // ['peer-abc', 'peer-xyz']

// Your own peer ID
sync.peerId;   // 'peer-123'

// Connection state
sync.connected();  // true | false
```

Peers that disconnect are automatically removed from `peerPresence()` — their presence data is cleaned up.

## Presence Helpers

AkashJS provides high-level helpers that build on top of the presence system, so you don't have to wire up common patterns yourself.

### useCursor

Automatically tracks mouse movement and broadcasts cursor position to peers.

```ts
import { useCursor } from '@akashjs/runtime';

const cursor = useCursor(sync, { throttle: 50 }); // ms

// Reactive accessors
cursor.x();  // current local x
cursor.y();  // current local y

// Stop tracking when done
cursor.dispose();
```

`useCursor` listens to `mousemove` on the document, throttles updates to the given interval (default 100ms), and sets presence automatically. In components, it disposes when the component is destroyed.

### useTypingIndicator

Manages typing state with automatic timeout.

```ts
import { useTypingIndicator } from '@akashjs/runtime';

const typing = useTypingIndicator(sync, { timeout: 2000 }); // ms

// Call on keystrokes
typing.start();

// Manual stop (also stops automatically after timeout)
typing.stop();

// Read state
typing.isTyping();       // true/false for local user
typing.othersTyping();   // ['peer-abc', 'peer-xyz']
```

Wire it into an input:

```ts
<textarea
  on:input={() => typing.start()}
  on:blur={() => typing.stop()}
/>
{typing.othersTyping().length > 0 && (
  <span>{typing.othersTyping().length} typing...</span>
)}
```

## Conflict Resolution

By default, AkashJS uses Last-Writer-Wins (LWW). For finer control, pass an `onConflict` callback in your sync options.

### onConflict Callback

```ts
const sync = createSync({ score: 0 }, {
  transport,
  onConflict({ key, localValue, remoteValue }) {
    // Return a value to auto-resolve
    if (key === 'score') return Math.max(localValue, remoteValue);

    // Return undefined to queue the conflict for manual resolution
    return undefined;
  },
});
```

If `onConflict` throws, AkashJS falls back to LWW so the document always converges.

### Reactive Conflicts

Unresolved conflicts (where `onConflict` returned `undefined`) are exposed as a reactive signal:

```ts
sync.conflicts();
// [{ key: 'title', localValue: 'Hello', remoteValue: 'World', localTimestamp: ..., remoteTimestamp: ..., remotePeerId: '...' }]
```

Resolve them manually:

```ts
sync.resolveConflict('title', 'Hello World');
```

Once resolved, the entry is removed from `sync.conflicts()` and the chosen value propagates to all peers.

## Synced Stores

For larger apps, you can enable sync directly on a store created with `defineStore`.

```ts
import { defineStore, createWebSocketTransport } from '@akashjs/runtime';

const useTodos = defineStore('todos', {
  state: () => ({
    items: [],
    filter: 'all',
  }),
  sync: {
    transport: createWebSocketTransport('wss://sync.example.com'),
    room: 'todos-room',
    presence: true,
  },
});
```

When `sync` is provided, the store exposes a `$sync` object:

```ts
const store = useTodos();

store.$sync.connected();      // true/false
store.$sync.peers();          // ['peer-abc']
store.$sync.presence;         // local presence (set/get)
store.$sync.peerPresence();   // all peers' presence data
```

### Offline + Sync

Synced stores work alongside `persist`. Writes are saved locally first, then synced when a connection is available:

```ts
const useTodos = defineStore('todos', {
  state: () => ({ items: [] }),
  persist: true,
  sync: {
    transport: createWebSocketTransport('wss://sync.example.com'),
    room: 'todos-room',
  },
});
```

## Example: Collaborative Text Editor

A complete collaborative editor in under 40 lines:

```ts
import { defineComponent } from '@akashjs/runtime';
import { createSync, createWebSocketTransport } from '@akashjs/runtime';

const CollaborativeEditor = defineComponent((ctx) => {
  const sync = createSync('editor-room', {
    title: 'Untitled Document',
    content: '',
  }, {
    transport: createWebSocketTransport('wss://sync.example.com'),
    presence: { cursor: 0, name: 'Anonymous' },
  });

  const handleInput = (e: InputEvent) => {
    sync.state.content.set((e.target as HTMLTextAreaElement).value);
  };

  const handleCursor = (e: Event) => {
    const pos = (e.target as HTMLTextAreaElement).selectionStart;
    sync.presence.set({ cursor: pos });
  };

  return () => (
    <div class="editor">
      <input
        value={sync.state.title()}
        on:input={(e) => sync.state.title.set(e.target.value)}
        placeholder="Document title"
      />
      <textarea
        value={sync.state.content()}
        on:input={handleInput}
        on:select={handleCursor}
        rows={20}
      />
      <aside class="peers">
        <h4>Online ({sync.peers().length})</h4>
        <ul>
          <For each={[...sync.peerPresence().entries()]} key={([id]) => id}>
            {([id, p]) => <li>{p.name} — position {p.cursor}</li>}
          </For>
        </ul>
      </aside>
    </div>
  );
});
```

## Cleanup

Disconnect from the room when done:

```ts
sync.disconnect();
```

In components, AkashJS automatically disconnects when the component is destroyed.
