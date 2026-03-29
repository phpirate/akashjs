# Step 3: Reactivity

In this step, you will replace the hardcoded todo array with signals, add computed values for filtered counts, persist todos to localStorage with effects, and understand how AkashJS reactivity works under the hood.

## How Reactivity Works

AkashJS uses **fine-grained signals** inspired by SolidJS and Preact Signals. There is no virtual DOM. When a signal value changes, only the specific DOM nodes that depend on it are updated.

The three core primitives:

| Primitive | Purpose | Example |
|-----------|---------|---------|
| `signal(value)` | Mutable reactive state | `const count = signal(0)` |
| `computed(fn)` | Derived value, re-calculates when dependencies change | `const double = computed(() => count() * 2)` |
| `effect(fn)` | Side effect, re-runs when dependencies change | `effect(() => console.log(count()))` |

Reading a signal is a function call: `count()`. Writing uses `.set()` or `.update()`.

## Add Reactive Todo State

Replace the hardcoded array in `src/pages/Home.akash` with signals:

```html
<script>
  import { signal, computed } from '@akashjs/runtime';
  import type { Todo } from '../types';
  import TodoList from '../components/TodoList.akash';

  // Reactive state
  const todos = signal<Todo[]>([
    { id: '1', text: 'Learn AkashJS', completed: false, createdAt: Date.now() },
    { id: '2', text: 'Build a todo app', completed: false, createdAt: Date.now() },
    { id: '3', text: 'Ship to production', completed: false, createdAt: Date.now() },
  ]);

  // Computed values — automatically recalculate when todos change
  const totalCount = computed(() => todos().length);
  const completedCount = computed(() => todos().filter(t => t.completed).length);
  const activeCount = computed(() => totalCount() - completedCount());

  // Toggle a todo's completed state
  function handleToggle(id: string) {
    todos.update(list =>
      list.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    );
  }

  // Delete a todo
  function handleDelete(id: string) {
    todos.update(list => list.filter(t => t.id !== id));
  }

  // Add a new todo
  function handleAdd(text: string) {
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      createdAt: Date.now(),
    };
    todos.update(list => [...list, newTodo]);
  }
</script>

<template>
  <div class="home">
    <h2>All Todos</h2>

    <div class="stats">
      <span>{totalCount()} total</span>
      <span>{activeCount()} active</span>
      <span>{completedCount()} completed</span>
    </div>

    <TodoList
      todos={todos()}
      onToggle={handleToggle}
      onDelete={handleDelete}
    />
  </div>
</template>

<style scoped>
  .home {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .stats {
    display: flex;
    gap: 1rem;
    font-size: 0.875rem;
    color: var(--muted, #718096);
  }

  .stats span {
    padding: 0.25rem 0.5rem;
    background: var(--surface, #f7fafc);
    border-radius: 4px;
  }
</style>
```

Save and check the browser. Click a checkbox -- the todo should toggle, and the stats should update in real time.

## Understanding the Reactive Flow

Here is what happens when you click a checkbox:

1. The `on:change` handler calls `handleToggle(id)`
2. `handleToggle` calls `todos.update(...)`, which produces a new array
3. AkashJS detects that `todos` changed and notifies all subscribers
4. The `{#each}` block re-reconciles the list -- only the changed item is updated in the DOM
5. `totalCount`, `completedCount`, and `activeCount` recompute because they read `todos()`
6. The `{totalCount()}`, `{activeCount()}`, and `{completedCount()}` text nodes update

No reconciliation of an entire virtual DOM tree. No `shouldComponentUpdate`. Just direct, targeted updates.

## Persist to localStorage with `effect()`

Add an effect to save todos whenever they change. Add this to the `<script>` section of `Home.akash`:

```ts
import { signal, computed, effect } from '@akashjs/runtime';

// ... (existing code)

// Load from localStorage on startup
const saved = localStorage.getItem('todos');
if (saved) {
  try {
    todos.set(JSON.parse(saved));
  } catch {
    // ignore corrupt data
  }
}

// Save to localStorage whenever todos change
effect(() => {
  const current = todos();
  localStorage.setItem('todos', JSON.stringify(current));
});
```

Now your todos survive page refreshes.

::: info How effects track dependencies
When `effect()` runs its callback, AkashJS records every signal that is read. The next time any of those signals change, the effect re-runs. This is automatic -- you never declare dependencies manually.
:::

## The Signal API in Detail

Here is the full `signal()` API you will use throughout the tutorial:

```ts
import { signal } from '@akashjs/runtime';

const name = signal('AkashJS');

// Read the value (tracks as dependency in computed/effect)
name();          // 'AkashJS'

// Set a new value
name.set('Akash');

// Update based on previous value
name.update(prev => prev.toUpperCase());

// Read without tracking (no dependency registered)
name.peek();     // 'AKASH'
```

::: warning Don't destructure signals
Signals are functions. Destructuring loses the reactive connection:

```ts
// BAD -- `value` is a plain string, not reactive
const { value } = signal('hello');  // This doesn't even work

// BAD -- loses reactivity
const count = signal(0);
let current = count();  // `current` is just the number 0

// GOOD -- always call the signal to read
const count = signal(0);
effect(() => console.log(count()));  // re-runs when count changes
```
:::

## Batching Multiple Updates

If you need to update several signals at once, use `batch()` to prevent intermediate re-renders:

```ts
import { signal, batch } from '@akashjs/runtime';

const firstName = signal('');
const lastName = signal('');

// Without batch: two separate updates, two re-renders
firstName.set('Jane');
lastName.set('Doe');

// With batch: one re-render after both updates
batch(() => {
  firstName.set('Jane');
  lastName.set('Doe');
});
```

For our todo app, batching is not needed yet because each action only updates one signal. But it becomes important when you update multiple pieces of state in one handler.

## The `untrack()` Escape Hatch

Sometimes you want to read a signal inside an effect without creating a dependency. Use `untrack()`:

```ts
import { signal, effect, untrack } from '@akashjs/runtime';

const count = signal(0);
const label = signal('Count');

effect(() => {
  // This effect re-runs when `count` changes, but NOT when `label` changes
  const currentLabel = untrack(() => label());
  console.log(`${currentLabel}: ${count()}`);
});
```

## Try It

Experiment with reactivity:

1. Add a "Clear completed" button that removes all completed todos using `todos.update(list => list.filter(t => !t.completed))`
2. Add a computed signal `isEmpty` that returns `true` when the list is empty, and show a different message
3. Open the browser DevTools console and try modifying a signal -- add `window._todos = todos` in the script, then call `window._todos.set([])` from the console
4. Observe that the effect writes to localStorage every time you interact with a todo

## Summary

You now understand:

- `signal()` creates mutable reactive state
- `computed()` derives values that auto-update when dependencies change
- `effect()` runs side effects that re-execute on dependency changes
- Reading a signal in a template (`{count()}`) creates a fine-grained DOM binding
- There is no virtual DOM -- updates go directly to the DOM nodes that changed

The app is reactive, but we are still on a single page. Let's add routing.

---

**What's Next:** [Routing](./routing.md) -- add separate pages for All, Active, and Completed todos.
