# Step 6: Data Fetching

In this step, you will add an HTTP client, fetch todos from a mock API with `createResource`, handle loading and error states, and use `createAction` for mutations with optimistic updates.

## Set Up a Mock API

For this tutorial, we will create a simple in-memory mock server. In a real app, you would point this at your actual backend.

Create `src/api/mock-server.ts`:

```ts
import type { Todo } from '../types';

// In-memory store simulating a database
let db: Todo[] = [
  { id: '1', text: 'Learn AkashJS', completed: true, createdAt: Date.now() - 100000 },
  { id: '2', text: 'Build a todo app', completed: false, createdAt: Date.now() - 50000 },
  { id: '3', text: 'Deploy to production', completed: false, createdAt: Date.now() },
];

// Simulate network delay
function delay(ms = 300): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const mockApi = {
  async getTodos(): Promise<Todo[]> {
    await delay();
    return [...db];
  },

  async addTodo(text: string): Promise<Todo> {
    await delay();
    const todo: Todo = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      createdAt: Date.now(),
    };
    db.push(todo);
    return todo;
  },

  async toggleTodo(id: string): Promise<Todo> {
    await delay();
    const todo = db.find(t => t.id === id);
    if (!todo) throw new Error(`Todo ${id} not found`);
    todo.completed = !todo.completed;
    return { ...todo };
  },

  async deleteTodo(id: string): Promise<void> {
    await delay();
    db = db.filter(t => t.id !== id);
  },

  async updateTodo(id: string, text: string): Promise<Todo> {
    await delay();
    const todo = db.find(t => t.id === id);
    if (!todo) throw new Error(`Todo ${id} not found`);
    todo.text = text;
    return { ...todo };
  },
};
```

## Create the HTTP Client

Create `src/api/client.ts`:

```ts
import { createHttpClient } from '@akashjs/http';

// In a real app, this would point to your API server:
//   export const http = createHttpClient({ baseUrl: '/api' });
//
// For this tutorial, we use the mock API directly.
// The HTTP client is shown here so you see the real pattern.

export const http = createHttpClient({
  baseUrl: 'https://api.example.com',
  headers: {
    'Content-Type': 'application/json',
  },
});
```

::: tip In production
With a real backend, your fetch calls would look like:

```ts
const todos = await http.get<Todo[]>('/todos');
const newTodo = await http.post<Todo>('/todos', { text: 'Hello' });
await http.delete('/todos/123');
```

The `createHttpClient` provides typed `.get()`, `.post()`, `.put()`, `.patch()`, and `.delete()` methods, plus interceptor support for auth tokens, logging, and error handling.
:::

## Create a Resource for Fetching Todos

Create `src/api/todos.ts`:

```ts
import { createResource } from '@akashjs/http';
import { createAction } from '@akashjs/http';
import { mockApi } from './mock-server';
import type { Todo } from '../types';

// Reactive resource — fetches todos and exposes loading/error states
export const todosResource = createResource<Todo[]>(
  () => mockApi.getTodos(),
  {
    initialData: [],
    staleTime: 30_000, // Consider data fresh for 30 seconds
  },
);

// Action: add a new todo
export const addTodoAction = createAction(
  (text: string) => mockApi.addTodo(text),
  {
    onSuccess: () => {
      todosResource.refetch();
    },
  },
);

// Action: toggle a todo
export const toggleTodoAction = createAction(
  (id: string) => mockApi.toggleTodo(id),
  {
    optimistic: (id) => {
      // Immediately update the UI before the server responds
      const current = todosResource() ?? [];
      todosResource.mutate(
        current.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
      );
    },
    revertOptimistic: () => {
      // If the server call fails, refetch to restore correct state
      todosResource.refetch();
    },
    onSuccess: () => {
      todosResource.refetch();
    },
  },
);

// Action: delete a todo
export const deleteTodoAction = createAction(
  (id: string) => mockApi.deleteTodo(id),
  {
    optimistic: (id) => {
      const current = todosResource() ?? [];
      todosResource.mutate(current.filter(t => t.id !== id));
    },
    revertOptimistic: () => {
      todosResource.refetch();
    },
    onSuccess: () => {
      todosResource.refetch();
    },
  },
);

// Action: edit a todo
export const editTodoAction = createAction(
  ({ id, text }: { id: string; text: string }) => mockApi.updateTodo(id, text),
  {
    onSuccess: () => {
      todosResource.refetch();
    },
  },
);
```

### How `createResource` Works

```ts
const todosResource = createResource<Todo[]>(
  () => mockApi.getTodos(),    // Fetcher function
  { initialData: [], staleTime: 30_000 }
);

todosResource();          // Todo[] | undefined — the data
todosResource.loading();  // boolean — is currently fetching
todosResource.error();    // Error | undefined — last error
todosResource.refetch();  // Manually trigger a refetch
todosResource.mutate(v);  // Optimistically set the data
```

