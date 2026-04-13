# Visual Inspector

AkashJS includes a built-in visual inspector for development. Hover over any element to see its component name, dimensions, attributes, and computed styles — without opening browser DevTools.

## Enable in Dev Mode

```ts
import { enableInspector } from '@akashjs/runtime';

if (import.meta.env.DEV) {
  enableInspector();
}
```

That is all you need. The inspector is now available in your app.

## Keyboard Shortcut

Press **Alt+Shift+I** to toggle the inspector on and off. When active, a small badge appears in the corner of the viewport indicating inspect mode is on.

## Click to Inspect

With the inspector enabled:

1. **Hover** over any element — a colored overlay highlights the element's bounding box.
2. **Click** an element — an info panel appears showing details about the element and its owning component.
3. **Press Escape** or click the close button to dismiss the panel.

The info panel shows:

| Section | Details |
|---|---|
| **Component** | The component name and source file location |
| **Element** | Tag name, id, classes |
| **Dimensions** | Width, height, x, y position |
| **Attributes** | All HTML attributes and their current values |
| **Styles** | Key computed styles (display, position, margin, padding, color, font) |
| **Signals** | Reactive bindings attached to this element |

## Inspector Options

Customize the inspector behavior:

```ts
enableInspector({
  shortcut: 'Alt+Shift+D',     // custom keyboard shortcut
  highlightColor: '#ff6b6b',    // overlay color (default: semi-transparent blue)
  showDimensions: true,          // show width/height on hover (default: true)
  position: 'bottom-right',     // info panel position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
});
```

## Programmatic Control

Use `createInspector()` for full control over the inspector lifecycle:

```ts
import { createInspector } from '@akashjs/runtime';

const inspector = createInspector({
  highlightColor: 'rgba(255, 107, 107, 0.3)',
});

// Enable/disable
inspector.enable();
inspector.disable();
inspector.toggle();

// Check state
inspector.active();  // reactive signal — true | false

// Inspect a specific element programmatically
inspector.inspect(document.querySelector('.my-element'));

// Listen for inspection events
inspector.on('inspect', (detail) => {
  console.log('Inspected:', detail.component);
  console.log('Element:', detail.element);
  console.log('Dimensions:', detail.rect);
});

// Destroy the inspector entirely
inspector.destroy();
```

## Using in Components

Toggle the inspector from a debug button:

```ts
import { defineComponent, signal } from '@akashjs/runtime';
import { createInspector } from '@akashjs/runtime';

const DevToolbar = defineComponent((ctx) => {
  const inspector = createInspector();

  return () => (
    <div class="dev-toolbar">
      <button on:click={inspector.toggle}>
        {inspector.active() ? 'Disable' : 'Enable'} Inspector
      </button>
    </div>
  );
});
```

## What Gets Inspected

The inspector understands AkashJS component boundaries. When you click a `<button>` inside a `Card` component, the panel shows:

```
Component: Card
  File: src/components/Card.ts:14

Element: <button class="card-action primary">
  Width: 120px  Height: 36px
  Position: (248, 512)

Attributes:
  class    "card-action primary"
  type     "button"

Styles:
  display     flex
  padding     8px 16px
  color       #ffffff
  background  #3b82f6

Signals:
  textContent  ← label()
  class        ← buttonClass()
```

## Production Builds

The inspector is automatically tree-shaken in production builds. The `enableInspector()` and `createInspector()` calls become no-ops when `import.meta.env.DEV` is false, so there is zero overhead in your shipped bundle.

```ts
// Safe to leave in your code — removed in production
enableInspector();
```
