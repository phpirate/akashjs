# Tabs

A Material Design 3 horizontal tab navigation with animated active indicator. Supports primary and secondary variants.

## Import

```ts
import { Tabs } from '@akashjs/ui';
```

## Basic Usage

```ts
Tabs({
  items: [
    { label: 'Overview', value: 'overview' },
    { label: 'Features', value: 'features' },
    { label: 'Pricing', value: 'pricing' },
  ],
  activeValue: 'overview',
  onChange: (value) => console.log('Tab:', value),
})
```

## Primary Variant (default)

The primary variant shows a narrower active indicator (centered at 50% width, 3px tall) and colors the active tab label with the primary color.

```ts
Tabs({
  variant: 'primary',
  items: [
    { label: 'Tab 1', value: 'tab1' },
    { label: 'Tab 2', value: 'tab2' },
  ],
  activeValue: 'tab1',
  onChange: (value) => console.log(value),
})
```

## Secondary Variant

The secondary variant shows a full-width active indicator (2px tall) and colors the active tab label with the on-surface color.

```ts
Tabs({
  variant: 'secondary',
  items: [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Archived', value: 'archived' },
  ],
  activeValue: 'all',
  onChange: (value) => console.log(value),
})
```

## Animated Indicator

The active tab's indicator animates in using a `scaleX(0)` to `scaleX(1)` CSS animation over 200ms with the standard easing curve. The indicator is rendered as a `<span>` at the bottom of the active tab button.

## Reactive Tab Switching

```ts
import { signal } from '@akashjs/runtime';

const activeTab = signal('overview');

Tabs({
  items: [
    { label: 'Overview', value: 'overview' },
    { label: 'Details', value: 'details' },
    { label: 'Reviews', value: 'reviews' },
  ],
  activeValue: activeTab(),
  onChange: (value) => activeTab.set(value),
})
```

## Props

| Name | Type | Default | Description |
|---|---|---|---|
| `items` | `TabItem[]` | `[]` | Array of tab definitions |
| `activeValue` | `string` | -- | The `value` of the currently active tab |
| `onChange` | `(value: string) => void` | -- | Called when a tab is clicked |
| `variant` | `'primary' \| 'secondary'` | `'primary'` | Visual style variant |

### TabItem

| Name | Type | Description |
|---|---|---|
| `label` | `string` | Display text for the tab |
| `value` | `string` | Unique identifier for the tab |
