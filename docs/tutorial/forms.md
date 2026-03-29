# Step 5: Forms

In this step, you will build a form to add new todos using `defineForm` with validation, handle form submission, add inline editing with two-way binding, and display validation errors.

## The Forms Package

AkashJS forms are signal-based and declarative. You define fields with initial values and validators, and the framework gives you reactive state for values, errors, validity, and dirtiness -- all without manual event wiring.

## Create the AddTodo Form

Create `src/components/AddTodoForm.akash`:

```html
<script>
  import { defineForm } from '@akashjs/forms';
  import { required, minLength, maxLength } from '@akashjs/forms';

  export let onAdd: (text: string) => void;

  const form = defineForm({
    text: {
      initial: '',
      validators: [
        required('Todo text is required'),
        minLength(2, 'Must be at least 2 characters'),
        maxLength(200, 'Must be under 200 characters'),
      ],
    },
  });

  const textField = form.fields.text;

  function handleSubmit() {
    form.submit((values) => {
      onAdd(values.text);
      form.reset();
    });
  }
</script>

<template>
  <form class="add-form" on:submit|preventDefault={handleSubmit}>
    <div class="input-group">
      <input
        type="text"
        class="todo-input"
        class:invalid={textField.touched() && !textField.valid()}
        placeholder="What needs to be done?"
        value={textField.value()}
        on:input={(e) => textField.value.set(e.target.value)}
        on:blur={() => textField.markTouched()}
      />
      <button type="submit" class="add-button" disabled={!form.valid()}>
        Add
      </button>
    </div>

    {#if textField.touched() && textField.errors().length > 0}
      <div class="errors">
        {#each textField.errors() as error}
          <p class="error-message">{error}</p>
        {/each}
      </div>
    {/if}
  </form>
</template>

<style scoped>
  .add-form {
    margin-bottom: 1rem;
  }

  .input-group {
    display: flex;
    gap: 0.5rem;
  }

  .todo-input {
    flex: 1;
    padding: 0.75rem 1rem;
    border: 2px solid var(--border, #e2e8f0);
    border-radius: 8px;
    font-size: 1rem;
    outline: none;
    transition: border-color 0.15s;
  }

  .todo-input:focus {
    border-color: var(--primary, #3182ce);
  }

  .todo-input.invalid {
    border-color: var(--danger, #e53e3e);
  }

  .add-button {
    padding: 0.75rem 1.5rem;
    background: var(--primary, #3182ce);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .add-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .add-button:not(:disabled):hover {
    opacity: 0.9;
  }

  .errors {
    margin-top: 0.5rem;
  }

  .error-message {
    color: var(--danger, #e53e3e);
    font-size: 0.8rem;
    margin: 0.25rem 0;
  }
</style>
```

Let's walk through the key parts.

### `defineForm()` -- Declarative Form Definition

```ts
const form = defineForm({
  text: {
    initial: '',
    validators: [
      required('Todo text is required'),
      minLength(2, 'Must be at least 2 characters'),
      maxLength(200, 'Must be under 200 characters'),
    ],
  },
});
```

Each field has an `initial` value and an array of `validators`. Validators are factory functions that return a validation function. The validation function returns `null` (valid) or an error message string.

### Field API

Every field from `form.fields` has these reactive properties:

```ts
const textField = form.fields.text;

textField.value();       // Current value (signal)
textField.value.set(v);  // Set the value
textField.errors();      // Array of error messages
textField.valid();       // Boolean — true if all validators pass
textField.dirty();       // Boolean — true if value differs from initial
textField.touched();     // Boolean — true after markTouched() is called
textField.markTouched(); // Mark as touched (show errors)
textField.reset();       // Reset to initial value
```

### Form-Level API

```ts
form.valid();           // True if ALL fields are valid
form.dirty();           // True if ANY field is dirty
form.values();          // Plain object of current values
form.errors();          // Object mapping field names to error arrays
form.submit(handler);   // Touch all fields, validate, then call handler if valid
form.handleSubmit(fn);  // Returns an event handler (calls preventDefault)
form.reset();           // Reset all fields
```

### Event Modifiers

```html
<form on:submit|preventDefault={handleSubmit}>
```

The `|preventDefault` modifier calls `event.preventDefault()` before your handler. Other available modifiers include `|stopPropagation`, `|once`, and `|self`.

## Add the Form to the Page

Update `src/pages/AllTodos.akash` to include the form:

```html
<script>
  import { signal, computed, effect } from '@akashjs/runtime';
  import type { Todo } from '../types';
  import AddTodoForm from '../components/AddTodoForm.akash';
  import TodoList from '../components/TodoList.akash';

  const todos = signal<Todo[]>([]);

  const saved = localStorage.getItem('todos');
  if (saved) {
    try { todos.set(JSON.parse(saved)); } catch {}
  }

  effect(() => {
    localStorage.setItem('todos', JSON.stringify(todos()));
  });

  const totalCount = computed(() => todos().length);
  const completedCount = computed(() => todos().filter(t => t.completed).length);

  function handleAdd(text: string) {
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      createdAt: Date.now(),
    };
    todos.update(list => [...list, newTodo]);
  }

  function handleToggle(id: string) {
    todos.update(list =>
      list.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    );
  }

  function handleDelete(id: string) {
    todos.update(list => list.filter(t => t.id !== id));
  }
</script>

<template>
  <div>
    <AddTodoForm onAdd={handleAdd} />
    <p class="count">{totalCount()} total, {completedCount()} completed</p>
    <TodoList todos={todos()} onToggle={handleToggle} onDelete={handleDelete} />
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

## Add Inline Editing

Let's make todo text editable. Update `src/components/TodoItem.akash`:

```html
<script>
  import { signal } from '@akashjs/runtime';
  import type { Todo } from '../types';

  export let todo: Todo;
  export let onToggle: (id: string) => void;
  export let onDelete: (id: string) => void;
  export let onEdit: (id: string, text: string) => void;

  const isEditing = signal(false);
  const editText = signal('');

  function startEdit() {
    editText.set(todo.text);
    isEditing.set(true);
  }

  function saveEdit() {
    const trimmed = editText().trim();
    if (trimmed && trimmed !== todo.text) {
      onEdit(todo.id, trimmed);
    }
    isEditing.set(false);
  }

  function cancelEdit() {
    isEditing.set(false);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') cancelEdit();
  }
</script>

<template>
  <div class="todo-item" class:completed={todo.completed}>
    {#if isEditing()}
      <input
        type="text"
        class="edit-input"
        value={editText()}
        on:input={(e) => editText.set(e.target.value)}
        on:blur={saveEdit}
        on:keydown={handleKeyDown}
        autofocus
      />
    {:else}
      <label class="todo-label">
        <input
          type="checkbox"
          checked={todo.completed}
          on:change={() => onToggle(todo.id)}
        />
        <span class="todo-text">{todo.text}</span>
      </label>
      <div class="actions">
        <button class="edit-btn" on:click={startEdit}>Edit</button>
        <button class="delete-btn" on:click={() => onDelete(todo.id)}>Delete</button>
      </div>
    {/if}
  </div>
</template>

<style scoped>
  .todo-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border, #e2e8f0);
  }

  .todo-label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    flex: 1;
  }

  .completed .todo-text {
    text-decoration: line-through;
    opacity: 0.5;
  }

  .edit-input {
    flex: 1;
    padding: 0.5rem;
    border: 2px solid var(--primary, #3182ce);
    border-radius: 4px;
    font-size: 1rem;
    outline: none;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  .edit-btn, .delete-btn {
    background: none;
    border: 1px solid var(--border, #e2e8f0);
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    font-size: 0.8rem;
  }

  .delete-btn {
    border-color: var(--danger, #e53e3e);
    color: var(--danger, #e53e3e);
  }

  .delete-btn:hover {
    background: var(--danger, #e53e3e);
    color: white;
  }
</style>
```

Add the `onEdit` handler to `TodoList.akash` and pass it through:

```html
<script>
  import type { Todo } from '../types';
  import TodoItem from './TodoItem.akash';

  export let todos: Todo[];
  export let onToggle: (id: string) => void;
  export let onDelete: (id: string) => void;
  export let onEdit: (id: string, text: string) => void;
</script>

<template>
  <div class="todo-list">
    {#if todos.length === 0}
      <div class="empty-state">
        <p>No todos here.</p>
      </div>
    {:else}
      {#each todos as todo (todo.id)}
        <TodoItem
          todo={todo}
          onToggle={onToggle}
          onDelete={onDelete}
          onEdit={onEdit}
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

Then wire `handleEdit` in `AllTodos.akash`:

```ts
function handleEdit(id: string, text: string) {
  todos.update(list =>
    list.map(t => t.id === id ? { ...t, text } : t)
  );
}
```

And pass `onEdit={handleEdit}` to `<TodoList>`.

::: info Zod Integration
For complex validation schemas, AkashJS forms integrate with Zod. Instead of individual validators, you can pass a Zod schema:

```ts
import { defineForm, zodSchema } from '@akashjs/forms';
import { z } from 'zod';

const form = defineForm(zodSchema(z.object({
  email: z.string().email(),
  password: z.string().min(8),
})));
```

See the [Forms Guide](/guide/forms) for the full Zod integration API.
:::

## Try It

Test out the forms:

1. Try submitting an empty form -- the validation error should appear
2. Type a single character and see the "Must be at least 2 characters" error
3. Add a few todos and verify they appear in the list
4. Double-click the Edit button on a todo, change the text, and press Enter to save
5. Press Escape while editing to cancel

## Summary

You now know how to:

- Define forms with `defineForm()` and declarative validators
- Access field state: `value()`, `errors()`, `valid()`, `touched()`, `dirty()`
- Submit forms with validation using `form.submit(handler)`
- Use event modifiers like `|preventDefault`
- Build inline editing with local signal state

The app is getting real. But all the data is in localStorage. Let's connect it to an API.

---

**What's Next:** [Data Fetching](./data-fetching.md) -- add an HTTP client and load todos from a server.
