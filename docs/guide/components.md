# Components

Components in AkashJS are functions. No classes, no decorators, no `ngOnInit`.

## defineComponent()

```ts
import { defineComponent, signal } from '@akashjs/runtime';

const Counter = defineComponent<{ initial: number }>((ctx) => {
  const count = signal(ctx.props.initial);

  return () => {
    const div = document.createElement('div');
    div.textContent = `Count: ${count()}`;
    return div;
  };
});
```

The setup function runs **once** per instance. It receives a context with typed props and returns a render function.

## Single-File Components

The preferred way to write components is `.akash` files:

```html
<script lang="ts">
import { signal } from '@akashjs/runtime';

interface Props {
  initial: number;
}

const count = signal(ctx.props.initial);
const increment = () => count.update(c => c + 1);
</script>

<template>
  <div>
    <span>{count()}</span>
    <button onClick={increment}>+</button>
  </div>
</template>

<style scoped>
div { display: flex; gap: 1rem; }
</style>
```

The compiler transforms this into a `defineComponent()` call with direct DOM operations.

## Props

Props are typed via TypeScript interfaces:

```html
<script lang="ts">
interface Props {
  name: string;
  count?: number;  // optional
}
</script>

<template>
  <p>{ctx.props.name}: {ctx.props.count ?? 0}</p>
</template>
```

## Spread Props

Spread an object of attributes onto an element or component:

```html
<script lang="ts">
const buttonProps = { class: 'btn', disabled: true, 'aria-label': 'Submit' };
</script>

<template>
  <button {...buttonProps}>Submit</button>
  <MyComponent {...sharedProps} extra="value" />
</template>
```

For elements, spread keys are applied as attributes, DOM properties, or event listeners (keys starting with `on`). For components, spreads are merged into the props object.

## Children

Components receive children via `ctx.children()`:

```ts
const Card = defineComponent((ctx) => {
  return () => {
    const div = document.createElement('div');
    div.className = 'card';
    div.appendChild(nodeToDOM(ctx.children()));
    return div;
  };
});
```

## Lifecycle Hooks

```ts
import { defineComponent, onMount, onUnmount, onError } from '@akashjs/runtime';

const MyComponent = defineComponent(() => {
  onMount(() => {
    console.log('Mounted!');
    return () => console.log('Cleanup on unmount');
  });

  onUnmount(() => {
    console.log('Unmounting!');
  });

  onError((err) => {
    console.error('Error caught:', err);
  });

  return () => document.createElement('div');
});
```

- **onMount** — Runs after DOM insertion. Return a cleanup function for unmount.
- **onUnmount** — Runs before DOM removal.
- **onError** — Catches errors from this component and descendants.

## Context (Dependency Injection)

Provide and inject values through the component tree:

```ts
import { createContext, provide, inject } from '@akashjs/runtime';

const ThemeContext = createContext<'light' | 'dark'>('light');

// In a parent:
provide(ThemeContext, 'dark');

// In a descendant:
const theme = inject(ThemeContext); // 'dark'
```

## class:name Directive

Toggle individual CSS classes with the `class:name` directive. It compiles to `classList.toggle()` for efficient updates:

```html
<template>
  <div class="btn" class:active={isActive()} class:disabled={isDisabled()}>
    Click me
  </div>

  <!-- Multiple class directives on one element -->
  <li class="item" class:selected={item.selected()} class:dragging={isDragging()}>
    {item.label()}
  </li>
</template>
```

The `class:name` directive works alongside the static `class` attribute. Static classes are always present; directive classes are toggled based on the expression.

## Block Syntax

AkashJS templates support block-level control flow with `{#if}`, `{#each}`, and their variants:

```html
<template>
  {#if user()}
    <Dashboard user={user()} />
  {:else if isLoading()}
    <Spinner />
  {:else}
    <LoginForm />
  {/if}

  {#each items() as item (item.id)}
    <ListItem data={item} />
  {:empty}
    <p>No items found.</p>
  {/each}
</template>
```

