# Step 9: Testing

In this step, you will write tests for the TodoItem component, the todo store, and form validation using AkashJS test utilities and Vitest.

## Testing Philosophy

AkashJS testing is designed to be simple:

- **No TestBed** -- no module configuration or `compileComponents()`
- **No shallow rendering** -- mount real components into a real (jsdom) DOM
- **Signal-aware** -- effects flush automatically between interactions

The test utilities are in `@akashjs/runtime/test`:

```ts
import { mount, fireEvent } from '@akashjs/runtime/test';
```

## Configure Vitest

Your project already has Vitest installed. Make sure your `vitest.config.ts` (or `vite.config.ts`) includes the AkashJS plugin:

```ts
import { defineConfig } from 'vitest/config';
import akash from '@akashjs/vite-plugin';

export default defineConfig({
  plugins: [akash()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

::: tip Why jsdom?
AkashJS renders real DOM nodes, not a virtual DOM. Tests need a DOM environment. The `jsdom` environment provides this without a real browser.
:::

## Test the TodoItem Component

Create `src/components/__tests__/TodoItem.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { mount, fireEvent } from '@akashjs/runtime/test';
import TodoItem from '../TodoItem.akash';

describe('TodoItem', () => {
  const baseTodo = {
    id: '1',
    text: 'Test todo',
    completed: false,
    createdAt: Date.now(),
  };

  it('renders the todo text', () => {
    const { getByText } = mount(TodoItem, {
      props: {
        todo: baseTodo,
        onToggle: vi.fn(),
        onDelete: vi.fn(),
        onEdit: vi.fn(),
      },
    });

    expect(getByText('Test todo')).toBeTruthy();
  });

  it('renders a checkbox that reflects completed state', () => {
    const { container } = mount(TodoItem, {
      props: {
        todo: { ...baseTodo, completed: true },
        onToggle: vi.fn(),
        onDelete: vi.fn(),
        onEdit: vi.fn(),
      },
    });

    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox).toBeTruthy();
    expect(checkbox.checked).toBe(true);
  });

  it('calls onToggle when checkbox is clicked', async () => {
    const onToggle = vi.fn();
    const { container } = mount(TodoItem, {
      props: {
        todo: baseTodo,
        onToggle,
        onDelete: vi.fn(),
        onEdit: vi.fn(),
      },
    });

    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    await fireEvent.click(checkbox);

    expect(onToggle).toHaveBeenCalledWith('1');
  });

  it('calls onDelete when delete button is clicked', async () => {
    const onDelete = vi.fn();
    const { getByText } = mount(TodoItem, {
      props: {
        todo: baseTodo,
        onToggle: vi.fn(),
        onDelete,
        onEdit: vi.fn(),
      },
    });

    const deleteBtn = getByText('Delete');
    await fireEvent.click(deleteBtn);

    expect(onDelete).toHaveBeenCalledWith('1');
  });

  it('enters edit mode when edit button is clicked', async () => {
    const { getByText, container } = mount(TodoItem, {
      props: {
        todo: baseTodo,
        onToggle: vi.fn(),
        onDelete: vi.fn(),
        onEdit: vi.fn(),
      },
    });

    const editBtn = getByText('Edit');
    await fireEvent.click(editBtn);

    const input = container.querySelector('.edit-input') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe('Test todo');
  });

  it('calls onEdit when saving an edit', async () => {
    const onEdit = vi.fn();
    const { getByText, container } = mount(TodoItem, {
      props: {
        todo: baseTodo,
        onToggle: vi.fn(),
        onDelete: vi.fn(),
        onEdit,
      },
    });

    // Enter edit mode
    await fireEvent.click(getByText('Edit'));

    // Change the text
    const input = container.querySelector('.edit-input') as HTMLInputElement;
    await fireEvent.input(input, 'Updated todo');

    // Save by pressing Enter
    await fireEvent.keyDown(input, 'Enter');

    expect(onEdit).toHaveBeenCalledWith('1', 'Updated todo');
  });

  it('cancels edit on Escape', async () => {
    const onEdit = vi.fn();
    const { getByText, container } = mount(TodoItem, {
      props: {
        todo: baseTodo,
        onToggle: vi.fn(),
        onDelete: vi.fn(),
        onEdit,
      },
    });

    await fireEvent.click(getByText('Edit'));

    const input = container.querySelector('.edit-input') as HTMLInputElement;
    await fireEvent.input(input, 'Changed text');
    await fireEvent.keyDown(input, 'Escape');

    // Should not call onEdit
    expect(onEdit).not.toHaveBeenCalled();

    // Should exit edit mode and show original text
    expect(getByText('Test todo')).toBeTruthy();
  });
});
```

### Key Testing Patterns

**`mount(Component, { props })`** renders the component into a real DOM element and returns query helpers:

- `getByText(text)` -- find element by text content (throws if not found)
- `getByRole(role)` -- find by ARIA role
- `getByTestId(id)` -- find by `data-testid` attribute
- `query(selector)` -- CSS selector, returns null if not found
- `queryAll(selector)` -- CSS selector, returns array
- `container` -- the root DOM element

**`fireEvent.click(el)`** dispatches a real DOM event and waits for effects to flush. Always `await` it.

**`fireEvent.input(el, value)`** sets an input's value and dispatches `input` + `change` events.

## Test the Todo Store

Create `src/stores/__tests__/todo-store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useTodoStore } from '../todo-store';
import { clearStores } from '@akashjs/runtime';