The resource automatically fetches when created and re-fetches when any reactive dependency inside the fetcher changes.

### How `createAction` Works

```ts
const addTodoAction = createAction(
  (text: string) => mockApi.addTodo(text),  // Mutation function
  {
    onSuccess: (result, input) => { /* ... */ },
    onError: (error, input) => { /* ... */ },
    optimistic: (input) => { /* ... */ },
    revertOptimistic: (input) => { /* ... */ },
  }
);

await addTodoAction.execute('Buy milk');  // Execute the mutation
addTodoAction.loading();                   // boolean
addTodoAction.error();                     // Error | undefined
```

## Update the Page to Use the Resource

Replace the local signal state in `src/pages/AllTodos.akash`:

```html
<script>
  import { computed } from '@akashjs/runtime';
  import {
    todosResource,
    addTodoAction,
    toggleTodoAction,
    deleteTodoAction,
    editTodoAction,
  } from '../api/todos';
  import AddTodoForm from '../components/AddTodoForm.akash';
  import TodoList from '../components/TodoList.akash';

  const todos = computed(() => todosResource() ?? []);
  const totalCount = computed(() => todos().length);
  const completedCount = computed(() => todos().filter(t => t.completed).length);

  function handleAdd(text: string) {
    addTodoAction.execute(text);
  }

  function handleToggle(id: string) {
    toggleTodoAction.execute(id);
  }

  function handleDelete(id: string) {
    deleteTodoAction.execute(id);
  }

  function handleEdit(id: string, text: string) {
    editTodoAction.execute({ id, text });
  }
</script>

<template>
  <div>
    <AddTodoForm onAdd={handleAdd} />

    {#if todosResource.loading() && todos().length === 0}
      <div class="loading">Loading todos...</div>
    {:else if todosResource.error()}
      <div class="error">
        <p>Failed to load todos: {todosResource.error().message}</p>
        <button on:click={() => todosResource.refetch()}>Retry</button>
      </div>
    {:else}
      <p class="count">{totalCount()} total, {completedCount()} completed</p>
      <TodoList
        todos={todos()}
        onToggle={handleToggle}
        onDelete={handleDelete}
        onEdit={handleEdit}
      />
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

  .error {
    padding: 1rem;
    background: #fff5f5;
    border: 1px solid var(--danger, #e53e3e);
    border-radius: 8px;
    color: var(--danger, #e53e3e);
    text-align: center;
  }

  .error button {
    margin-top: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--danger, #e53e3e);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
</style>
```

Notice how the loading and error states are handled with `{#if}` blocks. The `todosResource.loading()` signal is reactive, so the UI automatically switches between loading, error, and data states.

## Optimistic Updates

Look at the toggle action again:

```ts
export const toggleTodoAction = createAction(
  (id: string) => mockApi.toggleTodo(id),
  {
    optimistic: (id) => {
      const current = todosResource() ?? [];
      todosResource.mutate(
        current.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
      );
    },
    revertOptimistic: () => {
      todosResource.refetch();
    },
  },
);
```

When you toggle a todo:

1. **Immediately**: `optimistic` runs and updates the UI via `mutate()`
2. **In the background**: The actual API call executes
3. **On success**: `onSuccess` refetches to get the canonical server state
4. **On failure**: `revertOptimistic` refetches to undo the optimistic update

The user sees instant feedback while the real request happens asynchronously.

::: tip Retry and Error Handling
The `@akashjs/http` package includes a `withRetry` interceptor for automatic retries:

```ts
import { createHttpClient, withRetry } from '@akashjs/http';

const http = createHttpClient({
  interceptors: [withRetry({ maxRetries: 3, delay: 1000 })],
});
```

See the [HTTP Guide](/guide/http) for more on interceptors, auth headers, and error handling patterns.
:::

## Try It

Test the data fetching:

1. Refresh the page and notice the brief "Loading todos..." message (simulated 300ms delay)
2. Toggle a todo and notice how the checkbox updates instantly (optimistic update)
3. Open the Network tab -- in a real app, you would see actual HTTP requests
4. Try adding the `refetchOnFocus: true` option to `createResource` and switch tabs, then come back

## Summary

You now know how to:

- Create an HTTP client with `createHttpClient`
- Fetch data reactively with `createResource` (loading, error, refetch, mutate)
- Perform mutations with `createAction` (loading, error, lifecycle hooks)
- Implement optimistic updates for instant UI feedback
- Handle loading and error states in templates

The data layer is working, but we still have duplicated state logic across pages. Let's fix that with a store.

---

**What's Next:** [State Management](./state.md) -- extract todo logic into a shared global store.