- `{#if condition}` ... `{:else if condition}` ... `{:else}` ... `{/if}` — conditional rendering
- `{#each list as item (key)}` ... `{:empty}` ... `{/each}` — list rendering with keyed reconciliation
- The `(key)` expression in `{#each}` is used for efficient DOM reconciliation (similar to the `key` prop on `<For>`)
- `{:empty}` is optional and renders when the list is empty

## Control Flow

```html
<!-- Conditional rendering -->
<Show when={isLoggedIn()}>
  <Dashboard />
</Show>

<!-- List rendering -->
<For each={items()} key={(item) => item.id}>
  {(item) => <ListItem data={item} />}
</For>
```

Or with directives:

```html
<div :if={isVisible()}>Visible</div>
<li :for={item of items()}>{item.name}</li>
```

Inline conditionals are also reactive:

```html
<template>
  {show() && <span>Visible when show is true</span>}
  {mode() === 'edit' ? <Editor /> : <Viewer />}
</template>
```

## SVG

SVG elements are compiled with `createElementNS` automatically. All standard SVG tags are recognized, and SVG context propagates to children:

```html
<template>
  <svg width="100" height="100" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r={radius()} fill={color()} />
    <path d="M10 80 Q 52.5 10, 95 80" stroke="black" fill="none" />
  </svg>
</template>
```

## Portal

`<Portal>` renders children into a different DOM node, outside the normal component tree. Essential for modals, tooltips, and overlays.

```html
<script lang="ts">
import { Portal } from '@akashjs/runtime';
</script>

<template>
  <Portal target="#modal-root">
    <div class="modal">Modal content here</div>
  </Portal>

  <!-- Renders into document.body by default -->
  <Portal>
    <Tooltip text="Hello" />
  </Portal>
</template>
```

The `target` prop accepts a CSS selector string or an `HTMLElement`. If omitted, children render into `document.body`. A placeholder comment is left in the original tree so the component lifecycle works normally.

## Transition

`<Transition>` applies CSS enter/exit animations when content appears or disappears.

```html
<script lang="ts">
import { Transition } from '@akashjs/runtime';
import { signal } from '@akashjs/runtime';

const visible = signal(true);
</script>

<template>
  <button onClick={() => visible.update(v => !v)}>Toggle</button>
  <Transition name="fade" when={visible()}>
    <div>Fading content</div>
  </Transition>
</template>

<style>
.fade-enter-active, .fade-exit-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-exit-to {
  opacity: 0;
}
</style>
```

**Props:**

| Prop | Type | Description |
|---|---|---|
| `name` | `string` | CSS class prefix (default: `'akash'`) |
| `when` | `boolean` | Whether the content is shown |
| `duration` | `number` | Override transition duration in ms |
| `mode` | `'in-out' \| 'out-in'` | Transition sequencing mode |
| `onEnter` | `(el) => void` | Callback when enter starts |
| `onAfterEnter` | `(el) => void` | Callback when enter completes |
| `onExit` | `(el) => void` | Callback when exit starts |
| `onAfterExit` | `(el) => void` | Callback when exit completes |

CSS classes follow the convention: `{name}-enter-from`, `{name}-enter-active`, `{name}-enter-to`, `{name}-exit-from`, `{name}-exit-active`, `{name}-exit-to`.

You can also generate preset CSS with `generateTransitionCSS()`:

```ts
import { generateTransitionCSS } from '@akashjs/runtime';

const css = generateTransitionCSS('fade', { property: 'opacity', duration: '0.3s' });
```

## ErrorBoundary

`<ErrorBoundary>` catches errors from descendant components and renders a fallback UI. The fallback receives the error and a `retry` function to re-render the children.

```html
<script lang="ts">
import { ErrorBoundary } from '@akashjs/runtime';
</script>

<template>
  <ErrorBoundary fallback={(err, retry) => (
    <div class="error">
      <p>Something went wrong: {err.message}</p>
      <button onClick={retry}>Try again</button>
    </div>
  )}>
    <RiskyComponent />
  </ErrorBoundary>
</template>
```

