# Migrating from React

## Concept Mapping

| React | AkashJS | Notes |
|---|---|---|
| `useState` | `signal()` | No re-renders. Signal updates patch the DOM directly. |
| `useEffect` | `effect()` | No dependency array. Dependencies are auto-tracked. |
| `useContext` | `inject()` | Same concept, different API. |
| `useMemo` | `computed()` | Lazy by default, auto-tracked. |
| `useCallback` | Not needed | No re-renders means no stale closures. |
| `useRef` | `signal()` with `.peek()` | Or plain variable in setup function. |
| `React.lazy` | `defineAsyncComponent()` | Same concept, simpler API. |
| `Suspense` | `<Suspense>` | Same concept. |
| `ErrorBoundary` (class) | `<ErrorBoundary>` (component) | No class required. |
| Redux / Zustand | `defineStore()` | Built-in, signal-based. |
| React Router | `@akashjs/router` | File-based routing with guards and loaders. |
| JSX | `.akash` templates | Similar syntax. `{}` for expressions. `<>` fragments supported. |
| `key` prop | `key` function in `<For>` | Function instead of prop. |
| `className` | `class` | Standard HTML attribute name. |
| `children` | `ctx.children()` | Function call, not prop. |
| Hooks rules | No rules | Call signals anywhere, any order, conditionally. |
| `React.memo` | Not needed | Signals update only what changed. No component re-renders. |

## Key Differences

### No Re-Renders

This is the biggest conceptual shift. In React, when state changes, the entire component function re-executes and React diffs the output. In AkashJS, the setup function runs **once**. Signal changes patch the **specific DOM nodes** that read those signals.

```tsx
// React: entire function re-runs on count change
function Counter() {
  const [count, setCount] = useState(0);
  console.log('render'); // logs on every click
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

```html
<!-- AkashJS: setup runs once, only the text node updates -->
<script lang="ts">
import { signal } from '@akashjs/runtime';

const count = signal(0);
console.log('setup'); // logs once
</script>

<template>
  <button onClick={() => count.update(c => c + 1)}>{count()}</button>
</template>
```

### No Dependency Arrays

React's `useEffect` requires you to list dependencies manually. Get it wrong and you have stale closures or infinite loops. AkashJS effects auto-track dependencies.

```tsx
// React: manual dependency array
useEffect(() => {
  fetchUser(userId);
}, [userId]); // forget userId here and you have a bug
```

```ts
// AkashJS: auto-tracked
effect(() => {
  fetchUser(userId()); // re-runs when userId changes, automatically
});
```

### No Hooks Rules

In React, hooks must be called at the top level, in the same order, and not inside conditionals. AkashJS has none of these restrictions.

```ts
// AkashJS: signals work anywhere
const MyComponent = defineComponent((ctx) => {
  const showExtra = signal(false);

  // Conditional signal creation is fine
  if (ctx.props.advanced) {
    const extra = signal('extra data');
  }

  // Signals in loops are fine
  const items = ctx.props.list.map(item => signal(item));

  return () => <div>...</div>;
});
```

## Side-by-Side Examples

### 1. State and Events

**React:**
```tsx
function Counter({ initial = 0 }: { initial?: number }) {
  const [count, setCount] = useState(initial);
  return (
    <div>
      <span>{count}</span>
      <button onClick={() => setCount(c => c + 1)}>+</button>
    </div>
  );
}
```

**AkashJS:**
```html
<script lang="ts">
import { signal } from '@akashjs/runtime';

interface Props { initial?: number }

const count = signal(ctx.props.initial ?? 0);
</script>

<template>
  <div>
    <span>{count()}</span>
    <button onClick={() => count.update(c => c + 1)}>+</button>
  </div>
</template>
```

### 2. Derived State

**React:**
```tsx
const [items, setItems] = useState<Item[]>([]);
const total = useMemo(() => items.reduce((s, i) => s + i.price, 0), [items]);
```

**AkashJS:**
```ts
const items = signal<Item[]>([]);
const total = computed(() => items().reduce((s, i) => s + i.price, 0));
```

### 3. Side Effects

**React:**
```tsx
useEffect(() => {
  const handler = () => console.log('resize');
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}, []);
```

**AkashJS:**
```ts
onMount(() => {
  const handler = () => console.log('resize');
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
});
```

### 4. Context

**React:**
```tsx
const ThemeContext = createContext('light');

function App() {
  return (
    <ThemeContext.Provider value="dark">
      <Child />
    </ThemeContext.Provider>
  );
}

function Child() {
  const theme = useContext(ThemeContext);
  return <div className={theme}>...</div>;
}
```

**AkashJS:**
```ts
import { createContext, provide, inject } from '@akashjs/runtime';

const ThemeContext = createContext<'light' | 'dark'>('light');

// In parent
provide(ThemeContext, 'dark');

// In descendant
const theme = inject(ThemeContext);
```

### 5. Data Fetching

**React:**
```tsx
const [data, setData] = useState<User | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<Error | null>(null);

useEffect(() => {
  let cancelled = false;
  fetch(`/api/users/${id}`)
    .then(r => r.json())
    .then(d => { if (!cancelled) setData(d); })
    .catch(e => { if (!cancelled) setError(e); })
    .finally(() => { if (!cancelled) setLoading(false); });
  return () => { cancelled = true; };
}, [id]);
```

**AkashJS:**
```ts
import { createResource } from '@akashjs/http';

const user = createResource(
  () => http.get<User>(`/users/${userId()}`),
  { key: () => userId() },
);

// user() — data
// user.loading() — boolean
// user.error() — Error | undefined
```

## Migration Plan

### Phase 1: Setup (1 day)
1. Install `@akashjs/runtime`, `@akashjs/vite-plugin`, and other needed packages.
2. Configure Vite to handle `.akash` files alongside your existing React setup.
3. Both React and AkashJS components can coexist in the same Vite project.

### Phase 2: Migrate State (1 week)
1. Replace Redux/Zustand stores with `defineStore()`.
2. Replace `useState` + `useReducer` patterns with `signal()`.
3. Replace `useMemo` with `computed()`.
4. Replace `useEffect` with `effect()` or `onMount()`.

### Phase 3: Migrate Components (2-3 weeks)
1. Convert leaf components first (buttons, inputs, cards).
2. Replace JSX with `.akash` template syntax.
3. Replace `className` with `class`, `htmlFor` with `for`.
4. Replace `React.memo` wrappers -- they are not needed in AkashJS.

### Phase 4: Migrate Routing (1 week)
1. Set up `@akashjs/router` with file-based routes.
2. Convert React Router `<Route>` components to file-based `page.akash` files.
3. Convert route loaders and guards.

### Phase 5: Remove React (1 day)
1. Remove `react`, `react-dom`, and related packages.
2. Remove any React-specific configuration.

::: tip What you will not miss
- No more stale closures from forgotten dependency arrays.
- No more `React.memo` / `useCallback` / `useMemo` to avoid re-renders.
- No more hook ordering rules.
- No more "Cannot update a component while rendering a different component" errors.
:::
