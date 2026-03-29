# AppBar

A Material Design 3 top app bar with title, leading/trailing action slots, and configurable elevation. Fixed to the top of the viewport.

## Import

```ts
import { AppBar } from '@akashjs/ui';
```

## Variants

### Small (default)

Compact bar with the title inline.

```ts
AppBar({
  variant: 'small',
  title: 'My App',
})
```

### Center-aligned

Title is centered between leading and trailing actions.

```ts
AppBar({
  variant: 'center',
  title: 'My App',
})
```

### Medium

Title moves below the action row with a larger font size (24px) and extra bottom padding (24px).

```ts
AppBar({
  variant: 'medium',
  title: 'My App',
})
```

### Large

Title below the action row with the largest font size (28px) and bottom padding (28px).

```ts
AppBar({
  variant: 'large',
  title: 'My App',
})
```

## Elevation

Control the shadow depth with the `elevation` prop (0-5).

```ts
AppBar({
  title: 'Elevated Bar',
  elevation: 2,
})
```

## Leading and Trailing Actions

Pass children to add action buttons. For `center` and `small` variants, children appear in the top row alongside the title. For `medium` and `large` variants, children appear in the top row above the title.

```ts
const menuBtn = document.createElement('button');
menuBtn.textContent = 'Menu';

const searchBtn = document.createElement('button');
searchBtn.textContent = 'Search';

AppBar({
  title: 'My App',
  variant: 'small',
  elevation: 1,
  children: [menuBtn, searchBtn],
})
```

## Fixed Positioning

The AppBar is always fixed to the top of the viewport (`position: fixed; top: 0; left: 0; right: 0; z-index: 1000`). Add padding to your page content to account for its height:

```css
body {
  padding-top: 64px; /* small/center variants */
}
```

For `medium` and `large` variants, the height is dynamic due to the multi-line layout.

## Custom Class

```ts
AppBar({
  title: 'Styled',
  class: 'my-app-bar',
})
```

## Props

| Name | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | `''` | The title text |
| `variant` | `'center' \| 'small' \| 'medium' \| 'large'` | `'small'` | Layout variant controlling title position and size |
| `elevation` | `number` | `0` | Shadow depth (0-5) |
| `class` | `string` | -- | Custom CSS class name |
| `children` | `AkashNode` | -- | Leading and trailing action elements |
