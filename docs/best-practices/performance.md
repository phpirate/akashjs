# Performance Best Practices

AkashJS is fast by default -- signals update only the DOM nodes that changed, the compiler hoists static subtrees, and there is no virtual DOM diffing. These guidelines help you avoid the few things that can slow it down.

## Use VirtualFor for Long Lists

Rendering thousands of DOM nodes will tank any framework. If your list can exceed a few hundred items, use `<VirtualFor>` to only render what is visible.

```html
<!-- DON'T: render 10,000 items -->
<For each={items()} key={(item) => item.id}>
  {(item) => <Row data={item} />}
</For>
```

```html
<!-- DO: virtualize long lists -->
<VirtualFor
  each={items()}
  key={(item) => item.id}
  itemHeight={48}
  containerHeight={600}
  overscan={5}
>
  {(item) => <Row data={item} />}
</VirtualFor>
```

::: tip When to virtualize
A good rule of thumb: if the list might exceed 200 items, use `<VirtualFor>`. Below that threshold, plain `<For>` is fine.
:::

## Code Splitting with defineAsyncComponent

Do not load everything upfront. Split heavy pages and rarely-used components into separate chunks.

```ts
// DON'T: import everything eagerly
import Dashboard from './Dashboard.akash';
import AdminPanel from './AdminPanel.akash';
import ChartWidget from './ChartWidget.akash';
```

```ts
// DO: lazy-load heavy/rare components
const Dashboard = defineAsyncComponent(() => import('./Dashboard.akash'));
const AdminPanel = defineAsyncComponent(() => import('./AdminPanel.akash'));
const ChartWidget = defineAsyncComponent({
  loader: () => import('./ChartWidget.akash'),
  loading: () => <Spinner />,
  timeout: 10000,
});
```

## Prefer computed Over effect + signal

Every `effect()` is a subscription that runs on change. `computed()` is lazy -- it only re-evaluates when read.

```ts
// DON'T: effect to derive state
const items = signal([1, 2, 3]);
const total = signal(0);

effect(() => {
  total.set(items().reduce((a, b) => a + b, 0));
});
```

```ts
// DO: computed for derived state
const items = signal([1, 2, 3]);
const total = computed(() => items().reduce((a, b) => a + b, 0));
```

::: danger Anti-pattern: effect chains
Never chain effects where one effect writes to a signal that triggers another effect. This creates cascading updates that are hard to debug and slow to execute.

```ts
// DON'T
const a = signal(1);
const b = signal(0);
const c = signal(0);

effect(() => b.set(a() * 2));  // a changes → b changes
effect(() => c.set(b() + 1));  // b changes → c changes

// DO
const a = signal(1);
const b = computed(() => a() * 2);
const c = computed(() => b() + 1);
```
:::

## Batch Updates

When updating multiple signals at once, wrap them in `batch()` to coalesce effect re-runs.

```ts
import { batch } from '@akashjs/runtime';

// DON'T: three separate updates = up to three effect runs
firstName.set('Bob');
lastName.set('Jones');
age.set(30);

// DO: one batch = one effect run
batch(() => {
  firstName.set('Bob');
  lastName.set('Jones');
  age.set(30);
});
```

## Use untrack for Non-Reactive Reads

If an effect reads a signal it does not need to react to, use `untrack()` to avoid unnecessary re-runs.

```ts
import { untrack } from '@akashjs/runtime';

effect(() => {
  // Only re-run when searchQuery changes, not when config changes
  const results = search(searchQuery(), untrack(() => config()));
  hits.set(results);
});
```

## Avoid Unnecessary Effects

If you do not need a side effect, you do not need an effect. Common mistakes:

```ts
// DON'T: effect just to log
effect(() => {
  console.log('Count:', count());
});

// DO: use watch for debugging (and remove before shipping)
watch(count, (val) => console.log('Count:', val));
```

```ts
// DON'T: effect to set document title
effect(() => {
  document.title = `${count()} items`;
});

// BETTER: onMount with a watch — clearer intent
onMount(() => {
  const stop = watch(count, (c) => {
    document.title = `${c} items`;
  }, { immediate: true });

  return stop;
});
```

## Memo Patterns

For expensive computations that depend on signals, use `computed()`. It memoizes by default -- the function body only runs when a dependency changes and someone reads the value.

```ts
// Expensive filter + sort — only runs when items or sortKey change
const sortedItems = computed(() => {
  return items()
    .filter(item => item.active)
    .sort((a, b) => a[sortKey()].localeCompare(b[sortKey()]));
});
```

For computations that are expensive but only depend on plain arguments (not signals), memoize manually:

```ts
function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map<string, ReturnType<T>>();
  return ((...args: any[]) => {
    const key = JSON.stringify(args);
    if (!cache.has(key)) cache.set(key, fn(...args));
    return cache.get(key)!;
  }) as T;
}

const expensiveCalc = memoize((data: number[]) => {
  return data.reduce((sum, n) => sum + heavyMath(n), 0);
});
```

## Profile Before Optimizing

Do not guess -- measure. Use the built-in profiler to find actual bottlenecks.

```ts
import { startProfiling, stopProfiling, formatProfile } from '@akashjs/runtime';

startProfiling();
// ... interact with the slow part of your app ...
const profile = stopProfiling();
console.log(formatProfile(profile));
```

The output tells you exactly which components are slow, how many signal updates occurred, and which effects are expensive.

::: tip Use budget enforcement in CI
Add `akash size --budget` to your CI pipeline to catch bundle size regressions before they ship.

```yaml
# .github/workflows/ci.yml
- name: Check bundle size
  run: akash size --budget
```
:::

## Leak Detection in Development

Effects that are never disposed leak memory. Enable leak detection in dev mode:

```ts
import { enableLeakDetection, reportLeaks } from '@akashjs/runtime';

if (import.meta.env.DEV) {
  enableLeakDetection();
  setInterval(() => reportLeaks(30000), 60000);
}
```

::: danger Never enable leak detection in production
It adds tracking overhead. Guard it behind `import.meta.env.DEV`.
:::

## Summary Checklist

- [ ] Lists over 200 items use `<VirtualFor>`
- [ ] Heavy components use `defineAsyncComponent()`
- [ ] Derived state uses `computed()`, not `effect()` + `signal()`
- [ ] Multiple signal updates are wrapped in `batch()`
- [ ] Non-reactive reads use `untrack()`
- [ ] No effect chains (effect writing to signal that triggers another effect)
- [ ] Bundle size budget is enforced in CI
- [ ] Leak detection is enabled in development
