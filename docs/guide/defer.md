# Deferred Loading

The `defer()` API lets you delay loading of heavy components or content until a trigger condition is met. This keeps your initial bundle small and loads code only when it is actually needed.

## Overview

```ts
import { defer } from '@akashjs/runtime';

const LazyChart = defer(
  () => import('./HeavyChart.akash'),
  { trigger: 'viewport' }
);
```

The first argument is a loader function that returns a dynamic import (or any promise). The second argument configures when and how the loading should happen.

## Triggers

### viewport

Load when the placeholder element enters the viewport. Uses `IntersectionObserver` under the hood.

```ts
const LazySection = defer(
  () => import('./HeroSection.akash'),
  { trigger: 'viewport' }
);
```

You can customize the intersection threshold and root margin:

```ts
const LazySection = defer(
  () => import('./HeroSection.akash'),
  {
    trigger: {
      type: 'viewport',
      rootMargin: '200px',  // start loading 200px before visible
      threshold: 0.1,
    },
  }
);
```

### interaction

Load when the user interacts with the placeholder. Supports click, hover, and focus events.

```ts
const Editor = defer(
  () => import('./RichTextEditor.akash'),
  {
    trigger: {
      type: 'interaction',
      events: ['click', 'focus'],  // default: ['click', 'hover', 'focus']
    },
  }
);
```

Shorthand for default events:

```ts
const Editor = defer(
  () => import('./RichTextEditor.akash'),
  { trigger: 'interaction' }
);
```

### idle

Load when the browser is idle, using `requestIdleCallback`. Falls back to `setTimeout` in browsers that do not support it.

```ts
const Analytics = defer(
  () => import('./AnalyticsDashboard.akash'),
  { trigger: 'idle' }
);
```

### timer

Load after a fixed delay.

```ts
const Chatbot = defer(
  () => import('./ChatWidget.akash'),
  {
    trigger: { type: 'timer', delay: 3000 },  // load after 3 seconds
  }
);
```

### hover

A convenience alias for interaction with only the hover event.

```ts
const Tooltip = defer(
  () => import('./DetailedTooltip.akash'),
  { trigger: 'hover' }
);
```

### Custom condition

Pass a reactive function that returns `true` when loading should begin.

```ts
import { signal } from '@akashjs/runtime';

const isReady = signal(false);

const Module = defer(
  () => import('./Module.akash'),
  {
    trigger: { type: 'custom', when: () => isReady() },
  }
);

// Later, trigger the load:
isReady.set(true);
```

## Loading and error placeholders

Show a loading indicator while the chunk is being fetched, and an error state if it fails.

```ts
const Dashboard = defer(
  () => import('./Dashboard.akash'),
  {
    trigger: 'viewport',
    loading: () => <div class="skeleton">Loading dashboard...</div>,
    error: (err) => <div class="error">Failed to load: {err.message}</div>,
  }
);
```

Both `loading` and `error` accept render functions.

## Prefetch

When `prefetch` is enabled, the chunk is fetched at low priority in the background but the component is not rendered until the trigger fires. This gives you instant swap-in when the user reaches the content.

```ts
const HeavyWidget = defer(
  () => import('./HeavyWidget.akash'),
  {
    trigger: 'viewport',
    prefetch: true,
  }
);
```

Prefetch uses `<link rel="prefetch">` when available, falling back to a low-priority fetch.

## Minimum load time

To prevent a flash of loading state when the chunk loads almost instantly, set a `minimumLoadTime`. The loading placeholder will be shown for at least this many milliseconds.

```ts
const Panel = defer(
  () => import('./Panel.akash'),
  {
    trigger: 'interaction',
    loading: () => <Spinner />,
    minimumLoadTime: 300,  // show spinner for at least 300ms
  }
);
```

This avoids the jarring experience of a spinner appearing for a single frame.

## Full options reference

```ts
interface DeferOptions {
  trigger: DeferTrigger;
  loading?: () => AkashNode;
  error?: (err: Error) => AkashNode;
  prefetch?: boolean;
  minimumLoadTime?: number;
}

type DeferTrigger =
  | 'viewport'
  | 'interaction'
  | 'idle'
  | 'hover'
  | { type: 'viewport'; rootMargin?: string; threshold?: number }
  | { type: 'interaction'; events?: string[] }
  | { type: 'timer'; delay: number }
  | { type: 'custom'; when: () => boolean };
```

## Combining with Suspense

Deferred components integrate with `<Suspense>` boundaries. If a deferred component is inside a `<Suspense>`, the suspense fallback is shown until all deferred children have loaded:

```html
<Suspense fallback={() => <PageSkeleton />}>
  <Header />
  {DeferredSidebar}
  {DeferredContent}
</Suspense>
```
