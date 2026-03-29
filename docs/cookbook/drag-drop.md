# Drag and Drop

## Problem

You need drag-and-drop for sortable lists and Kanban boards with smooth FLIP animations and drop zone highlighting.

## Solution

Use the HTML5 Drag and Drop API with `createFlip` from `@akashjs/runtime` for animated reordering.

### 1. Sortable List

```ts
// src/sortable.ts
import { signal } from '@akashjs/runtime';
import { createFlip } from '@akashjs/runtime';

interface Item {
  id: string;
  label: string;
}

const items = signal<Item[]>([
  { id: '1', label: 'Review pull request' },
  { id: '2', label: 'Write unit tests' },
  { id: '3', label: 'Update documentation' },
  { id: '4', label: 'Deploy to staging' },
  { id: '5', label: 'Team standup' },
]);

let draggedId: string | null = null;
let listEl: HTMLElement | null = null;
let flip: ReturnType<typeof createFlip> | null = null;

function initList(el: HTMLElement) {
  listEl = el;
  flip = createFlip(el, {
    duration: 250,
    easing: 'cubic-bezier(0.2, 0, 0, 1)',
    keyAttribute: 'data-id',
  });
}

function handleDragStart(e: DragEvent, id: string) {
  draggedId = id;
  e.dataTransfer!.effectAllowed = 'move';
  (e.target as HTMLElement).classList.add('dragging');
}

function handleDragOver(e: DragEvent) {
  e.preventDefault();
  e.dataTransfer!.dropEffect = 'move';

  const target = (e.target as HTMLElement).closest('[data-id]');
  if (!target || !draggedId) return;
  const targetId = target.getAttribute('data-id');
  if (targetId === draggedId) return;

  // Determine drop position (above or below midpoint)
  const rect = target.getBoundingClientRect();
  const midY = rect.top + rect.height / 2;
  const position = e.clientY < midY ? 'before' : 'after';

  // Reorder with FLIP animation
  flip?.measure();
  items.update((list) => {
    const fromIdx = list.findIndex((i) => i.id === draggedId);
    let toIdx = list.findIndex((i) => i.id === targetId);
    if (position === 'after') toIdx++;
    if (fromIdx < toIdx) toIdx--;

    const updated = [...list];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    return updated;
  });
  requestAnimationFrame(() => flip?.animate());
}

function handleDragEnd(e: DragEvent) {
  draggedId = null;
  (e.target as HTMLElement).classList.remove('dragging');
}
```

### 2. Sortable List Template

```html
<ul class="sortable-list" :ref={initList}>
  <li :for={item of items()} :key={item.id}
      data-id={item.id}
      draggable="true"
      @dragstart={e => handleDragStart(e, item.id)}
      @dragover={handleDragOver}
      @dragend={handleDragEnd}
      class="sortable-item">
    <span class="drag-handle">&#x2630;</span>
    <span>{item.label}</span>
  </li>
</ul>
```

::: tip
Use `createFlip` to animate reorder transitions. Without it, items snap to new positions instantly, which feels jarring.
:::

### 3. Kanban Board

```ts
// src/kanban.ts
import { signal } from '@akashjs/runtime';

interface Task { id: string; title: string; }
type Column = 'todo' | 'doing' | 'done';

const columns = signal<Record<Column, Task[]>>({
  todo: [
    { id: 't1', title: 'Design mockups' },
    { id: 't2', title: 'Set up CI pipeline' },
  ],
  doing: [
    { id: 't3', title: 'Implement auth' },
  ],
  done: [
    { id: 't4', title: 'Project setup' },
  ],
});

let draggedTask: { task: Task; from: Column } | null = null;
const dropTarget = signal<Column | null>(null);

function startDrag(e: DragEvent, task: Task, from: Column) {
  draggedTask = { task, from };
  e.dataTransfer!.effectAllowed = 'move';
}

function dragOverColumn(e: DragEvent, column: Column) {
  e.preventDefault();
  e.dataTransfer!.dropEffect = 'move';
  dropTarget.set(column);
}

function leaveColumn() {
  dropTarget.set(null);
}

function dropOnColumn(column: Column) {
  if (!draggedTask) return;
  const { task, from } = draggedTask;

  columns.update((cols) => ({
    ...cols,
    [from]: cols[from].filter((t) => t.id !== task.id),
    [column]: [...cols[column], task],
  }));

  draggedTask = null;
  dropTarget.set(null);
}
```

