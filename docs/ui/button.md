# Button

A Material Design 3 button with filled, outlined, text, and tonal variants. Includes ripple effects, icon support, and three sizes.

## Import

```ts
import { Button } from '@akashjs/ui';
```

## Variants

### Filled (default)

The primary action button with a solid background color.

```ts
Button({
  variant: 'filled',
  onClick: () => console.log('clicked'),
  children: 'Filled Button',
})
```

### Outlined

A medium-emphasis button with a border and no fill.

```ts
Button({
  variant: 'outlined',
  onClick: () => console.log('clicked'),
  children: 'Outlined Button',
})
```

### Text

A low-emphasis button with no border or fill, just a text label.

```ts
Button({
  variant: 'text',
  onClick: () => console.log('clicked'),
  children: 'Text Button',
})
```

### Tonal

A filled button using the secondary container color for medium emphasis.

```ts
Button({
  variant: 'tonal',
  onClick: () => console.log('clicked'),
  children: 'Tonal Button',
})
```

## Sizes

Three size presets control height, padding, and font size.

```ts
// Small: 32px height, 13px font
Button({ size: 'small', children: 'Small' })

// Medium (default): 40px height, 14px font
Button({ size: 'medium', children: 'Medium' })

// Large: 48px height, 16px font
Button({ size: 'large', children: 'Large' })
```

## With Icon

Pass any DOM node to the `icon` prop. It is rendered before the label with size matching the button size.

```ts
const icon = document.createElement('span');
icon.textContent = '+';

Button({
  variant: 'filled',
  icon,
  children: 'Add Item',
})
```

## Disabled State

When `disabled` is `true`, the button reduces to 38% opacity, disables pointer events, and removes the ripple.

```ts
Button({
  variant: 'filled',
  disabled: true,
  children: 'Disabled',
})
```

## Ripple Effect

All enabled buttons have a built-in Material ink ripple on click. The ripple animates from the pointer position using a 450ms scale animation. No configuration is needed -- it is added automatically when `disabled` is not `true`.

## Custom Class

Pass a CSS class name for additional styling.

```ts
Button({
  variant: 'outlined',
  class: 'my-custom-btn',
  children: 'Styled',
})
```

## Props

| Name | Type | Default | Description |
|---|---|---|---|
| `variant` | `'filled' \| 'outlined' \| 'text' \| 'tonal'` | `'filled'` | Visual style variant |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | Controls height, padding, and font size |
| `disabled` | `boolean` | `false` | Disables the button and removes interactions |
| `icon` | `AkashNode` | -- | Optional leading icon node |
| `onClick` | `(e: MouseEvent) => void` | -- | Click event handler |
| `class` | `string` | -- | Custom CSS class name |
| `children` | `AkashNode` | -- | Button label content |
