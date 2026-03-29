# Layout

Structural primitives for page layout: Divider, Grid, Stack, and Breadcrumb.

## Divider

A horizontal or vertical separator line.

### Import

```ts
import { Divider } from '@akashjs/ui';
```

### Full Width (default)

```ts
Divider({ variant: 'full' })
```

### Inset

Adds left margin (16px) to indent the divider from the leading edge. Useful inside lists.

```ts
Divider({ variant: 'inset' })
```

### Middle

Adds horizontal margin (16px on each side) to center the divider with padding.

```ts
Divider({ variant: 'middle' })
```

### Vertical

Set `vertical: true` for a vertical separator. The divider stretches to fill its container's height.

```ts
Divider({ vertical: true })
```

### Divider Props

| Name | Type | Default | Description |
|---|---|---|---|
| `variant` | `'full' \| 'inset' \| 'middle'` | `'full'` | Margin style |
| `vertical` | `boolean` | `false` | Render as a vertical separator |

---

## Grid

A CSS Grid wrapper with responsive column support.

### Import

```ts
import { Grid, GridItem } from '@akashjs/ui';
```

### Basic Grid

```ts
Grid({
  columns: 3,
  gap: '16px',
  children: [
    GridItem({ children: 'Column 1' }),
    GridItem({ children: 'Column 2' }),
    GridItem({ children: 'Column 3' }),
  ],
})
```

### Spanning Columns

```ts
Grid({
  columns: 12,
  gap: '16px',
  children: [
    GridItem({ span: 8, children: 'Main content' }),
    GridItem({ span: 4, children: 'Sidebar' }),
  ],
})
```

### Responsive Breakpoints

Pass an object with breakpoint keys for responsive column counts.

```ts
Grid({
  columns: { xs: 1, sm: 2, md: 3, lg: 4, xl: 6 },
  gap: '16px',
  children: items.map(item =>
    GridItem({ children: item })
  ),
})
```

Breakpoints follow Material Design guidelines:

| Breakpoint | Min Width |
|---|---|
| `xs` | `0px` |
| `sm` | `600px` |
| `md` | `905px` |
| `lg` | `1240px` |
| `xl` | `1440px` |

### Grid Alignment

```ts
Grid({
  columns: 3,
  gap: '24px',
  alignItems: 'center',
  justifyContent: 'center',
  children: gridItems,
})
```

### Grid Props

| Name | Type | Default | Description |
|---|---|---|---|
| `columns` | `number \| ResponsiveColumns` | `12` | Number of columns, or responsive object |
| `gap` | `string` | `'16px'` | CSS gap between grid cells |
| `alignItems` | `string` | -- | CSS `align-items` value |
| `justifyContent` | `string` | -- | CSS `justify-content` value |
| `children` | `AkashNode` | -- | GridItem elements |

### GridItem Props

| Name | Type | Default | Description |
|---|---|---|---|
| `span` | `number` | `1` | Number of columns this item spans |
| `children` | `AkashNode` | -- | Item content |

### ResponsiveColumns

| Name | Type | Description |
|---|---|---|
| `xs` | `number` | Columns at 0px+ |
| `sm` | `number` | Columns at 600px+ |
| `md` | `number` | Columns at 905px+ |
| `lg` | `number` | Columns at 1240px+ |
| `xl` | `number` | Columns at 1440px+ |

---

## Stack

A flexbox wrapper for row or column layouts.

### Import

```ts
import { Stack } from '@akashjs/ui';
```

### Vertical Stack (default)

```ts
Stack({
  direction: 'column',
  gap: '16px',
  children: [heading, body, footer],
})
```

### Horizontal Stack

```ts
Stack({
  direction: 'row',
  gap: '8px',
  align: 'center',
  children: [avatar, nameLabel, badge],
})
```

### Wrap

```ts
Stack({
  direction: 'row',
  gap: '8px',
  wrap: true,
  children: chipElements,
})
```

### Full Example

```ts
Stack({
  direction: 'row',
  gap: '16px',
  align: 'center',
  justify: 'space-between',
  wrap: true,
  children: [leftContent, rightContent],
})
```

### Stack Props

| Name | Type | Default | Description |
|---|---|---|---|
| `direction` | `'row' \| 'column'` | `'column'` | Flex direction |
| `gap` | `string` | `'0'` | CSS gap between children |
| `align` | `string` | -- | CSS `align-items` value |
| `justify` | `string` | -- | CSS `justify-content` value |
| `wrap` | `boolean` | `false` | Enable flex wrapping |
| `children` | `AkashNode` | -- | Child elements |

---

## Breadcrumb

A navigation breadcrumb trail with separators and ARIA support.

### Import

```ts
import { Breadcrumb } from '@akashjs/ui';
```

### Basic Usage

```ts
Breadcrumb({
  items: [
    { label: 'Home', href: '/' },
    { label: 'Products', href: '/products' },
    { label: 'Widget Pro' },
  ],
})
```

Items with an `href` render as links (except the last item). The last item always renders as a `<span>` with `aria-current="page"`.

### Without Links

Items without `href` render as plain text.

```ts
Breadcrumb({
  items: [
    { label: 'Dashboard' },
    { label: 'Settings' },
    { label: 'Profile' },
  ],
})
```

### Separator

Items are separated by a `/` character (rendered as a `<span>` with `aria-hidden="true"`).

### Accessibility

- The component renders inside a `<nav aria-label="Breadcrumb">`
- Items are in an `<ol>` for semantic structure
- The last item has `aria-current="page"`
- Separators are hidden from screen readers

### Breadcrumb Props

| Name | Type | Default | Description |
|---|---|---|---|
| `items` | `BreadcrumbItem[]` | `[]` | Array of breadcrumb entries |

### BreadcrumbItem

| Name | Type | Description |
|---|---|---|
| `label` | `string` | Display text |
| `href` | `string` | Optional link URL (not used on the last item) |
