# Real-Time Updates

## Problem

You need real-time features: WebSocket messaging, collaborative state, presence (who's online), optimistic updates with rollback, and reconnection handling.

## Solution

Use `createSocket` for WebSocket connections and `createSync` for CRDT-based collaborative state.

### 1. Chat Application with WebSocket

```ts
// src/chat.ts
import { signal } from '@akashjs/runtime';
import { createSocket } from '@akashjs/http';

interface Message {
  id: string;
  user: string;
  text: string;
  timestamp: number;
}

const messages = signal<Message[]>([]);
const input = signal('');

const ws = createSocket('wss://api.example.com/chat', {
  autoReconnect: true,
  maxRetries: 10,
  reconnectDelay: 1000,
  maxReconnectDelay: 30000,
});

// Listen for incoming messages
ws.on('message', (data) => {
  const msg = data as Message;
  messages.update((prev) => [...prev, msg]);
});

function sendMessage() {
  const text = input().trim();
  if (!text) return;

  const msg: Message = {
    id: crypto.randomUUID(),
    user: currentUser.name,
    text,
    timestamp: Date.now(),
  };

  // Optimistic: show immediately
  messages.update((prev) => [...prev, msg]);
  ws.send({ type: 'chat', payload: msg });
  input.set('');
}
```

### 2. Template

```html
<div class="chat">
  <!-- Connection status banner -->
  <div :if={ws.status() !== 'open'} class="status-banner">
    <span :if={ws.status() === 'connecting'}>Connecting...</span>
    <span :if={ws.status() === 'closed'}>
      Disconnected.
      <button @click={ws.reconnect}>Reconnect</button>
    </span>
    <span :if={ws.status() === 'error'}>Connection error. Retrying...</span>
  </div>

  <!-- Messages -->
  <div class="messages" :ref={scrollToBottom}>
    <div :for={msg of messages()} :key={msg.id} class="message">
      <strong>{msg.user}</strong>
      <span class="time">{formatTime(msg.timestamp)}</span>
      <p>{msg.text}</p>
    </div>
  </div>

  <!-- Input -->
  <form class="chat-input" @submit|preventDefault={sendMessage}>
    <input :value={input}
           @input={e => input.set(e.target.value)}
           placeholder="Type a message..."
           :disabled={ws.status() !== 'open'} />
    <button type="submit" :disabled={ws.status() !== 'open'}>Send</button>
  </form>
</div>
```

::: tip
Disable the input when the socket is not open. Queuing messages during disconnection sounds nice but leads to confusing UX when messages arrive out of order after reconnect.
:::

### 3. Collaborative State with createSync

```ts
// src/collab-editor.ts
import { createSync, createWebSocketTransport } from '@akashjs/runtime';

const doc = createSync('document-abc', {
  title: 'Untitled',
  content: '',
  lastEditedBy: '',
}, {
  transport: createWebSocketTransport({
    url: 'wss://sync.example.com',
    room: 'document-abc',
  }),
});

// Connect on mount
doc.connect();

// Setting state auto-syncs to all peers
function updateTitle(newTitle: string) {
  doc.state.title.set(newTitle);
  doc.state.lastEditedBy.set(currentUser.name);
}
```

```html
<input :value={doc.state.title}
       @input={e => updateTitle(e.target.value)}
       placeholder="Document title" />
<p class="muted">Last edited by: {doc.state.lastEditedBy()}</p>
```

### 4. Presence (Who's Online)

```ts
import { effect } from '@akashjs/runtime';

// Broadcast cursor position as presence
effect(() => {
  doc.presence.set({
    name: currentUser.name,
    color: currentUser.color,
    cursor: cursorPosition(),
  });
});
```

```html
<!-- Show other users' cursors -->
<div :for={[peerId, data] of doc.peerPresence()} :key={peerId}>
  <div class="remote-cursor"
       :style="{ left: data.cursor.x + 'px', top: data.cursor.y + 'px',
                 borderColor: data.color }">
    <span class="cursor-label">{data.name}</span>
  </div>
</div>

<!-- Online users list -->
<div class="online-users">
  <span>{doc.peers().length + 1} online</span>
  <div :for={peer of doc.peers()} :key={peer.id} class="avatar-dot"
       :title={peer.id}></div>
</div>
```

### 5. Optimistic Updates with Rollback

```ts
const items = signal<Item[]>([]);

function deleteItem(id: string) {
  const backup = [...items()];

  // Optimistic: remove immediately
  items.update((list) => list.filter((i) => i.id !== id));

  ws.send({ type: 'delete', payload: { id } });

  // Listen for server rejection
  const unsub = ws.on('message', (data) => {
    if (data.type === 'delete_failed' && data.payload.id === id) {
      items.set(backup); // Rollback
      unsub();
    }
    if (data.type === 'delete_confirmed' && data.payload.id === id) {
      unsub(); // Success, cleanup
    }
  });
}
```

::: warning
Always keep a backup of the previous state before optimistic updates. CRDT-based sync via `createSync` handles conflicts automatically, but raw WebSocket messages need manual rollback logic.
:::

### 6. Reconnection Handling

```ts
// createSocket handles reconnection automatically, but you may want
// to re-sync state after reconnecting
ws.on('open', () => {
  // Re-subscribe to channels after reconnect
  ws.send({ type: 'subscribe', channel: 'updates' });

  // Fetch missed messages
  const lastId = messages().at(-1)?.id;
  if (lastId) {
    ws.send({ type: 'sync', after: lastId });
  }
});

ws.on('close', () => {
  console.log('Connection lost, will retry automatically');
});
```

### 7. Styles

```css
.status-banner {
  background: #fef3cd;
  color: #856404;
  padding: 0.5rem 1rem;
  text-align: center;
  font-size: 0.875rem;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.remote-cursor {
  position: absolute;
  width: 2px;
  height: 20px;
  border-left: 2px solid;
  pointer-events: none;
}

.cursor-label {
  position: absolute;
  top: -1.25rem;
  left: 0;
  font-size: 0.7rem;
  white-space: nowrap;
  background: inherit;
  padding: 0 4px;
  border-radius: 3px;
}
```

## Result

A real-time system with WebSocket chat, CRDT-based collaborative editing, presence indicators, optimistic updates with rollback, and automatic reconnection. The reactive signals mean the UI updates instantly whether data comes from local actions or remote peers.
