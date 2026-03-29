# Step 7: State Management

In this step, you will extract the todo logic into a `defineStore`, share state across all page components, use `$reset` and `$snapshot`, and understand when to use local state versus global stores.

## The Problem

Right now, each page component has its own copy of the todo state. If you add a todo on the All page and navigate to Active, the data is fetched again independently. This leads to:

- Duplicated logic across pages
- Inconsistent state between views
- Wasted network requests

The solution is a **global store** -- a singleton that holds the todo state and actions, shared by every component that needs it.

## Create the Todo Store

Create `src/stores/todo-store.ts`:

```ts
import { defineStore } from '@akashjs/runtime';
import { computed } from '@akashjs/runtime';
import type { Todo } from '../types';

export const useTodoStore = defineStore('todos', {
  state: () => ({
    items: [] as Todo[],
    loading: false,
    error: null as string | null,
    filter: 'all' as 'all' | 'active' | 'completed',
  }),

  getters: {
    filteredTodos: (state) => {
      const items = state.items();
      const filter = state.filter();

      switch (filter) {
        case 'active':
          return items.filter(t => !t.completed);
        case 'completed':
          return items.filter(t => t.completed);
        default:
          return items;
      }
    },

    totalCount: (state) => state.items().length,

    activeCount: (state) => state.items().filter(t => !t.completed).length,

    completedCount: (state) => state.items().filter(t => t.completed).length,

    hasCompleted: (state) => state.items().some(t => t.completed),
  },

  actions: {
    setFilter(filter: 'all' | 'active' | 'completed') {
      this.filter.set(filter);
    },

    async loadTodos() {
      this.loading.set(true);
      this.error.set(null);

      try {
        // In a real app: const todos = await http.get<Todo[]>('/todos');
        const saved = localStorage.getItem('todos-store');
        const todos: Todo[] = saved ? JSON.parse(saved) : [];
        this.items.set(todos);
      } catch (e) {
        this.error.set(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        this.loading.set(false);
      }
    },

    addTodo(text: string) {
      const newTodo: Todo = {
        id: crypto.randomUUID(),
        text,
        completed: false,
        createdAt: Date.now(),
      };
      this.items.update(list => [...list, newTodo]);
      this._persist();
    },

    toggleTodo(id: string) {
      this.items.update(list =>
        list.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
      );
      this._persist();
    },

    deleteTodo(id: string) {
      this.items.update(list => list.filter(t => t.id !== id));
      this._persist();
    },

    editTodo(id: string, text: string) {
      this.items.update(list =>
        list.map(t => t.id === id ? { ...t, text } : t)
      );
      this._persist();
    },

    clearCompleted() {
      this.items.update(list => list.filter(t => !t.completed));
      this._persist();
    },

    _persist() {
      localStorage.setItem('todos-store', JSON.stringify(this.items()));
    },
  },
});
```

### How `defineStore` Works

```ts
const useTodoStore = defineStore('todos', {
  state: () => ({ ... }),    // Factory function returning initial state
  getters: { ... },          // Computed values derived from state
  actions: { ... },          // Methods that mutate state
});
```

**State** fields become signals automatically. When you define `items: [] as Todo[]`, the store creates `signal<Todo[]>([])` internally. You read with `state.items()` and write with `this.items.set(...)` or `this.items.update(...)`.

**Getters** are computed values. They receive the signalified state and return derived data. They re-compute automatically when their dependencies change.

**Actions** are methods where `this` is bound to the state signals. Inside an action, `this.items` is the signal, so you call `this.items.set(...)` or `this.items.update(...)`.

The store is a **singleton** -- `useTodoStore()` always returns the same instance no matter where it is called.

## Use the Store in Pages

Now simplify all three page components. Update `src/pages/AllTodos.akash`:

```html
<script>
  import { useTodoStore } from '../stores/todo-store';
  import AddTodoForm from '../components/AddTodoForm.akash';
  import TodoList from '../components/TodoList.akash';

  const store = useTodoStore();

  // Load todos on mount
  store.loadTodos();
  store.setFilter('all');
</script>

<template>
  <div>
    <AddTodoForm onAdd={(text) => store.addTodo(text)} />

    {#if store.loading()}
      <div class="loading">Loading...</div>
    {:else}
      <p class="count">
        {store.totalCount()} total, {store.completedCount()} completed
      </p>
      <TodoList
        todos={store.filteredTodos()}
        onToggle={(id) => store.toggleTodo(id)}
        onDelete={(id) => store.deleteTodo(id)}
        onEdit={(id, text) => store.editTodo(id, text)}
      />
      {#if store.hasCompleted()}
        <button class="clear-btn" on:click={() => store.clearCompleted()}>
          Clear completed
        </button>
      {/if}
    {/if}
  </div>
</template>

<style scoped>
  .count {
    font-size: 0.875rem;
    color: var(--muted, #718096);
    margin-bottom: 0.5rem;
  }

  .loading {
    padding: 2rem;
    text-align: center;
    color: var(--muted, #718096);
  }

  .clear-btn {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background: none;
    border: 1px solid var(--border, #e2e8f0);
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.875rem;
    color: var(--muted, #718096);
  }

  .clear-btn:hover {
    background: var(--surface, #f7fafc);
  }
</style>
```

