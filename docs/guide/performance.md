# Performance

AkashJS is designed to be fast by default. This guide covers the tools and techniques available for optimizing large applications.

## VirtualFor for Large Lists

Rendering thousands of items will tank any framework. `<VirtualFor>` only renders the items visible in the viewport, plus a small overscan buffer.

```ts
import { defineComponent, signal } from '@akashjs/runtime';
import { VirtualFor } from '@akashjs/runtime';

const BigList = defineComponent((ctx) => {
  const items = signal(
    Array.from({ length: 10000 }, (_, i) => ({ id: i, name: `Item ${i}` }))
  );

  return () => (
    <VirtualFor
      each={items()}
      key={(item) => item.id}
      itemHeight={40}
      containerHeight={500}
      overscan={5}
    >
      {(item) => <div class="row">{item.name}</div>}
    </VirtualFor>
  );
});
```

Props:

| Prop | Type | Description |
|------|------|-------------|
| `each` | `T[]` | The full array of items |
| `key` | `(item: T) => unknown` | Key function for reconciliation |
| `itemHeight` | `number` | Fixed height per item in pixels |
| `containerHeight` | `number` | Viewport height (default: 400px) |
| `overscan` | `number` | Extra items to render above/below (default: 3) |

For more control, use the `useVirtualList` composable directly:

```ts
import { useVirtualList } from '@akashjs/runtime';

const { range, visibleItems, onScroll, setContainerHeight } = useVirtualList({
  items: () => allItems(),
  itemHeight: 40,
  overscan: 5,
});
```

## Code Splitting with defineAsyncComponent

Split large components into separate chunks that load on demand:

```ts
import { defineAsyncComponent } from '@akashjs/runtime';

const LazyDashboard = defineAsyncComponent(() => import('./Dashboard.akash'));
```

Add loading and error states:

```ts
const LazyDashboard = defineAsyncComponent({
  loader: () => import('./Dashboard.akash'),
  loading: () => <div class="spinner">Loading...</div>,
  error: (err) => <div class="error">Failed to load: {err.message}</div>,
  timeout: 10000,  // Show error state after 10s
  delay: 200,      // Wait 200ms before showing loading (avoids flash)
});
```

Use it like any other component:

```ts
const App = defineComponent((ctx) => {
  return () => (
    <main>
      <LazyDashboard />
    </main>
  );
});
```

## Template Cloning

The compiler automatically detects static subtrees in your templates — elements with no signals, no directives, and no dynamic attributes. These are compiled into hoisted `<template>` elements at module scope and cloned with `cloneNode(true)` per instance, instead of generating individual `createElement` + `setAttribute` + `appendChild` chains.

Given this template:

```html
<div class="app">
  <header>
    <h1>My App</h1>
    <p>Welcome to the site</p>
  </header>
  <main>{content()}</main>
  <footer>
    <p>Copyright 2026</p>
    <a href="/privacy">Privacy Policy</a>
  </footer>
</div>
```

The compiler generates:

```ts
// Hoisted — parsed once at module load, shared across all instances
const _tmpl0 = /*#__PURE__*/ (() => {
  const t = document.createElement('template');
  t.innerHTML = `<div class="app"><header><h1>My App</h1>
    <p>Welcome to the site</p></header><main><!></main>
    <footer><p>Copyright 2026</p><a href="/privacy">Privacy Policy</a></footer></div>`;
  return t;
})();

// Per instance — one clone + walker instead of 10 createElement calls
const root = _tmpl0.content.firstChild.cloneNode(true);
const _w0 = root.firstChild.nextSibling;  // <main>
const _w1 = _w0.firstChild;                // <!> marker
// Only the dynamic {content()} expression gets an effect
effect(() => setText(_w1, content()));
```

This reduces DOM calls from **~18 per component** (createElement chains) to **1 cloneNode + walker traversal**. For a benchmark table with 1000 rows, that's 18,000 DOM calls → 1,000 clones — roughly **3x faster** initial render.

