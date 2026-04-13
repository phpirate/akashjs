# Todo App

A complete todo app with persistent state, form validation, and filtering. Demonstrates stores, signals, `<Show>`, `<For>`, and `persist`.

## Store

Create `src/stores/todos.store.ts`:

```ts
import { defineStore } from '@akashjs/runtime';

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

export const useTodos = defineStore('todos', {
  state: () => ({
    items: [] as Todo[],
    filter: 'all' as 'all' | 'active' | 'done',
  }),

  getters: {
    filtered: (state) => {
      const f = state.filter();
      const items = state.items();
      if (f === 'active') return items.filter((t) => !t.done);
      if (f === 'done') return items.filter((t) => t.done);
      return items;
    },
    remaining: (state) => state.items().filter((t) => !t.done).length,
    total: (state) => state.items().length,
  },

  actions: {
    add(text: string) {
      this.items.update((list) => [
        ...list,
        { id: Date.now(), text, done: false },
      ]);
    },
    toggle(id: number) {
      this.items.update((list) =>
        list.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
      );
    },
    remove(id: number) {
      this.items.update((list) => list.filter((t) => t.id !== id));
    },
    clearDone() {
      this.items.update((list) => list.filter((t) => !t.done));
    },
  },

  persist: true, // saves to localStorage automatically
});
```

## Page Component

Create `src/routes/page.akash`:

```html
<script lang="ts">
import { signal } from '@akashjs/runtime';
import { useTodos } from '@/stores/todos.store';

const todos = useTodos();
const input = signal('');

function addTodo() {
  const text = input().trim();
  if (!text) return;
  todos.add(text);
  input.set('');
}
</script>

<template>
  <div class="todo-app">
    <h1>Todos</h1>

    <!-- Add form -->
    <form onSubmit|preventDefault={addTodo}>
      <input
        bind:value={input}
        placeholder="What needs to be done?"
        autofocus
      />
      <button type="submit" disabled={!input().trim()}>Add</button>
    </form>

    <!-- Filters -->
    <div class="filters">
      <button
        class:active={todos.filter() === 'all'}
        onClick={() => todos.filter.set('all')}
      >
        All ({todos.total()})
      </button>
      <button
        class:active={todos.filter() === 'active'}
        onClick={() => todos.filter.set('active')}
      >
        Active ({todos.remaining()})
      </button>
      <button
        class:active={todos.filter() === 'done'}
        onClick={() => todos.filter.set('done')}
      >
        Done ({todos.total() - todos.remaining()})
      </button>
    </div>

    <!-- Todo list -->
    <ul>
      <For each={todos.filtered()} key={(t) => t.id}>
        {(todo) => (
          <li class:done={todo.done}>
            <input
              type="checkbox"
              checked={todo.done}
              onClick={() => todos.toggle(todo.id)}
            />
            <span>{todo.text}</span>
            <button class="remove" onClick={() => todos.remove(todo.id)}>
              ×
            </button>
          </li>
        )}
      </For>
    </ul>

    <!-- Empty state -->
    <Show when={todos.filtered().length === 0}>
      {() => (
        <p class="empty">
          {todos.filter() === 'all'
            ? 'No todos yet. Add one above!'
            : `No ${todos.filter()} todos.`}
        </p>
      )}
    </Show>

    <!-- Footer -->
    <Show when={todos.total() > 0}>
      {() => (
        <footer>
          <span>{todos.remaining()} item{todos.remaining() !== 1 ? 's' : ''} left</span>
          <Show when={todos.total() - todos.remaining() > 0}>
            {() => (
              <button onClick={() => todos.clearDone()}>Clear done</button>
            )}
          </Show>
        </footer>
      )}
    </Show>
  </div>
</template>

<style scoped>
.todo-app {
  max-width: 500px;
  margin: 2rem auto;
  font-family: system-ui, sans-serif;
}

form {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

form input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
}

form button {
  padding: 0.75rem 1.5rem;
  background: #6750a4;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

form button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.filters {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.filters button {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  cursor: pointer;
}

.filters button.active {
  background: #6750a4;
  color: white;
  border-color: #6750a4;
}

ul {
  list-style: none;
  padding: 0;
}

li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f0f0f0;
}

li.done span {
  text-decoration: line-through;
  color: #999;
}

li span {
  flex: 1;
}

.remove {
  background: none;
  border: none;
  color: #ccc;
  font-size: 1.25rem;
  cursor: pointer;
}

.remove:hover {
  color: #e53935;
}

.empty {
  text-align: center;
  color: #999;
  padding: 2rem;
}

footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
  color: #666;
  font-size: 0.875rem;
}

footer button {
  background: none;
  border: none;
  color: #6750a4;
  cursor: pointer;
}
</style>
```

## What This Demonstrates

- **`defineStore`** with state, getters, and actions
- **`persist: true`** — todos survive page refresh (stored in localStorage)
- **`signal()`** — local reactive state for the input field
- **`bind:value`** — two-way binding on the input
- **`<For>`** — list rendering with keyed reconciliation
- **`<Show>`** — conditional rendering (empty state, footer)
- **`class:done`** — conditional CSS class directive
- **`onSubmit|preventDefault`** — event modifier
- **Getters** — derived state (`filtered`, `remaining`, `total`) that recompute automatically
