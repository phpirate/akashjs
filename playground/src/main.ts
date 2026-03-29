/**
 * AkashJS Playground — Manual integration test.
 *
 * This demonstrates the runtime APIs directly (without the compiler)
 * to verify that signals, components, and DOM rendering work end-to-end.
 */

import {
  signal,
  computed,
  effect,
  batch,
  defineComponent,
  onMount,
  ref,
  createElement,
  createText,
  bindText,
  bindProperty,
  renderConditional,
  renderList,
  createContext,
  provide,
  inject,
  insert,
} from '@akashjs/runtime';

// --- Simple Counter Component ---
const Counter = defineComponent<{ initial: number }>((ctx) => {
  const count = signal(ctx.props.initial);
  const doubled = computed(() => count() * 2);

  onMount(() => {
    console.log('[AkashJS] Counter mounted');
  });

  return () => {
    const container = createElement('div', { class: 'counter' });

    const label = createText('');
    bindText(label, () => `Count: ${count()} (doubled: ${doubled()})`);
    container.appendChild(label);

    const btn = createElement('button');
    btn.textContent = '+1';
    btn.addEventListener('click', () => count.update((c) => c + 1));
    container.appendChild(btn);

    const resetBtn = createElement('button');
    resetBtn.textContent = 'Reset';
    resetBtn.addEventListener('click', () => count.set(0));
    container.appendChild(resetBtn);

    return container;
  };
});

// --- Todo List Component ---
const TodoList = defineComponent(() => {
  const todos = signal([
    { id: 1, text: 'Learn AkashJS', done: false },
    { id: 2, text: 'Build something', done: false },
  ]);
  const nextId = signal(3);
  const input = signal('');

  function addTodo() {
    const text = input().trim();
    if (!text) return;
    batch(() => {
      todos.update((t) => [...t, { id: nextId(), text, done: false }]);
      nextId.update((n) => n + 1);
      input.set('');
    });
  }

  function toggleTodo(id: number) {
    todos.update((t) =>
      t.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)),
    );
  }

  function removeTodo(id: number) {
    todos.update((t) => t.filter((todo) => todo.id !== id));
  }

  return () => {
    const container = createElement('div', { class: 'todo-list' });

    const heading = createElement('h2');
    heading.textContent = 'Todo List';
    container.appendChild(heading);

    // Input row
    const inputRow = createElement('div', { class: 'input-row' });
    const inputEl = createElement('input') as HTMLInputElement;
    inputEl.type = 'text';
    inputEl.placeholder = 'Add a todo...';
    bindProperty(inputEl, 'value', () => input());
    inputEl.addEventListener('input', (e) => input.set((e.target as HTMLInputElement).value));
    inputEl.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') addTodo();
    });
    inputRow.appendChild(inputEl);

    const addBtn = createElement('button');
    addBtn.textContent = 'Add';
    addBtn.addEventListener('click', addTodo);
    inputRow.appendChild(addBtn);
    container.appendChild(inputRow);

    // Todo items
    const listEl = createElement('ul');
    const anchor = document.createComment('todos');
    listEl.appendChild(anchor);

    renderList(
      listEl,
      anchor,
      () => todos(),
      (todo) => todo.id,
      (todo) => {
        const li = createElement('li');

        const checkbox = createElement('input') as HTMLInputElement;
        checkbox.type = 'checkbox';
        checkbox.checked = todo.done;
        checkbox.addEventListener('change', () => toggleTodo(todo.id));
        li.appendChild(checkbox);

        const text = createElement('span');
        text.textContent = todo.text;
        if (todo.done) text.style.textDecoration = 'line-through';
        li.appendChild(text);

        const removeBtn = createElement('button');
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', () => removeTodo(todo.id));
        li.appendChild(removeBtn);

        return li;
      },
    );

    container.appendChild(listEl);

    // Count
    const countText = createText('');
    bindText(countText, () => {
      const remaining = todos().filter((t) => !t.done).length;
      return `${remaining} item${remaining !== 1 ? 's' : ''} remaining`;
    });
    container.appendChild(countText);

    return container;
  };
});

// --- Mount the app ---
const app = document.getElementById('app')!;

const title = createElement('h1');
title.textContent = '🚀 AkashJS Playground';
app.appendChild(title);

app.appendChild(Counter({ initial: 0 }));
app.appendChild(createElement('hr'));
app.appendChild(TodoList({}));

// Add some basic styles
const style = document.createElement('style');
style.textContent = `
  body { font-family: system-ui, sans-serif; max-width: 600px; margin: 2rem auto; padding: 0 1rem; }
  .counter { display: flex; gap: 8px; align-items: center; margin: 1rem 0; }
  .counter button { padding: 4px 12px; cursor: pointer; }
  .todo-list { margin: 1rem 0; }
  .input-row { display: flex; gap: 8px; margin-bottom: 1rem; }
  .input-row input { flex: 1; padding: 6px; }
  .input-row button { padding: 6px 16px; cursor: pointer; }
  ul { list-style: none; padding: 0; }
  li { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
  li button { background: none; border: none; color: red; cursor: pointer; font-size: 18px; }
`;
document.head.appendChild(style);
