# Web Components

AkashJS components can be compiled to native Custom Elements, making them usable in plain HTML, React, Vue, Svelte, or any other framework.

## defineCustomElement()

Register an AkashJS component as a custom element with a single call:

```ts
import { defineCustomElement } from '@akashjs/runtime';
import Counter from './Counter.akash';

defineCustomElement('my-counter', Counter, {
  props: ['initial', 'step'],
  shadow: true,
  styles: ':host { display: block; }',
});
```

The component is now available as `<my-counter>` in any HTML page.

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `props` | `string[]` | `[]` | Attribute names to observe and pass as props |
| `shadow` | `boolean` | `true` | Use Shadow DOM for style encapsulation |
| `styles` | `string` | -- | CSS to inject into the shadow root |
| `extends` | `string` | -- | Extend a built-in HTML element (e.g. `'button'`) |

## Props as Attributes

Properties listed in the `props` array are observed as HTML attributes. When an attribute changes, the component re-renders with the new value:

```html
<my-counter initial="5" step="2"></my-counter>
```

Attribute values are automatically parsed: `"5"` becomes the number `5`, `"true"` becomes the boolean `true`, and JSON strings are parsed into objects. Plain strings are kept as-is.

You can also set props programmatically:

```ts
const el = document.querySelector('my-counter');
el.setProps({ initial: 10, step: 3 });
```

## Shadow DOM

By default, custom elements use Shadow DOM to encapsulate styles. Set `shadow: false` to render directly into the element (light DOM):

```ts
defineCustomElement('my-widget', Widget, {
  props: ['title'],
  shadow: false,  // styles from the page will apply
});
```

## Styles Injection

When using Shadow DOM, inject component styles via the `styles` option:

```ts
defineCustomElement('my-card', Card, {
  shadow: true,
  styles: `
    :host {
      display: block;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 1rem;
    }
    ::slotted(h2) {
      margin-top: 0;
    }
  `,
});
```

## toCustomElement()

If you want the Custom Element class without auto-registering it, use `toCustomElement()`:

```ts
import { toCustomElement } from '@akashjs/runtime';

const MyCounterElement = toCustomElement(Counter, {
  props: ['initial'],
  shadow: true,
});

// Register manually whenever you want
customElements.define('my-counter', MyCounterElement);
```

This is useful for testing, lazy registration, or conditional registration.

## Usage in Plain HTML

After registering the custom element (e.g., in a `<script>` tag or a bundled JS file), use it like any HTML element:

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module" src="/components.js"></script>
</head>
<body>
  <my-counter initial="0"></my-counter>
  <my-card>
    <h2>Hello</h2>
    <p>Content goes here.</p>
  </my-card>
</body>
</html>
```

## Usage in Other Frameworks

### React

```jsx
function App() {
  return <my-counter initial={5} />;
}
```

### Vue

```vue
<template>
  <my-counter :initial="5" />
</template>
```

### Svelte

```svelte
<my-counter initial={5} />
```

Custom elements are framework-agnostic by design. Any framework that renders HTML can use them.

## Extending Built-in Elements

Use the `extends` option to create customized built-in elements:

```ts
defineCustomElement('fancy-button', FancyButton, {
  props: ['variant'],
  extends: 'button',
});
```

```html
<button is="fancy-button" variant="primary">Click me</button>
```

Note: customized built-in elements are not supported in WebKit/Safari.
