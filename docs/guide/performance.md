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

## Static Hoisting

The AkashJS compiler automatically detects static subtrees in your templates — elements with no signals, no directives, and no dynamic attributes. These are hoisted to module scope and rendered once using `cloneNode(true)` instead of being recreated on every render.

Given this template:

```html
<div>
  <header>
    <h1>My App</h1>
    <p>Welcome to the site</p>
  </header>
  <main>{content()}</main>
</div>
```

The compiler hoists the entire `<header>` block because it is fully static. The compiled output looks roughly like:

```ts
// Created once at module scope
const __hoisted_0 = (() => {
  const _t = document.createElement('template');
  _t.innerHTML = '<header><h1>My App</h1><p>Welcome to the site</p></header>';
  return _t;
})();

// Inside the component — clone instead of recreate
const header = __hoisted_0.content.cloneNode(true);
```

This means initial render is faster (no DOM API calls for static parts) and memory usage is lower (one template shared across all instances).

You do not need to configure anything — hoisting happens automatically during compilation.

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
  Package Sizes

  ───────────────────────────────────────────────────────
  @akashjs/compiler           11.2 KB →    4.8 KB gzip
  @akashjs/runtime             7.1 KB →    3.2 KB gzip
  @akashjs/router              3.4 KB →    1.6 KB gzip
  @akashjs/forms               2.8 KB →    1.3 KB gzip
  @akashjs/http                2.6 KB →    1.2 KB gzip
  ───────────────────────────────────────────────────────
  Total                       27.1 KB →   12.1 KB gzip
```

### Budget Enforcement

Set size budgets to catch regressions in CI:

```bash
akash size --budget
```

If any package exceeds its budget, the command exits with code 1. Default budgets:

| Package | Max gzipped |
|---------|------------|
| `@akashjs/runtime` | 8 KB |
| `@akashjs/router` | 4 KB |
| `@akashjs/forms` | 3 KB |
| `@akashjs/http` | 3 KB |
| `@akashjs/compiler` | 12 KB |

Add it to your CI pipeline:

```yaml
# .github/workflows/ci.yml
- name: Check bundle size
  run: akash size --budget
```
