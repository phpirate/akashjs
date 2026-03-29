# Step 2: Your First Component

In this step, you will create `TodoItem` and `TodoList` components, learn the single-file component structure, pass props between components, and apply scoped styles.

## The Single-File Component Structure

Every `.akash` file has three optional sections:

```html
<script>
  // Imports, signals, logic — runs once when the component is created
</script>

<template>
  <!-- HTML markup with reactive expressions -->
</template>

<style scoped>
  /* CSS scoped to this component */
</style>
```

The compiler transforms this into a `defineComponent()` call at build time. You never need to call `defineComponent()` manually when using `.akash` files.

## Create the Todo Type

First, create a shared type for todo items. Create `src/types.ts`:

```ts
export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}
```

## Create the TodoItem Component

Create the file `src/components/TodoItem.akash`:

```html
<script>
  import type { Todo } from '../types';

  // Props are declared as top-level `export let` bindings
  export let todo: Todo;
  export let onToggle: (id: string) => void;
  export let onDelete: (id: string) => void;
</script>

<template>
  <div class="todo-item" class:completed={todo.completed}>
    <label class="todo-label">
      <input
        type="checkbox"
        checked={todo.completed}
        on:change={() => onToggle(todo.id)}
      />
      <span class="todo-text">{todo.text}</span>
    </label>
    <button class="todo-delete" on:click={() => onDelete(todo.id)}>
      Delete
    </button>
  </div>
</template>

<style scoped>
  .todo-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border, #e2e8f0);
    transition: background-color 0.15s;
  }

  .todo-item:hover {
    background-color: var(--hover, #f7fafc);
  }

  .todo-label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    flex: 1;
  }

  .todo-text {
    font-size: 1rem;
  }

  .completed .todo-text {
    text-decoration: line-through;
    opacity: 0.5;
  }

  .todo-delete {
    background: none;
    border: 1px solid var(--danger, #e53e3e);
    color: var(--danger, #e53e3e);
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    font-size: 0.8rem;
  }

  .todo-delete:hover {
    background: var(--danger, #e53e3e);
    color: white;
  }
</style>
```

Let's break down what is new here:

### Props with `export let`

```html
<script>
  export let todo: Todo;
  export let onToggle: (id: string) => void;
</script>
```

In `.akash` files, `export let` declares a prop. The parent component passes values in, and the component reads them. This is similar to Svelte's prop syntax.

### Conditional Classes with `class:`

```html
<div class="todo-item" class:completed={todo.completed}>
```

The `class:name={condition}` directive adds the class `completed` when `todo.completed` is truthy. This is a compile-time feature -- no runtime class merging needed.

### Event Handlers with `on:`

```html
<input on:change={() => onToggle(todo.id)} />
```

The `on:eventname` directive attaches event listeners. The handler is a regular function.

::: tip Naming Conventions
AkashJS components use PascalCase filenames: `TodoItem.akash`, `TodoList.akash`. This matches the import name and makes components easy to spot in your file tree.
:::

## Create the TodoList Component

Now create `src/components/TodoList.akash` to render a list of items:

```html
<script>
  import type { Todo } from '../types';
  import TodoItem from './TodoItem.akash';

  export let todos: Todo[];
  export let onToggle: (id: string) => void;
  export let onDelete: (id: string) => void;
</script>

<template>
  <div class="todo-list">
    {#if todos.length === 0}
      <div class="empty-state">
        <p>No todos yet. Add one above!</p>
      </div>
    {:else}
      {#each todos as todo (todo.id)}
        <TodoItem
          todo={todo}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      {/each}
    {/if}
  </div>
</template>

<style scoped>
  .todo-list {
    border: 1px solid var(--border, #e2e8f0);
    border-radius: 8px;
    overflow: hidden;
  }

  .empty-state {
    padding: 2rem;
    text-align: center;
    color: var(--muted, #a0aec0);
  }
</style>
```

### Template Control Flow

AkashJS uses block syntax for control flow inside templates:

**Conditionals:**
```html
{#if condition}
  <p>Shown when true</p>
{:else}
  <p>Shown when false</p>
{/if}
```

**Loops:**
```html
{#each items as item (item.id)}
  <ItemComponent item={item} />
{/each}
```

The `(item.id)` after `as item` is the **key expression**. It tells AkashJS how to efficiently reconcile the list when items are added, removed, or reordered. Always provide a key for lists that change.

### Component Composition

```html
<script>
  import TodoItem from './TodoItem.akash';
</script>
```

Importing a `.akash` component and using it in the template is all you need. No registration step, no declarations array. Import it, use it.

## Wire Everything Together

Update `src/pages/Home.akash` to use your new components:

```html
<script>
  import type { Todo } from '../types';
  import TodoList from '../components/TodoList.akash';

  // Hardcoded data for now — we'll make this reactive in the next step
  const todos: Todo[] = [
    { id: '1', text: 'Learn AkashJS', completed: false, createdAt: Date.now() },
    { id: '2', text: 'Build a todo app', completed: false, createdAt: Date.now() },
    { id: '3', text: 'Ship to production', completed: false, createdAt: Date.now() },
  ];

  function handleToggle(id: string) {
    console.log('Toggle:', id);
  }

  function handleDelete(id: string) {
    console.log('Delete:', id);
  }
</script>

<template>
  <div class="home">
    <h2>All Todos</h2>
    <TodoList
      todos={todos}
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
</style>
```

Save all files and check the browser. You should see your three todo items rendered with checkboxes and delete buttons.

## Try It

Experiment with what you have built:

1. Add a fourth todo to the hardcoded array and see it appear
2. Add a new prop `createdAt` display to `TodoItem` showing the date
3. Try removing `scoped` from a `<style>` block and see how styles leak to other components
4. Open the browser DevTools and inspect the generated HTML -- notice the scoped attribute AkashJS adds to elements

::: details How does scoped CSS work?
The AkashJS compiler adds a unique data attribute (like `data-v-a1b2c3`) to every element in the component's template, then rewrites the CSS selectors to include that attribute. This ensures styles only apply to elements within that component, even if class names collide.
:::

## Summary

You now know how to:

- Structure a `.akash` single-file component with `<script>`, `<template>`, and `<style scoped>`
- Declare props with `export let`
- Use `class:` for conditional CSS classes and `on:` for event handlers
- Compose components by importing and rendering child components
- Use `{#if}`, `{:else}`, and `{#each}` for control flow in templates

The todo list renders, but nothing is interactive yet. The toggle and delete handlers just log to the console. Let's fix that with reactivity.

---

**What's Next:** [Reactivity](./reactivity.md) -- add signals to make the todo list interactive.
