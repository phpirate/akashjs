# Chips, Badges, Avatar & Tooltip

Compact UI elements for tagging, status indication, user representation, and contextual help.

## Chip

### Import

```ts
import { Chip } from '@akashjs/ui';
```

### Variants

#### Assist (default)

General-purpose chip for actions.

```ts
Chip({
  label: 'Add to calendar',
  variant: 'assist',
  onClick: () => console.log('assist'),
})
```

#### Filter

Used in filter groups. Supports a `selected` state that fills the chip with the secondary container color and shows a checkmark.

```ts
Chip({
  label: 'Vegetarian',
  variant: 'filter',
  selected: true,
  onClick: () => toggleFilter('vegetarian'),
})
```

#### Input

Represents user input (tags, contacts). Supports a close button via `onClose`.

```ts
Chip({
  label: 'john@example.com',
  variant: 'input',
  onClose: () => removeTag('john@example.com'),
})
```

#### Suggestion

Dynamically generated suggestions.

```ts
Chip({
  label: 'Try "machine learning"',
  variant: 'suggestion',
  onClick: () => search('machine learning'),
})
```

### With Icon

```ts
const starIcon = document.createElement('span');
starIcon.textContent = 'S';

Chip({
  label: 'Favorites',
  icon: starIcon,
  variant: 'assist',
})
```

### Chip Props

| Name | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | **(required)** | Chip text |
| `variant` | `'assist' \| 'filter' \| 'input' \| 'suggestion'` | `'assist'` | Visual and behavioral variant |
| `selected` | `boolean` | `false` | Selected state (only applies to `filter` variant) |
| `icon` | `AkashNode` | -- | Leading icon node |
| `onClose` | `() => void` | -- | Close handler (only renders close button for `input` variant) |
| `onClick` | `(e: MouseEvent) => void` | -- | Click handler |

---

## Badge

### Import

```ts
import { Badge } from '@akashjs/ui';
```

### Small Dot

A 6px dot indicator for simple status, positioned absolutely.

```ts
const container = document.createElement('div');
container.style.position = 'relative';
container.style.display = 'inline-block';
container.appendChild(iconElement);
container.appendChild(Badge({ variant: 'small' }));
```

### Large Number

A pill-shaped badge displaying a number or text.

```ts
Badge({
  variant: 'large',
  content: 5,
  color: 'error',
})
```

### Color Options

```ts
// Error color (default) -- red background
Badge({ variant: 'large', content: 99, color: 'error' })

// Primary color -- purple background
Badge({ variant: 'large', content: 3, color: 'primary' })
```

### Badge Props

| Name | Type | Default | Description |
|---|---|---|---|
| `content` | `string \| number` | -- | Text or number displayed (large variant only) |
| `variant` | `'small' \| 'large'` | `'small'` | Dot indicator or number pill |
| `color` | `'error' \| 'primary'` | `'error'` | Badge color |

---

## Avatar

### Import

```ts
import { Avatar } from '@akashjs/ui';
```

### With Image

```ts
Avatar({
  src: '/photos/user.jpg',
  alt: 'Jane Doe',
  size: 'medium',
})
```

### With Initials Fallback

When no `src` is provided, or if the image fails to load, the avatar displays initials on a primary-container background.

```ts
Avatar({
  initials: 'JD',
  size: 'large',
})
```

### Sizes

```ts
Avatar({ initials: 'S', size: 'small' })  // 28px
Avatar({ initials: 'M', size: 'medium' }) // 40px (default)
Avatar({ initials: 'L', size: 'large' })  // 56px
```

### Avatar Props

| Name | Type | Default | Description |
|---|---|---|---|
| `src` | `string` | -- | Image URL |
| `alt` | `string` | `''` | Alt text for the image |
| `initials` | `string` | `''` | Fallback initials (max 2 characters displayed) |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | Diameter: 28px, 40px, or 56px |

---

## Tooltip

### Import

```ts
import { Tooltip } from '@akashjs/ui';
```

### Basic Usage

Wraps children and shows a tooltip on hover and focus.

```ts
Tooltip({
  text: 'Add new item',
  position: 'top',
  children: addButton,
})
```

### Position Options

```ts
Tooltip({ text: 'Above', position: 'top', children: el })
Tooltip({ text: 'Below', position: 'bottom', children: el })
Tooltip({ text: 'Left', position: 'left', children: el })
Tooltip({ text: 'Right', position: 'right', children: el })
```

### Tooltip Props

| Name | Type | Default | Description |
|---|---|---|---|
| `text` | `string` | **(required)** | Tooltip text content |
| `position` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'top'` | Tooltip placement relative to the child |
| `children` | `AkashNode` | -- | The element that triggers the tooltip |
