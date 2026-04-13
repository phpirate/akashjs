# Offline Notes

A note-taking app that works without internet and syncs when back online. Demonstrates offline stores, service workers, the offline query cache, and connectivity detection.

## Query Client with Offline Support

Create `src/lib/http.ts`:

```ts
import { createHttpClient, createQueryClient } from '@akashjs/http';

export const http = createHttpClient({
  baseUrl: '/api',
  credentials: 'include',
});

export const queryClient = createQueryClient({
  defaultStaleTime: 30_000,
  offline: {
    storage: 'indexeddb',       // persist cache to IndexedDB
    queueMutations: true,       // queue mutations when offline
    syncOnReconnect: true,      // replay queue + refetch on reconnect
  },
});
```

## Notes Store with Persist

Create `src/stores/notes.store.ts`:

```ts
import { defineStore } from '@akashjs/runtime';

interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

export const useNotes = defineStore('notes', {
  state: () => ({
    items: [] as Note[],
    activeId: null as string | null,
  }),

  getters: {
    activeNote: (state) => {
      const id = state.activeId();
      return state.items().find((n) => n.id === id) ?? null;
    },
    sorted: (state) =>
      [...state.items()].sort((a, b) => b.updatedAt - a.updatedAt),
  },

  actions: {
    create() {
      const note: Note = {
        id: crypto.randomUUID(),
        title: 'Untitled',
        content: '',
        updatedAt: Date.now(),
      };
      this.items.update((list) => [...list, note]);
      this.activeId.set(note.id);
      return note;
    },

    update(id: string, changes: Partial<Pick<Note, 'title' | 'content'>>) {
      this.items.update((list) =>
        list.map((n) =>
          n.id === id ? { ...n, ...changes, updatedAt: Date.now() } : n,
        ),
      );
    },

    remove(id: string) {
      this.items.update((list) => list.filter((n) => n.id !== id));
      if (this.activeId() === id) {
        this.activeId.set(this.items()[0]?.id ?? null);
      }
    },

    select(id: string) {
      this.activeId.set(id);
    },
  },

  persist: true, // survives page refresh
});
```

## Offline Banner Component

Create `src/components/OfflineBanner.akash`:

```html
<script lang="ts">
import { useOnline } from '@akashjs/runtime';
const online = useOnline();
</script>

<template>
  <Show when={!online()}>
    {() => (
      <div class="offline-banner">
        You're offline. Changes are saved locally and will sync when reconnected.
      </div>
    )}
  </Show>
</template>

<style scoped>
.offline-banner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #f59e0b;
  color: #1e1e2e;
  padding: 0.75rem;
  text-align: center;
  font-size: 0.875rem;
  font-weight: 500;
  z-index: 999;
}
</style>
```

## Notes Page

Create `src/routes/page.akash`:

```html
<script lang="ts">
import { signal, effect } from '@akashjs/runtime';
import { useMutation } from '@akashjs/http';
import { useNotes } from '@/stores/notes.store';
import { http, queryClient } from '@/lib/http';
import OfflineBanner from '@/components/OfflineBanner.akash';

const notes = useNotes();

// Sync note changes to server (queued when offline)
const saveNote = useMutation(
  queryClient,
  (note: { id: string; title: string; content: string }) =>
    http.put(`/notes/${note.id}`, note),
  {
    // No invalidation needed — local store is source of truth
  },
);

// Auto-save active note after 1s of inactivity
let saveTimeout: ReturnType<typeof setTimeout>;
effect(() => {
  const note = notes.activeNote();
  if (!note) return;

  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveNote.execute({ id: note.id, title: note.title, content: note.content });
  }, 1000);
});

function handleTitleInput(e: Event) {
  const id = notes.activeId();
  if (id) notes.update(id, { title: (e.target as HTMLInputElement).value });
}

function handleContentInput(e: Event) {
  const id = notes.activeId();
  if (id) notes.update(id, { content: (e.target as HTMLTextAreaElement).value });
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
</script>

<template>
  <div class="notes-app">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <h2>Notes</h2>
        <button onClick={() => notes.create()}>+ New</button>
      </div>

      <ul class="note-list">
        <For each={notes.sorted()} key={(n) => n.id}>
          {(note) => (
            <li
              class:active={note.id === notes.activeId()}
              onClick={() => notes.select(note.id)}
            >
              <strong>{note.title || 'Untitled'}</strong>
              <span class="date">{formatDate(note.updatedAt)}</span>
            </li>
          )}
        </For>
      </ul>

      <Show when={notes.items().length === 0}>
        {() => <p class="empty">No notes yet</p>}
      </Show>
    </aside>

    <!-- Editor -->
    <main class="editor">
      <Show when={notes.activeNote()} fallback={() => (
        <div class="no-selection">
          <p>Select a note or create a new one</p>
        </div>
      )}>
        {() => (
          <div class="editor-content">
            <input
              class="title-input"
              value={notes.activeNote()?.title ?? ''}
              onInput={handleTitleInput}
              placeholder="Note title..."
            />
            <textarea
              class="content-input"
              value={notes.activeNote()?.content ?? ''}
              onInput={handleContentInput}
              placeholder="Start writing..."
            />
            <div class="editor-footer">
              <span class="save-status">
                {saveNote.loading() ? 'Saving...' : 'Saved'}
              </span>
              <button
                class="delete"
                onClick={() => notes.remove(notes.activeId()!)}
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </Show>
    </main>

    <OfflineBanner />
  </div>
</template>

<style scoped>
.notes-app {
  display: flex;
  height: 100vh;
  font-family: system-ui, sans-serif;
}

.sidebar {
  width: 280px;
  border-right: 1px solid #eee;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #eee;
}

.sidebar-header h2 { margin: 0; font-size: 1.25rem; }

.sidebar-header button {
  padding: 0.5rem 1rem;
  background: #6750a4;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.note-list {
  list-style: none;
  padding: 0;
  margin: 0;
  overflow-y: auto;
  flex: 1;
}

.note-list li {
  padding: 0.75rem 1rem;
  cursor: pointer;
  border-bottom: 1px solid #f5f5f5;
}

.note-list li:hover { background: #fafafa; }
.note-list li.active { background: #f3f0ff; border-left: 3px solid #6750a4; }

.note-list strong {
  display: block;
  font-size: 0.875rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.date { font-size: 0.75rem; color: #999; }

.empty { text-align: center; color: #999; padding: 2rem; }

.editor {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.no-selection {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: #999;
}

.editor-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 1rem;
}

.title-input {
  font-size: 1.5rem;
  font-weight: 700;
  border: none;
  outline: none;
  padding: 0.5rem 0;
  margin-bottom: 0.5rem;
}

.content-input {
  flex: 1;
  border: none;
  outline: none;
  resize: none;
  font-size: 1rem;
  line-height: 1.6;
}

.editor-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.75rem;
  border-top: 1px solid #eee;
}

.save-status { font-size: 0.75rem; color: #999; }

.delete {
  padding: 0.5rem 1rem;
  background: none;
  border: 1px solid #e53935;
  color: #e53935;
  border-radius: 6px;
  cursor: pointer;
}

.delete:hover { background: #e53935; color: white; }
</style>
```

## Service Worker

Create `public/sw.js`:

```js
const CACHE_NAME = 'notes-v1';
const PRECACHE = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request)),
  );
});
```

Register it in `src/main.ts`:

```ts
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

## What This Demonstrates

- **Offline query cache** — `offline: { storage: 'indexeddb', queueMutations: true }` persists cache and queues mutations
- **`useMutation`** — auto-queued when offline, replayed on reconnect
- **`persist: true`** on store — notes survive page refresh in localStorage
- **`useOnline()`** — reactive connectivity detection
- **`<Show>` with `fallback`** — editor empty state
- **`class:active`** — highlight selected note
- **`effect()`** — auto-save with debounce
- **`<For>`** — sorted note list with keyed reconciliation
- **Service worker** — caches app shell for instant offline loading
- **`queryClient.online()`** — signals skip network fetches when offline
- **Complete offline flow** — create notes offline, they persist locally and sync when back online
