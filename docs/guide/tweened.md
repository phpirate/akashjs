# Tweened Values & FLIP Animations

AkashJS provides smooth value interpolation and layout animations inspired by Svelte's `tweened` stores and FLIP technique.

## tweened()

`tweened()` creates a reactive signal that smoothly interpolates between values over time.

```ts
import { tweened } from '@akashjs/runtime';

const progress = tweened(0, {
  duration: 400,
  easing: 'cubicOut',
});
```

### Setting Values

| Method | Description |
|--------|-------------|
| `progress.set(value)` | Animate to the new value over the configured duration |
| `progress.setImmediate(value)` | Jump to the new value instantly (no animation) |
| `progress.target()` | Returns the final target value (before animation completes) |

```ts
// Smooth transition to 100
progress.set(100);

// Check what we're animating toward
console.log(progress.target()); // 100

// Read the current interpolated value (use like any signal)
console.log(progress()); // 0...50...100 (changes over time)

// Jump immediately — no transition
progress.setImmediate(0);
```

### Options

```ts
const value = tweened(initialValue, {
  duration: 400,       // transition time in ms
  easing: 'cubicOut',  // easing function name or custom function
  interpolate: null,   // custom interpolator (see below)
});
```

## Built-in Easings

AkashJS ships with a full set of easing functions that can be passed by name or imported directly.

| Easing | Description |
|--------|-------------|
| `linear` | Constant speed, no acceleration |
| `cubicIn` | Slow start, accelerates |
| `cubicOut` | Fast start, decelerates |
| `cubicInOut` | Slow start and end, fast middle |
| `quadIn` | Gentle acceleration (quadratic) |
| `quadOut` | Gentle deceleration (quadratic) |
| `quintOut` | Strong deceleration (quintic) |
| `bounceOut` | Bounces at the end |
| `elasticOut` | Overshoots then settles with elastic effect |

```ts
import { tweened, cubicOut, bounceOut } from '@akashjs/runtime';

// Pass by name
const a = tweened(0, { easing: 'cubicOut' });

// Or pass the function directly
const b = tweened(0, { easing: bounceOut });
```

## Custom Interpolators

By default, `tweened()` interpolates numbers linearly. For other value types (colors, objects, arrays), provide a custom interpolator.

An interpolator is a function that takes a start and end value and returns a function of `t` (0 to 1):

```ts
import { tweened } from '@akashjs/runtime';

// Interpolate an RGB color object
const color = tweened(
  { r: 0, g: 0, b: 0 },
  {
    duration: 800,
    interpolate: (from, to) => (t) => ({
      r: from.r + (to.r - from.r) * t,
      g: from.g + (to.g - from.g) * t,
      b: from.b + (to.b - from.b) * t,
    }),
  }
);

color.set({ r: 255, g: 128, b: 0 });
```

## FLIP Animations

FLIP (First, Last, Invert, Play) is a technique for animating layout changes performantly. AkashJS provides `createFlip()` to make this easy.

### createFlip()

```ts
import { createFlip } from '@akashjs/runtime';

const { measure, animate } = createFlip({
  duration: 300,
  easing: 'cubicOut',
});
```

The pattern is:

1. **measure()** -- capture the current position of elements
2. Make your DOM change (reorder items, add/remove elements)
3. **animate()** -- calculate the difference and animate from old to new position

```ts
function reorderList() {
  // 1. Snapshot current positions
  measure();

  // 2. Update the data (triggers DOM change)
  items.set(shuffled);

  // 3. Animate from old positions to new
  animate();
}
```

### flip() Shorthand

For simple cases, `flip()` wraps the measure/animate cycle:

```ts
import { flip } from '@akashjs/runtime';

function reorderList() {
  flip(() => {
    items.set(shuffled);
  }, { duration: 300 });
}
```

### createFlip Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `duration` | `number` | `300` | Animation duration in ms |
| `easing` | `string \| Function` | `'cubicOut'` | Easing function |
| `selector` | `string` | `'[data-flip-key]'` | CSS selector for elements to track |

## Examples

### Animated Counter

```ts
import { component, tweened } from '@akashjs/runtime';

const Counter = component('app-counter', () => {
  const count = tweened(0, { duration: 600, easing: 'cubicOut' });

  return html`
    <div class="counter">
      <span class="value">${() => Math.round(count())}</span>
      <button @click=${() => count.set(count.target() + 1)}>+1</button>
      <button @click=${() => count.set(count.target() + 10)}>+10</button>
      <button @click=${() => count.setImmediate(0)}>Reset</button>
    </div>
  `;
});
```

### Animated Progress Bar

```ts
import { component, tweened } from '@akashjs/runtime';

const ProgressBar = component('app-progress', () => {
  const progress = tweened(0, {
    duration: 400,
    easing: 'cubicInOut',
  });

  return html`
    <div class="progress-track">
      <div
        class="progress-fill"
        style=${() => `width: ${progress()}%`}
      ></div>
    </div>
    <span>${() => Math.round(progress())}%</span>
    <button @click=${() => progress.set(Math.min(progress.target() + 25, 100))}>
      Add 25%
    </button>
  `;
});
```

### List Reorder with FLIP

```ts
import { component, signal, flip } from '@akashjs/runtime';

const SortableList = component('app-sortable', () => {
  const items = signal(['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry']);

  function shuffle() {
    flip(() => {
      const shuffled = [...items()].sort(() => Math.random() - 0.5);
      items.set(shuffled);
    }, { duration: 400 });
  }

  return html`
    <button @click=${shuffle}>Shuffle</button>
    <ul>
      ${() => items().map(item => html`
        <li data-flip-key=${item}>${item}</li>
      `)}
    </ul>
  `;
});
```
