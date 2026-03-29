# Event Modifiers & Directives

AkashJS provides a set of helpers for event handling, element binding, and reactive styling inspired by Svelte's event modifiers and binding directives.

## withModifiers()

`withModifiers()` wraps an event handler with declarative modifiers, removing boilerplate like `e.preventDefault()`.

```ts
import { withModifiers } from '@akashjs/runtime';

html`
  <form @submit=${withModifiers(handleSubmit, ['preventDefault'])}>
    <input name="email" />
    <button type="submit">Submit</button>
  </form>
`;
```

### Available Modifiers

| Modifier | Description |
|----------|-------------|
| `preventDefault` | Calls `event.preventDefault()` |
| `stopPropagation` | Calls `event.stopPropagation()` |
| `once` | Handler fires only once, then removes itself |
| `self` | Only fires if `event.target` is the element itself (not a child) |
| `capture` | Adds the listener in capture phase |
| `passive` | Sets `{ passive: true }` for scroll performance |

Combine multiple modifiers:

```ts
html`
  <div @click=${withModifiers(handleClick, ['preventDefault', 'stopPropagation', 'once'])}>
    Click me (once)
  </div>
`;
```

## onEvent()

`onEvent()` is an imperative helper for adding event listeners with automatic cleanup. It returns a `dispose` function.

```ts
import { onEvent } from '@akashjs/runtime';

const dispose = onEvent(window, 'resize', (e) => {
  console.log('Window resized:', e.target.innerWidth);
});

// Later: remove the listener
dispose();
```

When used inside a component's setup function, `onEvent()` automatically disposes when the component is destroyed:

```ts
const MyComponent = component('app-my', () => {
  // Automatically cleaned up on component destroy
  onEvent(document, 'keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  return html`...`;
});
```

### onEvent Options

```ts
onEvent(target, event, handler, {
  capture: false,
  passive: false,
  once: false,
});
```

## bindDimensions()

`bindDimensions()` tracks an element's `clientWidth` and `clientHeight` as reactive signals, updating on resize.

```ts
import { bindDimensions } from '@akashjs/runtime';

const MyComponent = component('app-resizable', () => {
  const dims = bindDimensions();

  return html`
    <div ${dims.ref}>
      <p>Width: ${() => dims.clientWidth()}px</p>
      <p>Height: ${() => dims.clientHeight()}px</p>
    </div>
  `;
});
```

### Props

| Property | Type | Description |
|----------|------|-------------|
| `dims.ref` | directive | Apply to the target element |
| `dims.clientWidth` | `Signal<number>` | Reactive client width |
| `dims.clientHeight` | `Signal<number>` | Reactive client height |

Dimensions update automatically using `ResizeObserver` under the hood.

## bindScroll()

`bindScroll()` creates a two-way binding for scroll position. Read the current scroll position or programmatically scroll by setting the signal.

```ts
import { bindScroll } from '@akashjs/runtime';

const MyComponent = component('app-scrollable', () => {
  const scroll = bindScroll();

  return html`
    <div ${scroll.ref} class="scroll-container">
      <p>Scroll Y: ${() => Math.round(scroll.scrollY())}</p>
      <!-- long content -->
    </div>
    <button @click=${() => scroll.scrollY.set(0)}>Back to top</button>
  `;
});
```

### Props

| Property | Type | Description |
|----------|------|-------------|
| `scroll.ref` | directive | Apply to the scrollable element |
| `scroll.scrollX` | `Signal<number>` | Reactive horizontal scroll (read/write) |
| `scroll.scrollY` | `Signal<number>` | Reactive vertical scroll (read/write) |

## bindElement()

`bindElement()` captures a reference to a DOM element as a reactive signal. This is AkashJS's equivalent of Svelte's `bind:this`.

```ts
import { bindElement } from '@akashjs/runtime';

const MyComponent = component('app-canvas', () => {
  const canvas = bindElement<HTMLCanvasElement>();

  effect(() => {
    const el = canvas();
    if (!el) return;
    const ctx = el.getContext('2d');
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, 100, 100);
  });

  return html`
    <canvas ${canvas.ref} width="400" height="300"></canvas>
  `;
});
```

