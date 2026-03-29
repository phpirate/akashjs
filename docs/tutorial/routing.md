# Step 4: Routing

In this step, you will add multiple pages to the todo app -- All, Active, and Completed -- set up the router, create navigation links, and use `useRoute()` to highlight the active page.

## The Plan

Instead of one page showing all todos, the app will have three routes:

| Path | Page | Shows |
|------|------|-------|
| `/` | All | Every todo |
| `/active` | Active | Only incomplete todos |
| `/completed` | Completed | Only finished todos |

The filtering logic stays the same -- we just change which subset of todos we display based on the current route.

## Create Page Components

Create three page files. Each one will receive the todo list and filter it differently.

### `src/pages/AllTodos.akash`

```html
<script>
  import { signal, computed, effect } from '@akashjs/runtime';
  import type { Todo } from '../types';
  import TodoList from '../components/TodoList.akash';

  const todos = signal<Todo[]>([]);

  // Load from localStorage
  const saved = localStorage.getItem('todos');
  if (saved) {
    try { todos.set(JSON.parse(saved)); } catch {}
  }

  effect(() => {
    localStorage.setItem('todos', JSON.stringify(todos()));
  });

  const totalCount = computed(() => todos().length);
  const completedCount = computed(() => todos().filter(t => t.completed).length);

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

### `src/pages/ActiveTodos.akash`

```html
<script>
  import { signal, computed, effect } from '@akashjs/runtime';
  import type { Todo } from '../types';
  import TodoList from '../components/TodoList.akash';

  const todos = signal<Todo[]>([]);

  const saved = localStorage.getItem('todos');
  if (saved) {
    try { todos.set(JSON.parse(saved)); } catch {}
  }

  effect(() => {
    localStorage.setItem('todos', JSON.stringify(todos()));
  });

  const activeTodos = computed(() => todos().filter(t => !t.completed));

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
    <p class="count">{activeTodos().length} active</p>
    <TodoList todos={activeTodos()} onToggle={handleToggle} onDelete={handleDelete} />
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

### `src/pages/CompletedTodos.akash`

```html
<script>
  import { signal, computed, effect } from '@akashjs/runtime';
  import type { Todo } from '../types';
  import TodoList from '../components/TodoList.akash';

  const todos = signal<Todo[]>([]);

  const saved = localStorage.getItem('todos');
  if (saved) {
    try { todos.set(JSON.parse(saved)); } catch {}
  }

  effect(() => {
    localStorage.setItem('todos', JSON.stringify(todos()));
  });

  const completedTodos = computed(() => todos().filter(t => t.completed));

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
    <p class="count">{completedTodos().length} completed</p>
    <TodoList todos={completedTodos()} onToggle={handleToggle} onDelete={handleDelete} />
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

::: warning Code duplication ahead
You probably noticed that all three pages duplicate the todo state logic. This is intentional for now -- we will extract it into a shared store in [Step 7](./state.md). For this step, focus on understanding routing.
:::

## Configure the Router

Update `src/main.ts` to define all three routes:

```ts
import { createApp } from '@akashjs/runtime';
import { createRouter } from '@akashjs/router';
import App from './components/App.akash';

const router = createRouter([
  {
    path: '/',
    component: () => import('./pages/AllTodos.akash'),
  },
  {
    path: '/active',
    component: () => import('./pages/ActiveTodos.akash'),
  },
  {
    path: '/completed',
    component: () => import('./pages/CompletedTodos.akash'),
  },
]);

const app = createApp(App, {
  plugins: [router],
});

app.mount('#app');
```

Each route maps a URL path to a component. The `() => import(...)` syntax uses dynamic imports for lazy loading -- the page code is only fetched when the user navigates to that route.

::: tip Lazy Routes
Dynamic imports split each page into its own JavaScript chunk. Users only download the code for the page they are visiting. This keeps the initial bundle small and improves load time.
:::

## Add Navigation

Update `src/components/App.akash` to include navigation links:

```html
<script>
  import { RouterOutlet } from '@akashjs/router';
  import { Link } from '@akashjs/router';
  import { useRoute } from '@akashjs/router';

  const route = useRoute();
</script>

<template>
  <div class="app">
    <header class="header">
      <h1>AkashJS Todos</h1>
    </header>

    <nav class="nav">
      <Link to="/" class={route.path() === '/' ? 'nav-link active' : 'nav-link'}>
        All
      </Link>
      <Link to="/active" class={route.path() === '/active' ? 'nav-link active' : 'nav-link'}>
        Active
      </Link>
      <Link to="/completed" class={route.path() === '/completed' ? 'nav-link active' : 'nav-link'}>
        Completed
      </Link>
    </nav>

    <main class="content">
      <RouterOutlet />
    </main>
  </div>
</template>

<style scoped>
  .app {
    max-width: 640px;
    margin: 0 auto;
    padding: 2rem;
  }

  .header {
    margin-bottom: 1.5rem;
  }

  .header h1 {
    font-size: 1.5rem;
    font-weight: 700;
  }

  .nav {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .nav-link {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    text-decoration: none;
    color: var(--text, #2d3748);
    background: var(--surface, #edf2f7);
    font-size: 0.875rem;
    font-weight: 500;
    transition: background-color 0.15s;
  }

  .nav-link:hover {
    background: var(--surface-hover, #e2e8f0);
  }

  .nav-link.active {
    background: var(--primary, #3182ce);
    color: white;
  }

  .content {
    min-height: 200px;
  }
</style>
```

### How `Link` and `useRoute` Work

**`<Link to="/">`** renders an `<a>` tag that intercepts clicks. Instead of a full page reload, it uses the router's `navigate()` function to update the URL and swap the page component.

**`useRoute()`** returns reactive route information:

```ts
const route = useRoute();

route.path();    // Current pathname, e.g. '/active'
route.params();  // Route parameters, e.g. { id: '123' }
route.query();   // Query string as object, e.g. { search: 'milk' }
route.hash();    // Hash without #, e.g. 'section-1'
```

Because `route.path()` is a signal read, the class expression in the template re-evaluates whenever the URL changes. The active link highlights automatically.

## Programmatic Navigation

You can also navigate from JavaScript using `useNavigate()`:

```ts
import { useNavigate } from '@akashjs/router';

const navigate = useNavigate();

// Navigate to a path
navigate('/active');

// With options
navigate('/active', { replace: true });  // Replace history entry
navigate('/todo/:id', { params: { id: '123' } });  // Fill in params

// Go back/forward
navigate(-1);  // Back
navigate(1);   // Forward
```

## Route Parameters

While our todo app does not need route params yet, here is how they work for reference:

```ts
// In router config:
{ path: '/todo/:id', component: () => import('./pages/TodoDetail.akash') }

// In the component:
import { useParams } from '@akashjs/router';
const params = useParams();
const todoId = () => params().id;  // reactive
```

## Try It

Test out the routing:

1. Click the navigation links and watch the URL change without a page reload
2. Use the browser's back/forward buttons -- they work correctly
3. Manually type `http://localhost:5173/active` in the address bar -- the correct page loads
4. Open the Network tab in DevTools, then click a link -- notice the lazy-loaded chunk being fetched on first visit

## Summary

You now have a multi-page app with:

- Three routes for All, Active, and Completed views
- `<Link>` components for SPA navigation
- `useRoute()` for reactive route state
- Lazy-loaded page components for better performance

The pages work, but there is no way to add new todos yet. Let's add a form.

---

**What's Next:** [Forms](./forms.md) -- build a validated form to add and edit todos.