When `retry()` is called, the error state clears and the children are re-rendered.

## Suspense

`<Suspense>` shows a fallback while async children are loading. When all pending promises resolve, it swaps to the real content.

```html
<script lang="ts">
import { Suspense } from '@akashjs/runtime';
</script>

<template>
  <Suspense fallback={() => <Spinner />}>
    <AsyncDashboard />
  </Suspense>
</template>
```

Async components and `createResource()` automatically register with the nearest `<Suspense>` boundary. Works with both client rendering and SSR streaming.

## defineAsyncComponent()

Lazy-load a component via dynamic `import()`. The chunk is fetched on first render, with optional loading/error states and timeout.

```ts
import { defineAsyncComponent } from '@akashjs/runtime';

// Simple usage:
const LazyChart = defineAsyncComponent(() => import('./Chart.akash'));

// With loading, error, and timeout:
const LazyDashboard = defineAsyncComponent({
  loader: () => import('./Dashboard.akash'),
  loading: () => <Spinner />,
  error: (err) => <p>Failed to load: {err.message}</p>,
  timeout: 10000,  // show error after 10s
  delay: 200,      // wait 200ms before showing loading (default)
});
```

**Options:**

| Option | Type | Description |
|---|---|---|
| `loader` | `() => Promise<{ default: Component }>` | The dynamic import |
| `loading` | `() => AkashNode` | UI shown while loading |
| `error` | `(err: Error) => AkashNode` | UI shown on failure |
| `timeout` | `number` | Timeout in ms before showing error |
| `delay` | `number` | Delay in ms before showing loading (default: 200) |

The loaded component is cached after first resolution, so subsequent renders are instant.

## VirtualFor

`<VirtualFor>` renders only the items visible in the viewport plus an overscan buffer. Use it for large lists (thousands of items) without destroying performance.

```html
<script lang="ts">
import { VirtualFor } from '@akashjs/runtime';
import { signal } from '@akashjs/runtime';

const items = signal(Array.from({ length: 10000 }, (_, i) => ({ id: i, name: `Item ${i}` })));
</script>

<template>
  <VirtualFor
    each={items()}
    key={(item) => item.id}
    itemHeight={40}
    containerHeight={400}
    overscan={5}
  >
    {(item) => <div class="row">{item.name}</div>}
  </VirtualFor>
</template>
```

**Props:**

| Prop | Type | Description |
|---|---|---|
| `each` | `T[]` | Array of items |
| `key` | `(item: T) => unknown` | Key function for reconciliation |
| `itemHeight` | `number` | Fixed height per item in pixels |
| `containerHeight` | `number` | Container height in pixels (default: 400) |
| `overscan` | `number` | Extra items to render above/below viewport (default: 3) |

For custom implementations, use the `useVirtualList()` composable directly:

```ts
import { useVirtualList } from '@akashjs/runtime';

const { range, visibleItems, onScroll } = useVirtualList({
  items: () => allItems(),
  itemHeight: 40,
  overscan: 5,
});
```

## Image

`<Image>` provides lazy loading, responsive images, blur-up placeholders, and error fallbacks out of the box.

```html
<script lang="ts">
import { Image } from '@akashjs/runtime';
</script>

<template>
  <Image
    src="/photos/hero.jpg"
    alt="Hero image"
    width={800}
    height={400}
    srcset="/photos/hero-400.jpg 400w, /photos/hero-800.jpg 800w"
    sizes="(max-width: 600px) 400px, 800px"
    placeholder="blur"
    blurDataUrl="data:image/jpeg;base64,/9j/4AAQ..."
    fallbackSrc="/photos/placeholder.jpg"
    loading="lazy"
  />
</template>
```