### 4. Kanban Template

```html
<div class="kanban-board">
  <div :for={col of ['todo', 'doing', 'done']} :key={col}
       class="kanban-column"
       :class="{ 'drop-highlight': dropTarget() === col }"
       @dragover={e => dragOverColumn(e, col)}
       @dragleave={leaveColumn}
       @drop={() => dropOnColumn(col)}>

    <h3 class="column-title">
      {col.toUpperCase()}
      <span class="count">{columns()[col].length}</span>
    </h3>

    <div :for={task of columns()[col]} :key={task.id}
         class="kanban-card"
         draggable="true"
         @dragstart={e => startDrag(e, task, col)}>
      {task.title}
    </div>

    <div :if={columns()[col].length === 0} class="empty-column">
      Drop tasks here
    </div>
  </div>
</div>
```

::: warning
HTML5 drag events do not work on mobile. For touch support, listen to `touchstart`, `touchmove`, and `touchend` and implement a custom drag layer using `position: fixed` and `transform: translate()`.
:::

### 5. Styles

```css
.sortable-list {
  list-style: none;
  padding: 0;
  max-width: 400px;
}
.sortable-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  margin-bottom: 0.5rem;
  cursor: grab;
  transition: box-shadow 0.2s;
}
.sortable-item:active { cursor: grabbing; }
.sortable-item.dragging { opacity: 0.4; }
.drag-handle { color: var(--color-text-muted); cursor: grab; }

.kanban-board { display: flex; gap: 1rem; overflow-x: auto; padding: 1rem; }
.kanban-column {
  flex: 1;
  min-width: 250px;
  background: var(--color-surface);
  border-radius: 12px;
  padding: 1rem;
  transition: background 0.2s;
}
.kanban-column.drop-highlight {
  background: rgba(103, 80, 164, 0.08);
  outline: 2px dashed var(--color-primary);
}
.kanban-card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  cursor: grab;
}
.kanban-card:active { cursor: grabbing; }
.column-title {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
}
.count {
  background: var(--color-border);
  border-radius: 9999px;
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
}
.empty-column {
  text-align: center;
  color: var(--color-text-muted);
  padding: 2rem 1rem;
  font-size: 0.875rem;
}
```

::: details Touch Support Skeleton
```ts
// Minimal touch drag implementation
let touchClone: HTMLElement | null = null;

function onTouchStart(e: TouchEvent, task: Task, from: Column) {
  const touch = e.touches[0];
  const el = e.target as HTMLElement;
  touchClone = el.cloneNode(true) as HTMLElement;
  touchClone.style.cssText = `position:fixed;z-index:9999;pointer-events:none;
    width:${el.offsetWidth}px;opacity:0.8;`;
  document.body.appendChild(touchClone);
  draggedTask = { task, from };
  moveTouchClone(touch);
}

function onTouchMove(e: TouchEvent) {
  e.preventDefault();
  moveTouchClone(e.touches[0]);
  // Hit test to find which column we are over
}

function onTouchEnd() {
  touchClone?.remove();
  touchClone = null;
  // Complete drop based on last hit-tested column
}

function moveTouchClone(touch: Touch) {
  if (!touchClone) return;
  touchClone.style.left = touch.clientX - 40 + 'px';
  touchClone.style.top = touch.clientY - 20 + 'px';
}
```
:::

## Result

A drag-and-drop system with a sortable list using FLIP animations, a Kanban board with column-to-column dragging, drop zone highlighting, and a touch support skeleton for mobile devices.
