# Testing

AkashJS provides test utilities as a subpath export: `@akashjs/runtime/test`. No TestBed, no module configuration, no `compileComponents()`.

## Setup

AkashJS works with Vitest out of the box. The CLI generates a `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import akash from '@akashjs/vite-plugin';

export default defineConfig({
  plugins: [akash()],
  test: {
    environment: 'happy-dom',
  },
});
```

## mount()

Mount a component into a detached DOM element:

```ts
import { describe, it, expect } from 'vitest';
import { mount } from '@akashjs/runtime/test';
import Counter from './Counter.akash';

describe('Counter', () => {
  it('renders initial count', () => {
    const { getByText, unmount } = mount(Counter, { props: { initial: 5 } });
    expect(getByText('Count: 5')).toBeTruthy();
    unmount();
  });
});
```

### Mount Options

```ts
mount(Component, {
  props: { name: 'Alice' },              // component props
  provide: new Map([[ThemeContext, 'dark']]),  // inject context values
});
```

### Query Helpers

| Method | Description |
|---|---|
| `getByText(text)` | Find element containing text (throws if not found) |
| `getByRole(role)` | Find by ARIA role or implicit HTML role |
| `getByTestId(id)` | Find by `data-testid` attribute |
| `queryAll(selector)` | CSS selector, returns array |
| `query(selector)` | CSS selector, returns first or null |

## fireEvent

Fire DOM events and wait for effects to flush:

```ts
import { mount, fireEvent } from '@akashjs/runtime/test';

it('increments on click', async () => {
  const { getByRole, getByText, unmount } = mount(Counter);
  await fireEvent.click(getByRole('button'));
  expect(getByText('Count: 1')).toBeTruthy();
  unmount();
});
```

### Available Events

| Method | Description |
|---|---|
| `fireEvent.click(el)` | Mouse click |
| `fireEvent.input(el, value)` | Set input value and fire input/change |
| `fireEvent.submit(form)` | Submit a form |
| `fireEvent.focus(el)` | Focus an element |
| `fireEvent.blur(el)` | Blur an element |
| `fireEvent.keyDown(el, key)` | Key down event |
| `fireEvent.keyUp(el, key)` | Key up event |

All return `Promise<void>` — await them to let effects flush.

## Testing Signals Directly

Signals are just functions — test them without any framework:

```ts
import { signal, computed } from '@akashjs/runtime';

it('computed updates', () => {
  const count = signal(1);
  const doubled = computed(() => count() * 2);
  expect(doubled()).toBe(2);
  count.set(5);
  expect(doubled()).toBe(10);
});
```

## Testing Forms

```ts
import { defineForm, required } from '@akashjs/forms';

it('validates on submit', async () => {
  const form = defineForm({
    email: { initial: '', validators: [required()] },
  });

  const handler = vi.fn();
  await form.submit(handler);
  expect(handler).not.toHaveBeenCalled(); // invalid

  form.fields.email.value.set('test@example.com');
  await form.submit(handler);
  expect(handler).toHaveBeenCalledWith({ email: 'test@example.com' });
});
```

## Leak Detection

In development, track effect creation and disposal to catch leaked effects that were never cleaned up. Import from `@akashjs/runtime`.

```ts
import { enableLeakDetection, checkForLeaks, reportLeaks } from '@akashjs/runtime';

// Enable at app startup in dev mode:
if (import.meta.env.DEV) {
  enableLeakDetection();
}
```

### Checking for Leaks

`checkForLeaks()` returns an array of warnings for effects active longer than a threshold (default: 30 seconds):

```ts
import { checkForLeaks, reportLeaks } from '@akashjs/runtime';

// In a test:
afterEach(() => {
  const leaks = checkForLeaks(5000); // 5s threshold
  expect(leaks).toHaveLength(0);
});

// Or log to console:
reportLeaks(5000);
// [AkashJS] 2 potential effect leak(s) detected:
//   Effect #14 in MyComponent — active for 8.2s
//     Created at:
//       at MyComponent (src/MyComponent.ts:12:5)
```

Each `LeakWarning` contains:

| Property | Type | Description |
|---|---|---|
| `effectId` | `number` | Internal effect ID |
| `age` | `number` | Time in ms since creation |
| `componentName` | `string \| null` | Originating component |
| `stackTrace` | `string \| null` | Creation stack trace |

Use `disableLeakDetection()` to turn off tracking and `getLeakDetectionStats()` to inspect state.

## Performance Profiling

Measure component render times, signal propagation, and effect execution. Import from `@akashjs/runtime`.

### Profiling Sessions

```ts
import { startProfiling, stopProfiling, getProfileSummary, formatProfile } from '@akashjs/runtime';

startProfiling();

// ... run your app, trigger renders, etc. ...

const profile = stopProfiling();
console.log(formatProfile(profile));
//   Performance Profile
//   ──────────────────────────────────────────────────
//   Duration:         142.3 ms
//   Renders:          12 (avg 3.45 ms)
//   Effects:          8 (avg 0.12 ms)
//   Signal updates:   24
//   Computed evals:   16
//   Slowest render:   Dashboard (12.30 ms)

const summary = getProfileSummary(profile);
summary.totalRenders;     // 12
summary.avgRenderTime;    // 3.45
summary.slowestRender;    // PerfEntry
```

### Manual Measurement

`measureSync()` wraps a function call and records timing:

```ts
import { measureSync, createTimer } from '@akashjs/runtime';

const { result, duration } = measureSync('expensive-calc', () => {
  return computeLayout(nodes);
});
console.log(`Took ${duration.toFixed(1)} ms`);
```

For async operations, use `createTimer()`:

```ts
import { createTimer } from '@akashjs/runtime';

const timer = createTimer('data-fetch');
timer.start();
const data = await fetch('/api/data');
timer.stop();
console.log(`Fetch took ${timer.duration.toFixed(1)} ms`);
```

There is also `measureAsync()` for wrapping async functions directly:

```ts
import { measureAsync } from '@akashjs/runtime';

const { result, duration } = await measureAsync('api-call', () => fetch('/api/data'));
```