The image is lazy-loaded via `IntersectionObserver` by default. When `placeholder="blur"` is set, the `blurDataUrl` is shown as a low-resolution preview until the full image loads. If the image fails to load, `fallbackSrc` is displayed instead.

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `src` | `string` | — | Image source URL |
| `alt` | `string` | — | Alt text (required for accessibility) |
| `width` | `number` | — | Intrinsic width in pixels |
| `height` | `number` | — | Intrinsic height in pixels |
| `srcset` | `string` | — | Responsive image srcset |
| `sizes` | `string` | — | Responsive image sizes |
| `loading` | `'lazy' \| 'eager'` | `'lazy'` | Loading strategy |
| `placeholder` | `'blur' \| 'none'` | `'none'` | Placeholder mode |
| `blurDataUrl` | `string` | — | Base64 data URL for blur placeholder |
| `fallbackSrc` | `string` | — | Fallback image shown on load error |
| `class` | `string` | — | CSS class |
| `onLoad` | `() => void` | — | Callback when image loads |
| `onError` | `(err: Event) => void` | — | Callback on load failure |

### Responsive Example

```html
<Image
  src="/avatar.jpg"
  alt="User avatar"
  srcset="/avatar-1x.jpg 1x, /avatar-2x.jpg 2x"
  width={48}
  height={48}
/>
```

### Error Fallback

```html
<Image
  src={user.avatarUrl}
  alt={user.name}
  fallbackSrc="/default-avatar.png"
  onError={() => console.warn('Avatar failed to load')}
/>
```

## Hierarchical Dependency Injection

Beyond the simple `createContext` / `provide` / `inject` pattern, AkashJS offers a full hierarchical DI system for larger applications.

### defineProvider()

Define a reusable provider with a factory function and scope.

```ts
import { defineProvider } from '@akashjs/runtime';

const LoggerProvider = defineProvider({
  factory: () => new ConsoleLogger(),
  providedIn: 'root',  // 'root' | 'component'
});
```

When `providedIn: 'root'`, a single instance is shared across the entire app. When `providedIn: 'component'`, each component that injects the provider gets its own instance.

### createInjector()

Create an injector with explicit bindings. Supports `useFactory`, `useValue`, and `useExisting`.

```ts
import { createInjector } from '@akashjs/runtime';

const injector = createInjector([
  { provide: AuthService, useFactory: () => new AuthService(apiUrl) },
  { provide: API_URL, useValue: 'https://api.example.com' },
  { provide: Logger, useExisting: ConsoleLogger },
]);

const auth = injector.get(AuthService);
```

### Child injectors

Create child injectors that inherit from a parent but can override specific bindings:

```ts
const parentInjector = createInjector([
  { provide: Logger, useFactory: () => new ConsoleLogger() },
  { provide: Config, useValue: { debug: false } },
]);

const childInjector = createInjector(
  [{ provide: Config, useValue: { debug: true } }],
  parentInjector,  // parent
);

childInjector.get(Logger);  // inherited from parent
childInjector.get(Config);  // overridden: { debug: true }
```

### injectProvider()

Inside a component, use `injectProvider()` to resolve a provider from the nearest injector in the component tree:

```ts
import { defineComponent, injectProvider } from '@akashjs/runtime';

const Dashboard = defineComponent(() => {
  const auth = injectProvider(AuthService);
  const logger = injectProvider(Logger);

  logger.info('Dashboard mounted');

  return () => {
    const div = document.createElement('div');
    div.textContent = `Welcome, ${auth.currentUser().name}`;
    return div;
  };
});

## Route Animations

Animate page transitions when the router navigates between routes. The `getRouteTransitionClasses()` function returns the six CSS class names used during enter/exit:

```ts
import { getRouteTransitionClasses } from '@akashjs/router';

const classes = getRouteTransitionClasses('page');
// {
//   enterFrom: 'page-enter-from',
//   enterActive: 'page-enter-active',
//   enterTo: 'page-enter-to',
//   exitFrom: 'page-exit-from',
//   exitActive: 'page-exit-active',
//   exitTo: 'page-exit-to',
// }
```

### Preset Transition CSS

Generate ready-to-use CSS for common transition types with `generateRouteTransitionCSS()`:

```ts
import { generateRouteTransitionCSS } from '@akashjs/router';

