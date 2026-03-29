# Animations

AkashJS provides a powerful animation system built on the Web Animations API. From simple property tweens to spring physics and state machines, everything is declarative and composable.

## animate()

The `animate()` function is the core primitive. It wraps the Web Animations API with a convenient interface and returns an `AnimationControl` handle.

```ts
import { animate } from '@akashjs/runtime';

const control = animate(element, {
  properties: {
    opacity: [0, 1],
    transform: ['translateY(20px)', 'translateY(0)'],
  },
  duration: 300,
  easing: 'ease-out',
  fill: 'forwards',
});
```

### AnimationControl

The returned `AnimationControl` object lets you manage the animation imperatively:

```ts
interface AnimationControl {
  play(): void;
  pause(): void;
  cancel(): void;
  reverse(): void;
  finish(): void;
  finished: Promise<void>;
  playState: () => AnimationPlayState;
}
```

Example usage:

```ts
const ctrl = animate(el, {
  properties: { opacity: [1, 0] },
  duration: 500,
});

// Wait for completion
await ctrl.finished;
console.log('Animation done');

// Or control it manually
ctrl.pause();
ctrl.reverse();
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `properties` | `Record<string, [from, to]>` | -- | CSS properties to animate |
| `duration` | `number` | `300` | Duration in milliseconds |
| `easing` | `string` | `'ease'` | CSS easing function |
| `delay` | `number` | `0` | Delay before starting in ms |
| `fill` | `FillMode` | `'none'` | How styles apply before/after |
| `iterations` | `number` | `1` | Number of iterations (`Infinity` for loop) |
| `direction` | `PlaybackDirection` | `'normal'` | `'normal'`, `'reverse'`, `'alternate'` |

## animateStagger()

Animate a list of elements with a staggered delay between each one. Great for list entrances.

```ts
import { animateStagger } from '@akashjs/runtime';

const items = document.querySelectorAll('.list-item');

animateStagger(items, {
  properties: {
    opacity: [0, 1],
    transform: ['translateY(10px)', 'translateY(0)'],
  },
  duration: 300,
  stagger: 50,         // 50ms delay between each item
  from: 'start',       // 'start' | 'center' | 'end'
});
```

### Stagger from center

When `from: 'center'` is used, the middle element animates first and the delay fans outward to the edges:

```ts
animateStagger(items, {
  properties: { scale: [0.8, 1] },
  duration: 200,
  stagger: 30,
  from: 'center',
});
```

### Stagger from end

Reverse the stagger order so the last item animates first:

```ts
animateStagger(items, {
  properties: { opacity: [0, 1] },
  duration: 250,
  stagger: 40,
  from: 'end',
});
```

## animateSequence()

Run multiple animations one after another. Each step waits for the previous to finish before starting.

```ts
import { animateSequence } from '@akashjs/runtime';

await animateSequence([
  { element: header, properties: { opacity: [0, 1] }, duration: 300 },
  { element: body,   properties: { opacity: [0, 1] }, duration: 300 },
  { element: footer, properties: { opacity: [0, 1] }, duration: 300 },
]);
```

Each entry in the array uses the same options as `animate()`, plus the `element` field to specify the target.

## animateGroup()

Run multiple animations in parallel and wait for all of them to finish.

```ts
import { animateGroup } from '@akashjs/runtime';

await animateGroup([
  { element: sidebar, properties: { transform: ['translateX(-100%)', 'translateX(0)'] }, duration: 400 },
  { element: content, properties: { opacity: [0, 1] }, duration: 400 },
]);
```

This is useful when you want several elements to animate simultaneously but need a single promise that resolves when everything is done.

## animateSpring()

Physics-based spring animation. Instead of a fixed duration and easing curve, the motion is controlled by spring parameters.

```ts
import { animateSpring } from '@akashjs/runtime';

animateSpring(element, {
  properties: { transform: ['scale(0.5)', 'scale(1)'] },
  stiffness: 300,   // Spring stiffness (default: 170)
  damping: 20,      // Damping ratio (default: 26)
  mass: 1,          // Mass of the object (default: 1)
});
```

### Spring parameters

| Parameter | Default | Effect |
|---|---|---|
| `stiffness` | `170` | Higher = snappier motion |
| `damping` | `26` | Higher = less oscillation |
| `mass` | `1` | Higher = more inertia, slower movement |

```ts
// Bouncy spring
animateSpring(el, {
  properties: { transform: ['translateY(50px)', 'translateY(0)'] },
  stiffness: 200,
  damping: 10,
  mass: 1,
});

// Stiff, no-bounce spring
animateSpring(el, {
  properties: { transform: ['translateY(50px)', 'translateY(0)'] },
  stiffness: 400,
  damping: 40,
  mass: 1,
});
```

## keyframes()

The `keyframes()` helper lets you define multi-step animations with offsets, rather than simple from/to pairs.

```ts
import { keyframes } from '@akashjs/runtime';

animate(element, {
  properties: keyframes([
    { offset: 0,   opacity: 0, transform: 'translateY(20px)' },
    { offset: 0.5, opacity: 1, transform: 'translateY(-5px)' },
    { offset: 1,   opacity: 1, transform: 'translateY(0)' },
  ]),
  duration: 600,
  easing: 'ease-out',
});
```

Each keyframe object has an `offset` (0 to 1) plus any CSS properties. This maps directly to the Web Animations API keyframe format.

### Pulse example

```ts
animate(button, {
  properties: keyframes([
    { offset: 0,    transform: 'scale(1)' },
    { offset: 0.25, transform: 'scale(1.1)' },
    { offset: 0.5,  transform: 'scale(0.95)' },
    { offset: 1,    transform: 'scale(1)' },
  ]),
  duration: 400,
});
```

## defineStates()

Create a state-based animation machine where transitions between named states are animated automatically.

```ts
import { defineStates } from '@akashjs/runtime';

const machine = defineStates(element, {
  states: {
    idle: { opacity: 1, transform: 'scale(1)' },
    hover: { opacity: 1, transform: 'scale(1.05)' },
    pressed: { opacity: 0.9, transform: 'scale(0.98)' },
    disabled: { opacity: 0.5, transform: 'scale(1)' },
  },
  transitions: {
    duration: 200,
    easing: 'ease-in-out',
  },
  initial: 'idle',
});

// Transition to a new state
machine.go('hover');

// Read the current state
console.log(machine.current()); // 'hover'

// Listen for state changes
machine.onTransition((from, to) => {
  console.log(`${from} -> ${to}`);
});
```

### Per-transition overrides

You can override duration and easing for specific state transitions:

```ts
const machine = defineStates(element, {
  states: {
    open: { height: 'auto', opacity: 1 },
    closed: { height: '0px', opacity: 0 },
  },
  transitions: {
    duration: 300,
    easing: 'ease-out',
    overrides: {
      'open->closed': { duration: 200, easing: 'ease-in' },
    },
  },
  initial: 'closed',
});
```

## Combining animations

All animation primitives return promises or controls, so you can compose them freely:

```ts
// Stagger in, then sequence a highlight
const items = document.querySelectorAll('.card');

await animateStagger(items, {
  properties: { opacity: [0, 1], transform: ['translateY(20px)', 'translateY(0)'] },
  duration: 300,
  stagger: 50,
});

await animateSequence([
  { element: items[0], properties: { background: ['white', '#ffffcc'] }, duration: 200 },
  { element: items[0], properties: { background: ['#ffffcc', 'white'] }, duration: 200 },
]);
```
