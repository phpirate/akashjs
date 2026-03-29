# Directives

Directives attach reusable behavior to DOM elements without wrapping them in components. They hook into element lifecycle events -- mounted, updated, and unmounted -- to add effects like focus management, click detection, and resize tracking.

## defineDirective()

Create a directive by providing lifecycle hooks:

```ts
import { defineDirective } from '@akashjs/runtime';

const vTooltip = defineDirective<string>({
  mounted(el, { value }) {
    // Add tooltip when element enters the DOM
    el.setAttribute('title', value);
  },
  updated(el, { value, oldValue }) {
    // Update when the bound value changes
    el.setAttribute('title', value);
  },
  unmounted(el) {
    // Clean up when element is removed
    el.removeAttribute('title');
  },
});
```

The generic type parameter (`<string>` above) types the value passed to the directive.

### Directive Binding

Each hook receives the element and a binding object:

| Property | Type | Description |
|---|---|---|
| `value` | `T` | Current value passed to the directive |
| `oldValue` | `T \| undefined` | Previous value (only on `updated`) |
| `arg` | `string \| undefined` | Argument string |
| `modifiers` | `Record<string, boolean> \| undefined` | Modifier flags |

## Applying Directives

Use `applyDirective()` to attach a directive to an element:

```ts
import { applyDirective, updateDirective, removeDirectives } from '@akashjs/runtime';

// Attach
applyDirective(el, vTooltip, 'Hello tooltip');

// Update value
updateDirective(el, vTooltip, 'New tooltip text');

// Remove all directives from an element (call on unmount)
removeDirectives(el);
```

You can pass an options object with `arg` and `modifiers`:

```ts
applyDirective(el, vCustom, value, {
  arg: 'click',
  modifiers: { prevent: true, once: true },
});
```

## directiveFromFn()

For simple directives that only need a mount function, use the shorthand:

```ts
import { directiveFromFn } from '@akashjs/runtime';

const vHighlight = directiveFromFn<string>((el, { value }) => {
  el.style.backgroundColor = value;

  // Return a cleanup function (runs on unmount)
  return () => {
    el.style.backgroundColor = '';
  };
});
```

If the function returns a cleanup callback, it is called automatically when the element unmounts.

## Built-in Directives

### vAutoFocus

Focuses the element when it enters the DOM:

```ts
import { vAutoFocus, applyDirective } from '@akashjs/runtime';

applyDirective(inputEl, vAutoFocus);
```

### vClickOutside

Calls a handler when the user clicks outside the element. Useful for closing dropdowns and modals:

```ts
import { vClickOutside, applyDirective } from '@akashjs/runtime';

applyDirective(dropdownEl, vClickOutside, () => {
  isOpen.set(false);
});
```

### vLongPress

Fires a handler after the user holds down a pointer for a configurable duration:

```ts
import { vLongPress, applyDirective } from '@akashjs/runtime';

applyDirective(el, vLongPress, {
  handler: () => showContextMenu(),
  duration: 800,  // ms, default is 500
});
```

### vIntersect

Calls a callback when the element enters or leaves the viewport using `IntersectionObserver`:

```ts
import { vIntersect, applyDirective } from '@akashjs/runtime';

applyDirective(el, vIntersect, (isIntersecting) => {
  if (isIntersecting) loadMore();
});
```

### vResize

Calls a callback when the element is resized using `ResizeObserver`:

```ts
import { vResize, applyDirective } from '@akashjs/runtime';

applyDirective(el, vResize, (entry) => {
  console.log('New size:', entry.contentRect.width, entry.contentRect.height);
});
```

## Switch Component

The `Switch` component renders one of multiple branches based on a reactive expression, similar to a `switch/case` statement:

```ts
import { Switch } from '@akashjs/runtime';

Switch({
  on: status(),
  cases: {
    loading: () => Spinner({}),
    error: () => ErrorView({}),
    success: () => Content({}),
  },
  fallback: () => 'Unknown status',
});
```

Or in template syntax:

```html
<Switch on={status()}>
  <Case value="loading"><Spinner /></Case>
  <Case value="error"><ErrorMessage /></Case>
  <Case value="success"><Content /></Case>
  <Default><Fallback /></Default>
</Switch>
```

### match()

For functional pattern matching outside of templates, use `match()`:

```ts
import { match } from '@akashjs/runtime';

const message = match(status(), {
  loading: () => 'Loading...',
  error: () => 'Something went wrong',
  success: () => 'Done!',
  _: () => 'Unknown',  // default case
});
```

The `_` key acts as the default branch. If no branch matches and no default is provided, `match()` returns `undefined`.