// Available types: 'fade', 'slide-left', 'slide-right', 'slide-up', 'scale'
const css = generateRouteTransitionCSS('page', 'fade');
const slideCss = generateRouteTransitionCSS('page', 'slide-left');
const scaleCss = generateRouteTransitionCSS('page', 'scale');
```

Each generates enter/exit active transitions with a `0.3s cubic-bezier(0.2, 0, 0, 1)` timing curve. Inject the CSS into your app or include it in your stylesheet.

### canDeactivate Guard

Prevent navigation when there are unsaved changes:

```ts
import { canDeactivate } from '@akashjs/router';

const guard = canDeactivate({
  canLeave: () => !form.dirty(),
  message: 'You have unsaved changes. Leave anyway?',
  useNativeConfirm: true,  // default
});
```

The guard checks `canLeave()` before every navigation. If it returns `false`, the user sees a confirmation dialog. The guard also hooks into the browser's `beforeunload` event to catch tab closes and external navigation.

Call `guard.dispose()` to remove the `beforeunload` listener when the component unmounts.

## DataTable

`<DataTable>` is a headless data table component. It provides sorting, filtering, pagination, and column visibility as reactive signals — you supply the markup.

### Creating a DataTable

```ts
import { createDataTable } from '@akashjs/runtime';

const table = createDataTable({
  data: () => users(),
  columns: [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email', sortable: true },
    { key: 'role', header: 'Role', filterable: true },
    { key: 'createdAt', header: 'Joined', sortable: true },
  ],
  pageSize: 10,
});
```

### Rendering

Because `createDataTable` is headless, you have full control over the markup:

```html
<template>
  <input
    placeholder="Search..."
    value={table.filter()}
    onInput={(e) => table.setFilter(e.currentTarget.value)}
  />

  <table>
    <thead>
      <tr>
        <For each={table.visibleColumns()}>
          {(col) => (
            <th onClick={() => table.toggleSort(col.key)}>
              {col.header}
              <Show when={table.sortKey() === col.key}>
                {table.sortDirection() === 'asc' ? ' ▲' : ' ▼'}
              </Show>
            </th>
          )}
        </For>
      </tr>
    </thead>
    <tbody>
      <For each={table.rows()} key={(row) => row.id}>
        {(row) => (
          <tr>
            <For each={table.visibleColumns()}>
              {(col) => <td>{row[col.key]}</td>}
            </For>
          </tr>
        )}
      </For>
    </tbody>
  </table>

  <div class="pagination">
    <button disabled={!table.hasPrevPage()} onClick={() => table.prevPage()}>Prev</button>
    <span>Page {table.page()} of {table.totalPages()}</span>
    <button disabled={!table.hasNextPage()} onClick={() => table.nextPage()}>Next</button>
  </div>
</template>
```

### API

**Sorting:**

```ts
table.toggleSort('name');       // toggle sort on column
table.sortKey();                // current sort column key or null
table.sortDirection();          // 'asc' | 'desc' | null
```

**Filtering:**

```ts
table.setFilter('alice');       // set global filter text
table.filter();                 // current filter value
```

**Pagination:**

```ts
table.page();                   // current page (1-based)
table.totalPages();             // computed total pages
table.hasNextPage();            // boolean
table.hasPrevPage();            // boolean
table.nextPage();               // go to next page
table.prevPage();               // go to previous page
table.goToPage(3);              // jump to page
table.rows();                   // current page rows (sorted + filtered)
```

**Column Visibility:**

```ts
table.toggleColumn('role');     // show/hide a column
table.visibleColumns();         // array of visible column definitions
table.isColumnVisible('role');  // boolean
```

**Reset:**

```ts
table.reset();                  // reset sort, filter, pagination, and column visibility
```
