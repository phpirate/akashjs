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

### Removable Chips

Any chip can show an X button with `removable: true` or `onRemove`:

```ts
Chip({
  label: 'john@example.com',
  removable: true,
  onRemove: () => removeTag('john@example.com'),
})
```

### Color Variants

```ts
Chip({ label: 'Primary', color: 'primary' })
Chip({ label: 'Accent', color: 'accent' })
Chip({ label: 'Custom', color: '#ff5722' })
Chip({ label: 'Selected', color: 'primary', selected: true })
```

### Icon (String)

Pass a Material Symbols icon name as a string:

```ts
Chip({ label: 'Alice', icon: 'person' })
Chip({ label: 'Bug', icon: 'bug_report', color: 'accent' })
```

### Disabled

```ts
Chip({ label: 'Disabled', disabled: true })
```

### Chip Props

| Name | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | **(required)** | Chip text |
| `variant` | `'assist' \| 'filter' \| 'input' \| 'suggestion'` | `'assist'` | Visual and behavioral variant |
| `selected` | `boolean` | `false` | Selected state |
| `icon` | `string \| AkashNode` | -- | Leading icon (Material Symbols name or Node) |
| `color` | `'primary' \| 'accent' \| string` | -- | Color variant or custom CSS color |
| `removable` | `boolean` | `false` | Show remove (X) button |
| `disabled` | `boolean` | `false` | Disabled state |
| `value` | `unknown` | -- | Value for use inside ChipListbox |
| `onClick` | `(e: MouseEvent) => void` | -- | Click handler |
| `onRemove` | `() => void` | -- | Remove handler (X button) |
| `class` | `string` | -- | Custom CSS class |

---

## ChipSet

Simple flex container for displaying chips.

```ts
import { ChipSet, Chip } from '@akashjs/ui';

ChipSet({
  children: () => [
    Chip({ label: 'Transcriber', color: 'primary' }),
    Chip({ label: 'QA Score: 4.5', color: 'accent' }),
    Chip({ label: 'Alice', icon: 'person' }),
  ],
})
```

| Name | Type | Default | Description |
|---|---|---|---|
| `gap` | `string` | `'8px'` | Gap between chips |
| `class` | `string` | -- | Custom CSS class |

---

## ChipListbox

Selectable chip group — single or multi-select with keyboard navigation.

### Single Select

```ts
import { ChipListbox } from '@akashjs/ui';

ChipListbox({
  options: [
    { value: 'bug', label: 'Bug', icon: 'bug_report' },
    { value: 'feature', label: 'Feature', icon: 'lightbulb' },
    { value: 'task', label: 'Task', icon: 'task' },
  ],
  value: selectedType(),
  onChange: (v) => selectedType.set(v),
})
```

### Multi-Select

```ts
ChipListbox({
  options: [
    { value: 'mild', label: 'Mild' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'high', label: 'High' },
  ],
  value: selectedEmotions(),
  onChange: (v) => selectedEmotions.set(v),
  multiple: true,
  color: 'accent',
})
```

### Keyboard

| Key | Action |
|-----|--------|
| Arrow Left/Right/Up/Down | Navigate chips |
| Space / Enter | Toggle selection |

### ChipListbox Props

| Name | Type | Default | Description |
|---|---|---|---|
| `options` | `ChipListboxOption[]` | -- | Options |
| `value` | `T \| T[]` | -- | Selected value(s) |
| `onChange` | `(value) => void` | -- | Change handler |
| `multiple` | `boolean` | `false` | Multi-select |
| `compareWith` | `(a, b) => boolean` | `===` | Custom equality |
| `color` | `string` | -- | Selected chip color |
| `gap` | `string` | `'8px'` | Gap between chips |

---

## ChipGrid

Editable chip collection with text input, backspace removal, paste support, and optional autocomplete.

### Basic

```ts
import { ChipGrid } from '@akashjs/ui';

ChipGrid({
  chips: tags(),
  onAdd: (val) => tags.update(t => [...t, { value: val, label: val }]),
  onRemove: (chip) => tags.update(t => t.filter(x => x !== chip)),
  placeholder: 'Add tag...',
})
```

### With Autocomplete

```ts
ChipGrid({
  chips: selectedUsers(),
  onAdd: (user) => selectedUsers.update(u => [...u, user]),
  onRemove: (user) => selectedUsers.update(u => u.filter(x => x.id !== user.id)),
  placeholder: 'Search users...',
  autocomplete: (term) => allUsers.filter(u => u.name.toLowerCase().includes(term.toLowerCase())),
  displayFn: (u) => u.name,
})
```

### Keyboard & Paste

- **Enter** — add chip from input
- **Backspace** (empty input) — remove last chip
- **Paste** — splits by comma/newline and adds each as a chip
- **Arrow Up/Down** — navigate autocomplete
- **Escape** — close autocomplete

### ChipGrid Props

| Name | Type | Default | Description |
|---|---|---|---|
| `chips` | `ChipGridItem[]` | `[]` | Current chips |
| `onAdd` | `(value: string) => void` | -- | Add callback |
| `onRemove` | `(chip: ChipGridItem) => void` | -- | Remove callback |
| `placeholder` | `string` | `''` | Input placeholder |
| `disabled` | `boolean` | `false` | Disabled state |
| `color` | `string` | -- | Chip color |
| `autocomplete` | `(term: string) => ChipGridItem[]` | -- | Autocomplete function |
| `autocompleteDebounce` | `number` | `200` | Debounce (ms) |
| `displayFn` | `(value) => string` | -- | Label formatter for object values |
| `pasteSeparator` | `RegExp` | `/[,\n]/` | Paste split pattern |

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
