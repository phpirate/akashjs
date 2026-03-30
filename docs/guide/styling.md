# Styling

AkashJS provides lightweight styling utilities for class merging, dynamic style objects, and scoped CSS in single-file components.

## cx()

`cx()` merges class names from strings, objects, and arrays. Falsy values are filtered out automatically.

```ts
import { cx } from '@akashjs/runtime';

cx('btn', 'btn-primary');
// 'btn btn-primary'

cx('btn', { 'btn-primary': true, 'btn-disabled': false });
// 'btn btn-primary'

cx('btn', isActive() && 'active', isPending() && 'pending');
// 'btn active' (if isActive() is true and isPending() is false)

cx(['flex', 'gap-2'], { 'items-center': centered() });
// 'flex gap-2 items-center' (if centered() is true)
```

### Comparison to clsx

`cx()` works like [clsx](https://github.com/lukeed/clsx) but is bundled with the framework. If you are already familiar with `clsx`, the API is identical — no extra dependency needed.

```ts
// These are equivalent:
clsx('a', { b: true }, ['c', false && 'd']);
cx('a', { b: true }, ['c', false && 'd']);
// 'a b c'
```

### Template Usage

```html
<template>
  <button class={cx('btn', { active: isActive(), loading: isLoading() })}>
    Submit
  </button>
</template>
```

## css()

`css()` converts a style object to an inline style string. Property names are written in camelCase and converted to kebab-case. Numeric values automatically get `px` units where appropriate.

```ts
import { css } from '@akashjs/runtime';

css({ fontSize: 16, color: 'red', marginTop: 8 });
// 'font-size: 16px; color: red; margin-top: 8px;'

css({ opacity: 0.5, lineHeight: 1.5, zIndex: 10 });
// 'opacity: 0.5; line-height: 1.5; z-index: 10;'
```

### Unitless Properties

Certain CSS properties are unitless by convention. AkashJS does not append `px` to these:

`opacity`, `zIndex`, `fontWeight`, `lineHeight`, `flex`, `flexGrow`, `flexShrink`, `order`, `gridRow`, `gridColumn`, `columns`, `tabSize`, `widows`, `orphans`

```ts
css({ opacity: 0, fontWeight: 700, flex: 1 });
// 'opacity: 0; font-weight: 700; flex: 1;'
```

### Template Usage

```html
<template>
  <div style={css({ padding: 16, background: theme() === 'dark' ? '#222' : '#fff' })}>
    Content
  </div>
</template>
```

## applyStyles()

`applyStyles()` applies a style object directly to a DOM element. Useful in lifecycle hooks or imperative code where you have a reference to an element.

```ts
import { applyStyles } from '@akashjs/runtime';

onMount(() => {
  const el = document.querySelector('.tooltip');
  applyStyles(el, {
    position: 'absolute',
    top: y(),
    left: x(),
    transform: 'translateX(-50%)',
  });
});
```

It sets each property on `el.style` individually, so existing styles not included in the object are preserved.

### Reactive Styles

Combine with `effect()` for reactive inline styles:

```ts
import { applyStyles } from '@akashjs/runtime';
import { effect } from '@akashjs/runtime';

const boxRef = signal<HTMLElement | null>(null);

effect(() => {
  if (boxRef()) {
    applyStyles(boxRef()!, {
      width: size(),
      height: size(),
      background: color(),
    });
  }
});
```

## class:name Directive

Toggle individual CSS classes reactively with the `class:name` directive. The compiler transforms this into `classList.toggle()` calls for efficient DOM updates:

```html
<template>
  <button class="btn" class:active={isActive()} class:pulse={shouldPulse()}>
    Submit
  </button>
</template>
```

Compiled output (simplified):

```ts
const el = document.createElement('button');
el.className = 'btn';
effect(() => el.classList.toggle('active', isActive()));
effect(() => el.classList.toggle('pulse', shouldPulse()));
```

Each `class:name` directive creates a fine-grained effect that only touches that specific class. Static classes set via the `class` attribute are never affected. This is more efficient than re-computing the entire `className` string on every change.

## Scoped Styles

Single-file `.akash` components support `<style scoped>` blocks. Scoped styles are automatically transformed at build time to only target elements within the component, preventing style leakage.

```html
<script lang="ts">
const active = signal(false);
</script>

<template>
  <div class="card">
    <h2>Title</h2>
    <p class={cx({ active: active() })}>Content</p>
  </div>
</template>

<style scoped>
.card {
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
}

h2 {
  margin: 0 0 0.5rem;
}

.active {
  color: var(--accent);
}
</style>
```

The compiler adds a unique attribute (e.g., `data-v-a1b2c3`) to each element and rewrites selectors to include it, so `.card` becomes `.card[data-v-a1b2c3]`. This means scoped styles never affect parent or sibling components.

### :global() Selector

Use `:global()` inside a scoped style block to target elements outside the component. The wrapped selector is emitted without the scope attribute.

```html
<style scoped>
/* Targets .modal-overlay globally — no scope attribute added */
:global(.modal-overlay) {
  background: rgba(0, 0, 0, 0.5);
}

/* .local is scoped, .third-party is global */
.local :global(.third-party) {
  color: red;
}
</style>
```

Output:

```css
.modal-overlay { background: rgba(0,0,0,0.5); }
.local[data-a-x7k3f] .third-party { color: red; }
```

### Global Styles

For entirely global styles, omit the `scoped` attribute:

```html
<style>
body { margin: 0; }
</style>
```