### How it works

1. **Analysis** — the compiler tags each template node as static or dynamic
2. **Template HTML** — static elements become an `innerHTML` string with `<!>` markers where dynamic content will be inserted
3. **Hoisting** — the template is created at module scope with `/*#__PURE__*/` (tree-shakeable)
4. **Cloning** — each component instance calls `cloneNode(true)` (a single C++ call)
5. **Walker** — `firstChild`/`nextSibling` traversal finds dynamic insertion points
6. **Bindings** — effects, events, and class directives attach to walker references

### Eligibility

Template cloning activates when a component has **3 or more static elements**. Components with fewer static elements use traditional `createElement` chains (the cloning overhead isn't worth it for 1-2 elements).

Elements that prevent cloning: components (`<Show>`, `<For>`, custom), SVG, spread attributes (`{...props}`), `:if`/`:for` directives.

You do not need to configure anything — template cloning happens automatically during compilation.

## Signal Performance

AkashJS signals are built on class-based nodes with lazy subscriber tracking and version-based dirty checking. This makes them lightweight and fast:

| Metric | Value |
|--------|-------|
| Memory per signal | ~373 bytes |
| Memory per computed | ~313 bytes |
| Memory per effect | ~262 bytes |
| Signal write speed | ~110ns per `.set()` |

### Why it's fast

1. **Class-based nodes** — V8 hidden classes share shape across all signal instances, reducing per-instance overhead
2. **Lazy subscribers** — no `Set` allocated until a signal is actually observed. Most signals in a list have 0-1 subscribers
3. **Version-based dirty checking** — computed signals compare integer versions instead of re-evaluating their function to check if dependencies changed
4. **Dev code stripped in production** — profiling counters and computed-write warnings are removed via `__DEV__` guards, eliminating branches in hot paths

### Tips

- **Prefer `computed()` over `effect()` + `signal()`** for derived values. Computed signals are lazy (only re-evaluate when read) and cached.
- **Use `batch()`** when updating multiple signals at once. Without batch, each `.set()` triggers its own effect flush.
- **Use `untrack()`** to read a signal without subscribing to it when you don't need reactivity for that dependency.
- **Avoid creating signals inside effects** — create them in the component setup function so they're allocated once.

## Performance Profiling

Use the built-in profiler to measure render times, effect execution, and signal propagation:

```ts
import { startProfiling, stopProfiling, getProfileSummary, formatProfile } from '@akashjs/runtime';

// Start recording
startProfiling();

// ... interact with your app ...

// Stop and get results
const profile = stopProfiling();
console.log(formatProfile(profile));
```

The formatted output looks like:

```
  Performance Profile
  ──────────────────────────────────────────────────
  Duration:         342.1 ms
  Renders:          18 (avg 2.35 ms)
  Effects:          42 (avg 0.12 ms)
  Signal updates:   67
  Computed evals:   23
  Slowest render:   TodoList (8.42 ms)
  Slowest effect:   fetchData (12.31 ms)
  ──────────────────────────────────────────────────
```

### measureSync

Measure the time to execute a synchronous operation:

```ts
import { measureSync } from '@akashjs/runtime';

const { result, duration } = measureSync('sort-items', () => {
  return items.sort((a, b) => a.name.localeCompare(b.name));
});

console.log(`Sorted in ${duration.toFixed(2)}ms`);
```

### createTimer

For async or multi-step operations, use a manual timer:

```ts
import { createTimer } from '@akashjs/runtime';

const timer = createTimer('data-fetch');
timer.start();
const data = await fetch('/api/users').then((r) => r.json());
timer.stop();

console.log(`Fetched in ${timer.duration.toFixed(2)}ms`);
```

### Profile Summary

Get structured data instead of a formatted string:

```ts
const profile = stopProfiling();
const summary = getProfileSummary(profile);

summary.totalRenders;       // 18
summary.avgRenderTime;      // 2.35
summary.slowestRender;      // { name: 'TodoList', duration: 8.42, ... }
summary.totalSignalUpdates; // 67
```

## Leak Detection in Dev Mode

Effects that are never disposed can cause memory leaks. Enable leak detection in development to catch them:

```ts
import { enableLeakDetection, reportLeaks } from '@akashjs/runtime';

if (import.meta.env.DEV) {
  enableLeakDetection();

  // Check for leaks periodically or on navigation
  setInterval(() => {
    reportLeaks(30000); // Warn about effects active longer than 30s
  }, 60000);
}
```

When a leak is detected, you will see console warnings like:

```
[AkashJS] 2 potential effect leak(s) detected:
  Effect #14 in UserProfile — active for 45.2s
    Created at:
      at UserProfile (src/components/UserProfile.ts:23:5)
  Effect #21 in DataFetcher — active for 32.1s
```

You can also inspect active effects programmatically:

```ts
import { getActiveEffects, checkForLeaks, getLeakDetectionStats } from '@akashjs/runtime';

const stats = getLeakDetectionStats();
console.log(`${stats.activeCount} effects currently active`);

const leaks = checkForLeaks(30000);
for (const leak of leaks) {
  console.warn(`Possible leak in ${leak.componentName}, age: ${leak.age}ms`);
}
```

Remember to disable leak detection in production — it adds overhead:

```ts
import { disableLeakDetection } from '@akashjs/runtime';

if (import.meta.env.PROD) {
  disableLeakDetection();
}
```

## Bundle Size Tracking

The CLI includes a `size` command that measures the gzipped size of each package:

```bash
akash size
```

Output:

```
  Package Sizes (main entry points)

  ───────────────────────────────────────────────────────
  @akashjs/runtime             6.8 KB →    2.8 KB gzip
  @akashjs/router             13.3 KB →    4.9 KB gzip
  @akashjs/http               17.7 KB →    6.5 KB gzip
  @akashjs/forms               5.4 KB →    2.0 KB gzip
  @akashjs/i18n                2.1 KB →    1.1 KB gzip
  ───────────────────────────────────────────────────────
  Total (core)                45.3 KB →   17.3 KB gzip
```

The runtime is split into 54 subpath entry points. Tree-shaking ensures you only ship what you import — a minimal app using just signals and components is ~3KB gzipped.

### Budget Enforcement

Set size budgets to catch regressions in CI:

```bash
akash size --budget
```

If any package exceeds its budget, the command exits with code 1. Default budgets:

| Package | Max gzipped |
|---------|------------|
| `@akashjs/runtime` | 4 KB |
| `@akashjs/router` | 6 KB |
| `@akashjs/http` | 8 KB |
| `@akashjs/forms` | 3 KB |
| `@akashjs/i18n` | 2 KB |

Add it to your CI pipeline:

```yaml
# .github/workflows/ci.yml
- name: Check bundle size
  run: akash size --budget
```

## Recent Optimizations

AkashJS is included in the official [js-framework-benchmark](https://krausest.github.io/js-framework-benchmark/) (keyed implementation). The following optimizations were shipped to improve benchmark and real-world performance:

### LIS-Based List Reconciler

The `<For>` component uses a longest-increasing-subsequence (LIS) algorithm to compute minimal DOM moves when a keyed list changes. Swap and remove operations now produce only the necessary `insertBefore` calls instead of iterating the entire list.

### class: Directive Caching

The compiler emits a previous-value cache for `class:` directives. When a signal changes, the effect still fires on every row that reads it, but `classList.toggle` is skipped when the boolean result hasn't changed — so only the affected rows touch the DOM.

### Inline Signal Batching

`signal.set()` uses inline `enterBatch()` / `exitBatch()` calls instead of wrapping in a closure via `batch(() => { ... })`. This eliminates one closure allocation per `set()` call, reducing GC pressure in hot paths (~14% faster signal writes).
