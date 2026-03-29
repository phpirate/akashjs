# Progress & Skeleton

Loading indicators and placeholder content for async states.

## ProgressBar

A linear progress indicator.

### Import

```ts
import { ProgressBar } from '@akashjs/ui';
```

### Determinate

Shows a filled track representing a known completion percentage (0-100).

```ts
ProgressBar({
  variant: 'determinate',
  value: 65,
})
```

### Indeterminate

An animated bar that loops continuously for unknown-duration tasks.

```ts
ProgressBar({
  variant: 'indeterminate',
})
```

### ProgressBar Props

| Name | Type | Default | Description |
|---|---|---|---|
| `value` | `number` | `0` | Completion percentage (0-100), used in determinate mode |
| `variant` | `'determinate' \| 'indeterminate'` | `'determinate'` | Whether to show a specific value or a looping animation |

---

## ProgressCircular

An SVG-based circular progress indicator.

### Import

```ts
import { ProgressCircular } from '@akashjs/ui';
```

### Indeterminate (default)

A continuously rotating spinner.

```ts
ProgressCircular({
  variant: 'indeterminate',
  size: 48,
})
```

### Determinate

An arc that fills based on the value.

```ts
ProgressCircular({
  variant: 'determinate',
  value: 75,
  size: 64,
})
```

### Custom Size

```ts
// Small spinner
ProgressCircular({ size: 24 })

// Large spinner
ProgressCircular({ size: 96 })
```

### ProgressCircular Props

| Name | Type | Default | Description |
|---|---|---|---|
| `value` | `number` | `0` | Completion percentage (0-100), used in determinate mode |
| `size` | `number` | `48` | Diameter in pixels |
| `variant` | `'determinate' \| 'indeterminate'` | `'indeterminate'` | Whether to show a specific value or a rotating animation |

---

## Skeleton

Placeholder shimmer elements for loading states.

### Import

```ts
import { Skeleton } from '@akashjs/ui';
```

### Text Variant

A rounded rectangle matching text line dimensions. Default width is 100%, height is 1em.

```ts
Skeleton({ variant: 'text' })
Skeleton({ variant: 'text', width: '60%' })
```

### Circular Variant

A circle, useful as an avatar placeholder. Default size is 40px.

```ts
Skeleton({ variant: 'circular' })
Skeleton({ variant: 'circular', width: '56px', height: '56px' })
```

### Rectangular Variant

A rectangle for images or card placeholders. Default height is 120px.

```ts
Skeleton({ variant: 'rectangular' })
Skeleton({ variant: 'rectangular', height: '200px' })
```

### Pulse Animation (default)

Fades opacity between 100% and 40% in a 1.5s loop.

```ts
Skeleton({ variant: 'text', animation: 'pulse' })
```

### Wave Animation

A gradient sweep that moves across the element in a 1.5s loop.

```ts
Skeleton({ variant: 'rectangular', animation: 'wave' })
```

### Card Loading Example

```ts
const loadingCard = Card({
  variant: 'outlined',
  children: Stack({
    direction: 'column',
    gap: '12px',
    children: [
      Skeleton({ variant: 'rectangular', height: '180px' }),
      Skeleton({ variant: 'text', width: '80%' }),
      Skeleton({ variant: 'text', width: '60%' }),
      Stack({
        direction: 'row',
        gap: '8px',
        align: 'center',
        children: [
          Skeleton({ variant: 'circular', width: '32px', height: '32px' }),
          Skeleton({ variant: 'text', width: '120px' }),
        ],
      }),
    ],
  }),
})
```

### Skeleton Props

| Name | Type | Default | Description |
|---|---|---|---|
| `variant` | `'text' \| 'circular' \| 'rectangular'` | `'text'` | Shape of the placeholder |
| `width` | `string` | Varies by variant | CSS width value |
| `height` | `string` | Varies by variant | CSS height value |
| `animation` | `'pulse' \| 'wave'` | `'pulse'` | Animation style |