### Props

| Property | Type | Description |
|----------|------|-------------|
| `canvas()` | `T \| undefined` | The element (undefined before mount) |
| `canvas.ref` | directive | Apply to the target element |

## bindGroup() / bindGroupItem()

`bindGroup()` and `bindGroupItem()` manage radio button groups with a single signal.

```ts
import { bindGroup, bindGroupItem } from '@akashjs/runtime';

const MyComponent = component('app-radio', () => {
  const color = bindGroup<string>('red');

  return html`
    <label>
      <input type="radio" name="color" ${bindGroupItem(color, 'red')} />
      Red
    </label>
    <label>
      <input type="radio" name="color" ${bindGroupItem(color, 'green')} />
      Green
    </label>
    <label>
      <input type="radio" name="color" ${bindGroupItem(color, 'blue')} />
      Blue
    </label>
    <p>Selected: ${color}</p>
  `;
});
```

### Props

| Function | Parameters | Description |
|----------|------------|-------------|
| `bindGroup(initial)` | `initial: T` | Creates a signal for the group's selected value |
| `bindGroupItem(group, value)` | `group: Signal<T>, value: T` | Directive that binds a radio input to the group |

## bindClass() / bindClasses()

Conditionally apply CSS classes to elements.

### bindClass()

Apply a single class conditionally:

```ts
import { bindClass } from '@akashjs/runtime';

html`
  <div ${bindClass('active', () => isActive())}>
    Conditionally active
  </div>
`;
```

### bindClasses()

Apply multiple classes from an object:

```ts
import { bindClasses } from '@akashjs/runtime';

html`
  <div ${bindClasses({
    active: () => isActive(),
    disabled: () => isDisabled(),
    'text-bold': () => isBold(),
  })}>
    Multiple conditional classes
  </div>
`;
```

### Props

| Function | Parameters | Description |
|----------|------------|-------------|
| `bindClass(name, condition)` | `name: string, condition: () => boolean` | Toggle a single class |
| `bindClasses(map)` | `map: Record<string, () => boolean>` | Toggle multiple classes |

## bindStyle() / bindStyles()

Reactively set inline styles on elements.

### bindStyle()

Set a single style property:

```ts
import { bindStyle } from '@akashjs/runtime';

html`
  <div ${bindStyle('color', () => isDanger() ? 'red' : 'inherit')}>
    Reactive color
  </div>
`;
```

### bindStyles()

Set multiple style properties from an object:

```ts
import { bindStyles } from '@akashjs/runtime';

html`
  <div ${bindStyles({
    color: () => textColor(),
    'font-size': () => `${fontSize()}px`,
    opacity: () => isVisible() ? '1' : '0',
    transform: () => `translateX(${offset()}px)`,
  })}>
    Multiple reactive styles
  </div>
`;
```

### Props

| Function | Parameters | Description |
|----------|------------|-------------|
| `bindStyle(prop, value)` | `prop: string, value: () => string` | Set one CSS property reactively |
| `bindStyles(map)` | `map: Record<string, () => string>` | Set multiple CSS properties reactively |

## Combining Helpers

These utilities compose naturally:

```ts
const Card = component('app-card', () => {
  const el = bindElement<HTMLDivElement>();
  const dims = bindDimensions();
  const expanded = signal(false);

  return html`
    <div
      ${el.ref}
      ${dims.ref}
      ${bindClasses({
        card: () => true,
        expanded: () => expanded(),
        compact: () => dims.clientWidth() < 400,
      })}
      ${bindStyles({
        'max-height': () => expanded() ? 'none' : '200px',
      })}
      @click=${withModifiers(() => expanded.set(!expanded()), ['self'])}
    >
      <p>Card is ${() => dims.clientWidth()}px wide</p>
      <slot></slot>
    </div>
  `;
});
```