describe('useTodoStore', () => {
  beforeEach(() => {
    // Reset store singleton between tests
    clearStores();
    localStorage.clear();
  });

  it('starts with empty items', () => {
    const store = useTodoStore();
    expect(store.items()).toEqual([]);
    expect(store.totalCount()).toBe(0);
  });

  it('adds a todo', () => {
    const store = useTodoStore();
    store.addTodo('Buy milk');

    expect(store.items().length).toBe(1);
    expect(store.items()[0].text).toBe('Buy milk');
    expect(store.items()[0].completed).toBe(false);
    expect(store.totalCount()).toBe(1);
    expect(store.activeCount()).toBe(1);
  });

  it('toggles a todo', () => {
    const store = useTodoStore();
    store.addTodo('Buy milk');

    const id = store.items()[0].id;
    store.toggleTodo(id);

    expect(store.items()[0].completed).toBe(true);
    expect(store.completedCount()).toBe(1);
    expect(store.activeCount()).toBe(0);
  });

  it('deletes a todo', () => {
    const store = useTodoStore();
    store.addTodo('Buy milk');
    store.addTodo('Walk the dog');

    const id = store.items()[0].id;
    store.deleteTodo(id);

    expect(store.items().length).toBe(1);
    expect(store.items()[0].text).toBe('Walk the dog');
  });

  it('edits a todo', () => {
    const store = useTodoStore();
    store.addTodo('Buy milk');

    const id = store.items()[0].id;
    store.editTodo(id, 'Buy oat milk');

    expect(store.items()[0].text).toBe('Buy oat milk');
  });

  it('clears completed todos', () => {
    const store = useTodoStore();
    store.addTodo('Buy milk');
    store.addTodo('Walk the dog');
    store.addTodo('Read a book');

    // Complete the first two
    store.toggleTodo(store.items()[0].id);
    store.toggleTodo(store.items()[1].id);

    store.clearCompleted();

    expect(store.items().length).toBe(1);
    expect(store.items()[0].text).toBe('Read a book');
  });

  it('filters by active', () => {
    const store = useTodoStore();
    store.addTodo('Active todo');
    store.addTodo('Completed todo');
    store.toggleTodo(store.items()[1].id);

    store.setFilter('active');
    expect(store.filteredTodos().length).toBe(1);
    expect(store.filteredTodos()[0].text).toBe('Active todo');
  });

  it('filters by completed', () => {
    const store = useTodoStore();
    store.addTodo('Active todo');
    store.addTodo('Completed todo');
    store.toggleTodo(store.items()[1].id);

    store.setFilter('completed');
    expect(store.filteredTodos().length).toBe(1);
    expect(store.filteredTodos()[0].text).toBe('Completed todo');
  });

  it('resets to initial state', () => {
    const store = useTodoStore();
    store.addTodo('Buy milk');
    store.setFilter('active');

    store.$reset();

    expect(store.items()).toEqual([]);
    expect(store.filter()).toBe('all');
  });

  it('takes a snapshot', () => {
    const store = useTodoStore();
    store.addTodo('Buy milk');

    const snapshot = store.$snapshot();

    expect(snapshot.items.length).toBe(1);
    expect(snapshot.filter).toBe('all');
    expect(snapshot.loading).toBe(false);
  });
});
```

## Test Form Validation

Create `src/components/__tests__/AddTodoForm.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { defineForm } from '@akashjs/forms';
import { required, minLength, maxLength } from '@akashjs/forms';

