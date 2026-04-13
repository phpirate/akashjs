# Real-time Chat

A collaborative chat app with live cursors and typing indicators. Demonstrates CRDT sync, presence tracking, and reactive peer state.

## Synced Store

Create `src/stores/chat.store.ts`:

```ts
import { defineStore, createWebSocketTransport } from '@akashjs/runtime';

const transport = createWebSocketTransport('wss://sync.example.com');

export const useChat = defineStore('chat', {
  state: () => ({
    messages: [] as Array<{ id: number; author: string; text: string; time: number }>,
    topic: 'General',
  }),

  actions: {
    send(author: string, text: string) {
      this.messages.update((msgs) => [
        ...msgs,
        { id: Date.now(), author, text, time: Date.now() },
      ]);
    },
    setTopic(topic: string) {
      this.topic.set(topic);
    },
  },

  // Real-time sync — all connected users see messages instantly
  sync: {
    transport,
    room: 'chat-room',
    presence: true,
  },

  // Messages persist locally for offline access
  persist: true,
});
```

## Chat Component

Create `src/routes/page.akash`:

```html
<script lang="ts">
import { signal, effect, onMount } from '@akashjs/runtime';
import { useTypingIndicator } from '@akashjs/runtime';
import { useChat } from '@/stores/chat.store';

const chat = useChat();
const input = signal('');
const username = signal(localStorage.getItem('chat-name') || '');
const showNamePrompt = signal(!username());

// Connect to sync room
chat.$sync.connect();

// Set presence with username
effect(() => {
  if (username()) {
    chat.$sync.presence.set({ name: username() });
  }
});

// Typing indicator
const typing = useTypingIndicator(chat.$sync, { timeout: 2000 });

// Auto-scroll to bottom on new messages
let messagesDiv: HTMLElement | null = null;
effect(() => {
  chat.messages(); // track
  if (messagesDiv) {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }
});

function setName() {
  const name = username().trim();
  if (!name) return;
  localStorage.setItem('chat-name', name);
  showNamePrompt.set(false);
}

function sendMessage() {
  const text = input().trim();
  if (!text) return;
  chat.send(username(), text);
  input.set('');
  typing.stop();
}

function handleInput(e: Event) {
  input.set((e.target as HTMLInputElement).value);
  typing.start(); // broadcasts typing state to peers
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
</script>

<template>
  <div class="chat">
    <!-- Name prompt -->
    <Show when={showNamePrompt()}>
      {() => (
        <div class="name-prompt">
          <h2>Enter your name</h2>
          <form onSubmit|preventDefault={setName}>
            <input
              bind:value={username}
              placeholder="Your name..."
              autofocus
            />
            <button type="submit">Join Chat</button>
          </form>
        </div>
      )}
    </Show>

    <!-- Chat UI -->
    <Show when={!showNamePrompt()}>
      {() => (
        <div class="chat-container">
          <!-- Header -->
          <header>
            <h2>{chat.topic()}</h2>
            <div class="peers">
              <span class="dot"></span>
              {chat.$sync.peers().length + 1} online
            </div>
          </header>

          <!-- Online users -->
          <div class="online-bar">
            <For each={[...chat.$sync.peerPresence().entries()]} key={([id]) => id}>
              {([id, peer]) => (
                <span class="peer-badge">{peer.name || 'Anonymous'}</span>
              )}
            </For>
          </div>

          <!-- Messages -->
          <div class="messages" ref={(el) => { messagesDiv = el; }}>
            <For each={chat.messages()} key={(m) => m.id}>
              {(msg) => (
                <div class={msg.author === username() ? 'message own' : 'message'}>
                  <div class="meta">
                    <strong>{msg.author}</strong>
                    <span class="time">{formatTime(msg.time)}</span>
                  </div>
                  <p>{msg.text}</p>
                </div>
              )}
            </For>

            <Show when={chat.messages().length === 0}>
              {() => <p class="empty">No messages yet. Say hello!</p>}
            </Show>
          </div>

          <!-- Typing indicator -->
          <Show when={typing.othersTyping().length > 0}>
            {() => (
              <div class="typing">
                {typing.othersTyping().length === 1
                  ? 'Someone is typing...'
                  : `${typing.othersTyping().length} people are typing...`}
              </div>
            )}
          </Show>

          <!-- Input -->
          <form class="input-bar" onSubmit|preventDefault={sendMessage}>
            <input
              value={input()}
              onInput={handleInput}
              placeholder="Type a message..."
            />
            <button type="submit" disabled={!input().trim()}>Send</button>
          </form>
        </div>
      )}
    </Show>
  </div>
</template>

<style scoped>
.chat {
  max-width: 600px;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: system-ui, sans-serif;
}

.name-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 1rem;
}

.name-prompt form {
  display: flex;
  gap: 0.5rem;
}

.name-prompt input {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
}

.name-prompt button {
  padding: 0.75rem 1.5rem;
  background: #6750a4;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #eee;
}

header h2 { margin: 0; }

.peers {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #666;
  font-size: 0.875rem;
}

.dot {
  width: 8px;
  height: 8px;
  background: #22c55e;
  border-radius: 50%;
}

.online-bar {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid #f0f0f0;
  flex-wrap: wrap;
}

.peer-badge {
  padding: 0.25rem 0.5rem;
  background: #f3f0ff;
  color: #6750a4;
  border-radius: 12px;
  font-size: 0.75rem;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.message {
  max-width: 80%;
  padding: 0.5rem 0.75rem;
  background: #f5f5f5;
  border-radius: 12px;
  border-top-left-radius: 4px;
}

.message.own {
  align-self: flex-end;
  background: #6750a4;
  color: white;
  border-top-left-radius: 12px;
  border-top-right-radius: 4px;
}

.meta {
  display: flex;
  gap: 0.5rem;
  align-items: baseline;
  font-size: 0.75rem;
  margin-bottom: 0.25rem;
}

.message.own .meta { color: rgba(255,255,255,0.8); }
.time { color: #999; }
.message.own .time { color: rgba(255,255,255,0.6); }

.message p { margin: 0; }

.empty {
  text-align: center;
  color: #999;
  padding: 3rem;
}

.typing {
  padding: 0.5rem 1rem;
  color: #999;
  font-size: 0.875rem;
  font-style: italic;
}

.input-bar {
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
  border-top: 1px solid #eee;
}

.input-bar input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 20px;
  font-size: 1rem;
}

.input-bar button {
  padding: 0.75rem 1.5rem;
  background: #6750a4;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
}

.input-bar button:disabled {
  opacity: 0.5;
}
</style>
```

## What This Demonstrates

- **`defineStore` with `sync`** — messages synced to all peers via CRDT in real-time
- **`persist: true`** — messages saved locally for offline access
- **`$sync.connect()`** — connect to the sync room
- **`$sync.presence.set()`** — broadcast your name to peers
- **`$sync.peerPresence()`** — see who's online (returns `Map<peerId, data>`)
- **`$sync.peers()`** — count connected peers
- **`useTypingIndicator`** — auto-timeout typing state, `othersTyping()` shows who's typing
- **`effect()`** — auto-scroll on new messages, update presence on name change
- **`bind:value`** — two-way input binding
- **`class:own`** — conditional styling for own messages
- **`ref` callback** — capture DOM element for scroll control
- **`persist + sync`** — offline-first: works without network, syncs when connected