Update `src/pages/ActiveTodos.akash`:

```html
<script>
  import { useTodoStore } from '../stores/todo-store';
  import TodoList from '../components/TodoList.akash';

  const store = useTodoStore();
  store.setFilter('active');
</script>

<template>
  <div>
    <p class="count">{store.activeCount()} active</p>
    <TodoList
      todos={store.filteredTodos()}
      onToggle={(id) => store.toggleTodo(id)}
      onDelete={(id) => store.deleteTodo(id)}
      onEdit={(id, text) => store.editTodo(id, text)}
    />
  </div>
</template>

<style scoped>
  .count {
    font-size: 0.875rem;
    color: var(--muted, #718096);
    margin-bottom: 0.5rem;
  }
</style>
```

Update `src/pages/CompletedTodos.akash`:

```html
<script>
  import { useTodoStore } from '../stores/todo-store';
  import TodoList from '../components/TodoList.akash';

  const store = useTodoStore();
  store.setFilter('completed');
</script>

<template>
  <div>
    <p class="count">{store.completedCount()} completed</p>
    <TodoList
      todos={store.filteredTodos()}
      onToggle={(id) => store.toggleTodo(id)}
      onDelete={(id) => store.deleteTodo(id)}
      onEdit={(id, text) => store.editTodo(id, text)}
    />
    {#if store.hasCompleted()}
      <button class="clear-btn" on:click={() => store.clearCompleted()}>
        Clear all completed
      </button>
    {/if}
  </div>
</template>

<style scoped>
  .count {
    font-size: 0.875rem;
    color: var(--muted, #718096);
    margin-bottom: 0.5rem;
  }

  .clear-btn {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background: none;
    border: 1px solid var(--danger, #e53e3e);
    color: var(--danger, #e53e3e);
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.875rem;
  }
</style>
```

Notice how much simpler each page is now. The store holds all the logic, and pages are thin views.

## Store Utilities: `$reset` and `$snapshot`

Every store comes with built-in utility methods:

```ts
const store = useTodoStore();

// Take a plain object snapshot of current state
const snapshot = store.$snapshot();
// { items: [...], loading: false, error: null, filter: 'all' }

// Reset all state to initial values
store.$reset();
// items is back to [], loading is false, etc.

// Subscribe to state changes
const unsubscribe = store.$subscribe((state) => {
  console.log('State changed:', state);
});

// Store ID
store.$id;  // 'todos'
```

::: tip When to Use `$snapshot`
`$snapshot()` is useful for:
- Debugging: `console.log(store.$snapshot())`
- Serialization: sending state to an analytics service
- Undo/redo: save snapshots and restore them with `$reset` + manual set
:::

## Local State vs Global Store

Not everything belongs in a store. Here is a guideline:

| Use Local State (`signal`) | Use Global Store (`defineStore`) |
|---|---|
| UI state (open/closed, hover, focus) | Domain data (todos, users, settings) |
| Form input values | Shared state between routes |
| Component-specific toggles | State that survives navigation |
| Ephemeral data | State that needs persistence |

::: tip Rule of Thumb
If two or more unrelated components need the same data, use a store. If only one component cares, use a local signal.
:::

For our todo app:
- **Store**: todo items, filter state, loading state -- shared across all pages
- **Local signal**: `isEditing` in TodoItem -- only that one component cares

## Try It

Experiment with the store:

1. Add a todo on the All page, then navigate to Active -- it should appear (same store)
2. Toggle a todo on Active, then go to Completed -- it is there
3. Open the browser console and run:
   ```js
   // If you expose the store on window for debugging:
   console.log(store.$snapshot());
   store.$reset();
   ```
4. Try adding a `$subscribe` call and watch the console as you interact with todos

## Summary

You now know how to:

- Define a global store with `defineStore()` (state, getters, actions)
- Use the store as a singleton across multiple components
- Use `$reset()`, `$snapshot()`, and `$subscribe()`
- Choose between local signals and global stores

The app logic is clean and centralized. Let's make it look good.

---

**What's Next:** [Styling](./styling.md) -- add dark mode, conditional classes, and transitions.
