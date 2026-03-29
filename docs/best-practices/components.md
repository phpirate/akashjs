# Component Best Practices

## Single Responsibility

Each component should do one thing well. If you are describing a component with "and", split it.

```html
<!-- DON'T: one component doing everything -->
<script lang="ts">
import { signal } from '@akashjs/runtime';
import { defineForm, required } from '@akashjs/forms';
import { createHttpClient } from '@akashjs/http';

const http = createHttpClient({ baseUrl: '/api' });
const users = signal([]);
const form = defineForm({
  name: { initial: '', validators: [required()] },
  email: { initial: '', validators: [required()] },
});

// ... 200 lines of fetching, form handling, table rendering, pagination
</script>
```

```html
<!-- DO: split into focused components -->
<!-- UserPage.akash — orchestrates -->
<script lang="ts">
import UserTable from './UserTable.akash';
import UserForm from './UserForm.akash';
</script>

<template>
  <div class="user-page">
    <UserForm onSubmit={handleCreate} />
    <UserTable />
  </div>
</template>
```

::: tip Size guideline
If a component template exceeds 100 lines, it probably does too much. Extract sub-components.
:::

## Props Interface Design

Keep props minimal and well-typed. Prefer specific types over broad ones.

```ts
// DON'T: vague props
interface Props {
  data: any;
  options: object;
  callback: Function;
}
```

```ts
// DO: specific, documented props
interface Props {
  /** User to display */
  user: { id: string; name: string; avatar: string };
  /** Whether the card is in compact mode */
  compact?: boolean;
  /** Called when the user clicks edit */
  onEdit?: (userId: string) => void;
}
```

::: tip Optional props with defaults
Use optional properties (`?`) and provide defaults in the component logic, not in the type.
:::

```html
<script lang="ts">
interface Props {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost';
}

const size = ctx.props.size ?? 'md';
const variant = ctx.props.variant ?? 'primary';
</script>
```

## Children vs Slots

Use `ctx.children()` for simple content projection. Use named callback props for multiple slots.

```html
<!-- Simple children — good for wrappers -->
<Card>
  <p>Card content goes here</p>
</Card>

<!-- Named slots via callback props — good for complex layouts -->
<DataCard
  header={() => <h2>Users</h2>}
  footer={() => <button>Load More</button>}
>
  <UserTable />
</DataCard>
```

```ts
// DataCard implementation
const DataCard = defineComponent<{
  header?: () => AkashNode;
  footer?: () => AkashNode;
}>((ctx) => {
  return () => (
    <div class="data-card">
      <div class="header">{ctx.props.header?.()}</div>
      <div class="body">{ctx.children()}</div>
      <div class="footer">{ctx.props.footer?.()}</div>
    </div>
  );
});
```

## defineComponent vs .akash SFC

Both produce the same output. The `.akash` SFC is the recommended default.

| Use `.akash` SFC when... | Use `defineComponent()` when... |
|---|---|
| Building most components | Writing headless/renderless components |
| You want scoped styles | You need programmatic DOM creation |
| You prefer template syntax | Building library components |
| You want compiler optimizations | The component has no template |

```ts
// Headless component — defineComponent makes sense
const ClickOutside = defineComponent<{ onClickOutside: () => void }>((ctx) => {
  onMount(() => {
    const handler = (e: MouseEvent) => {
      if (!el.contains(e.target as Node)) {
        ctx.props.onClickOutside();
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  });

  return () => ctx.children();
});
```

## Composition Over Inheritance

AkashJS has no component inheritance. Compose behavior with composables and wrapper components.

```ts
// DON'T: trying to "extend" a component
// (not possible and not desirable)
```

```ts
// DO: extract shared logic into composables
// composables/useSearch.ts
export function useSearch(fetcher: (q: string) => Promise<any[]>) {
  const query = signal('');
  const results = signal<any[]>([]);
  const loading = signal(false);

  watchDebounced(query, async (q) => {
    loading.set(true);
    results.set(await fetcher(q));
    loading.set(false);
  }, { wait: 300 });

  return { query, results, loading };
}
```

```html
<!-- UserSearch.akash -->
<script lang="ts">
import { useSearch } from '@/composables/useSearch';

const { query, results, loading } = useSearch(
  (q) => http.get(`/api/users?q=${q}`)
);
</script>
```

## Event Handling Conventions

Use callback props prefixed with `on` for component events. Do not emit events -- pass functions down.

```ts
// DON'T: event emitter pattern
interface Props {
  emit: (event: string, data: any) => void;
}
```

```ts
// DO: callback props
interface Props {
  onSelect?: (item: Item) => void;
  onDelete?: (id: string) => void;
  onCancel?: () => void;
}
```

## Keep Render Functions Pure

The render function returned from setup should not have side effects. Side effects belong in `effect()`, `onMount()`, or event handlers.

```ts
// DON'T: side effects in render
const Bad = defineComponent(() => {
  return () => {
    fetch('/api/track');  // runs on every render!
    return <div>...</div>;
  };
});
```

```ts
// DO: side effects in lifecycle or effects
const Good = defineComponent(() => {
  onMount(() => {
    fetch('/api/track');  // runs once
  });

  return () => <div>...</div>;
});
```

## Error Boundaries

Wrap risky components with `<ErrorBoundary>` to prevent crashes from propagating.

```html
<ErrorBoundary fallback={(err, retry) => (
  <div class="error-card">
    <p>Failed to load: {err.message}</p>
    <button onClick={retry}>Retry</button>
  </div>
)}>
  <Dashboard />
</ErrorBoundary>
```

::: tip Where to place error boundaries
Add an `<ErrorBoundary>` around each major section of your app (header, sidebar, main content, widgets). This way, a crash in one section does not take down the entire page.
:::
