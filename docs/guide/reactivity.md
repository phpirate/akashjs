# Reactivity

AkashJS uses a fine-grained reactivity system based on **signals**. Signals are reactive values that automatically track dependencies and update only what changed — no virtual DOM diffing needed.

## signal()

A signal holds a reactive value. Read it by calling it as a function. Write it with `.set()` or `.update()`.

```ts
import { signal } from '@akashjs/runtime';

const count = signal(0);

count();          // 0 (read)
count.set(5);     // write
count.update(c => c + 1);  // update from previous
count.peek();     // read without tracking
```

## computed()

A computed signal derives from other signals. It recomputes lazily when dependencies change.

```ts
import { signal, computed } from '@akashjs/runtime';

const count = signal(2);
const doubled = computed(() => count() * 2);

doubled();  // 4
count.set(5);
doubled();  // 10
```

Computed signals are read-only — you cannot call `.set()` on them.

## effect()

An effect runs a side-effect whenever its tracked signals change.

```ts
import { signal, effect } from '@akashjs/runtime';

const name = signal('Alice');

const dispose = effect(() => {
  console.log(`Hello, ${name()}`);
});
// Logs: "Hello, Alice"

name.set('Bob');
// Logs: "Hello, Bob"

dispose(); // Stop watching
```

Effects can return a cleanup function:

```ts
effect(() => {
  const handler = () => console.log(count());
  window.addEventListener('click', handler);
  return () => window.removeEventListener('click', handler);
});
```

## batch()

Batch multiple signal updates to avoid intermediate re-computations:

```ts
import { signal, batch } from '@akashjs/runtime';

const first = signal('Alice');
const last = signal('Smith');

batch(() => {
  first.set('Bob');
  last.set('Jones');
  // Effects run once after the batch, not twice
});
```

## untrack()

Read a signal without registering a dependency:

```ts
import { signal, computed, untrack } from '@akashjs/runtime';

const a = signal(1);
const b = signal(2);

const sum = computed(() => a() + untrack(() => b()));
// Only re-runs when `a` changes, not when `b` changes
```

## on()

Create an effect that only tracks specific signals. All other signal reads inside the callback are untracked.

```ts
import { effect, on } from '@akashjs/runtime';

// Only re-runs when url changes, not when options changes
effect(on(url, (currentUrl, prevUrl) => {
  fetch(currentUrl, options()); // options() not tracked
}));

// Multiple signals
effect(on([url, page], ([currentUrl, currentPage]) => {
  fetch(`${currentUrl}?page=${currentPage}`);
}));

// Run immediately (by default, on() skips the initial run)
effect(on(url, (val) => console.log(val), { defer: false }));
```

## How It Works

1. When a signal is read inside a `computed()` or `effect()`, it registers a dependency.
2. When a signal is written, it notifies all subscribers.
3. Computed signals re-evaluate lazily — only when read.
4. Effects are scheduled on the microtask queue for batching.
5. No virtual DOM — signal changes directly patch the specific DOM node.