describe('AddTodo form validation', () => {
  function createForm() {
    return defineForm({
      text: {
        initial: '',
        validators: [
          required('Todo text is required'),
          minLength(2, 'Must be at least 2 characters'),
          maxLength(200, 'Must be under 200 characters'),
        ],
      },
    });
  }

  it('starts invalid with empty text', () => {
    const form = createForm();
    expect(form.valid()).toBe(false);
  });

  it('shows required error on empty submit', () => {
    const form = createForm();
    const handler = vi.fn();

    form.submit(handler);

    expect(handler).not.toHaveBeenCalled();
    expect(form.fields.text.errors()).toContain('Todo text is required');
  });

  it('shows minLength error for short text', () => {
    const form = createForm();
    form.fields.text.value.set('a');
    form.fields.text.markTouched();

    expect(form.fields.text.errors()).toContain('Must be at least 2 characters');
  });

  it('is valid with proper text', () => {
    const form = createForm();
    form.fields.text.value.set('Buy groceries');

    expect(form.valid()).toBe(true);
    expect(form.fields.text.errors()).toEqual([]);
  });

  it('calls handler on valid submit', async () => {
    const form = createForm();
    const handler = vi.fn();

    form.fields.text.value.set('Buy groceries');
    await form.submit(handler);

    expect(handler).toHaveBeenCalledWith({ text: 'Buy groceries' });
  });

  it('resets the form', () => {
    const form = createForm();
    form.fields.text.value.set('Something');
    form.fields.text.markTouched();

    form.reset();

    expect(form.fields.text.value()).toBe('');
    expect(form.fields.text.touched()).toBe(false);
    expect(form.dirty()).toBe(false);
  });
});
```

## Run the Tests

```bash
pnpm test
```

You should see output like:

```
 ✓ src/components/__tests__/TodoItem.test.ts (7 tests)
 ✓ src/stores/__tests__/todo-store.test.ts (10 tests)
 ✓ src/components/__tests__/AddTodoForm.test.ts (6 tests)

 Test Files  3 passed (3)
      Tests  23 passed (23)
   Start at  10:30:00
   Duration  1.2s
```

::: tip Testing Strategy
For AkashJS apps, a good testing pyramid is:

1. **Store tests** (fast, pure logic) -- test all actions and getters
2. **Form validation tests** (fast, pure logic) -- test validators and submission flow
3. **Component tests** (medium, DOM) -- test rendering and user interaction
4. **E2E tests** (slow, browser) -- test critical user journeys with Playwright

Focus most effort on store and form tests. They are fast, reliable, and cover the most important logic.
:::

## Try It

Extend the tests:

1. Add a test that verifies the TodoItem shows strikethrough styling when completed
2. Add a store test for `hasCompleted` -- should return false when no items are completed
3. Add a form test that checks the `maxLength` validator with a 201-character string
4. Run `pnpm test --watch` to get live test feedback as you code

## Summary

You now know how to:

- Mount components with `mount()` and query the resulting DOM
- Simulate user interaction with `fireEvent` (click, input, keyDown)
- Test stores by calling actions and asserting getter values
- Test form validation logic independently of the DOM
- Run tests with Vitest in a jsdom environment

The app is built and tested. Let's ship it.

---

**What's Next:** [Deployment](./deployment.md) -- build for production and deploy your todo app.
