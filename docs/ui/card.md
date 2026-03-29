# Card

A Material Design 3 surface container with elevated, filled, and outlined variants. Cards can be made clickable with ripple effects and hover elevation changes.

## Import

```ts
import { Card } from '@akashjs/ui';
```

## Variants

### Elevated (default)

A raised card with level-1 shadow on `surface-container-low` background.

```ts
Card({
  variant: 'elevated',
  children: 'Elevated card content',
})
```

### Filled

A flat card on the `surface-container-highest` background with no shadow.

```ts
Card({
  variant: 'filled',
  children: 'Filled card content',
})
```

### Outlined

A flat card on the `surface` background with a visible border.

```ts
Card({
  variant: 'outlined',
  children: 'Outlined card content',
})
```

## Clickable Cards

Set `clickable` to `true` to enable pointer cursor, ripple effect, hover elevation changes, and keyboard focus styling.

```ts
Card({
  variant: 'elevated',
  clickable: true,
  children: 'Click me',
})
```

When clickable:
- **Hover:** Elevated cards increase to level-2 shadow; filled cards gain level-1 shadow
- **Focus:** A 2px primary outline appears with a 2px offset
- **Ripple:** An ink ripple animates from the pointer on click
- **Role:** Set to `button` with `tabIndex: 0` for keyboard access

## Custom Class

```ts
Card({
  variant: 'outlined',
  class: 'product-card',
  children: productContent,
})
```

## Rich Content

Cards accept any DOM nodes as children.

```ts
const content = document.createElement('div');

const title = document.createElement('h3');
title.textContent = 'Card Title';
content.appendChild(title);

const body = document.createElement('p');
body.textContent = 'Card body text goes here.';
content.appendChild(body);

Card({
  variant: 'elevated',
  children: content,
})
```

## Props

| Name | Type | Default | Description |
|---|---|---|---|
| `variant` | `'elevated' \| 'filled' \| 'outlined'` | `'elevated'` | Visual style variant |
| `clickable` | `boolean` | `false` | Enables ripple, hover elevation, focus ring, and button role |
| `class` | `string` | -- | Custom CSS class name |
| `children` | `AkashNode` | -- | Card content |
