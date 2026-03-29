# List

A Material Design 3 vertical list with leading/trailing slots, headline, supporting text, and interactive items with ripple effects.

## Import

```ts
import { List, ListItem } from '@akashjs/ui';
```

## Basic Usage

```ts
List({
  children: [
    ListItem({ headline: 'Item One' }),
    ListItem({ headline: 'Item Two' }),
    ListItem({ headline: 'Item Three' }),
  ],
})
```

## Dense List

The `dense` prop reduces vertical padding.

```ts
List({
  dense: true,
  children: [
    ListItem({ headline: 'Compact Item One' }),
    ListItem({ headline: 'Compact Item Two' }),
  ],
})
```

## List Items with Supporting Text

Add a secondary line with the `supporting` prop. Items with supporting text have a taller minimum height (72px vs 56px).

```ts
List({
  children: [
    ListItem({
      headline: 'Photos',
      supporting: 'Jan 9, 2024',
    }),
    ListItem({
      headline: 'Documents',
      supporting: '124 files',
    }),
  ],
})
```

## Leading and Trailing Slots

Pass any DOM node to the `leading` or `trailing` props.

```ts
const icon = document.createElement('span');
icon.textContent = 'F';

const badge = document.createElement('span');
badge.textContent = '3';

ListItem({
  leading: icon,
  headline: 'Inbox',
  supporting: '3 new messages',
  trailing: badge,
})
```

## Clickable Items

Add an `onClick` handler to make items interactive. Clickable items gain hover highlighting and a ripple effect.

```ts
List({
  children: [
    ListItem({
      headline: 'Settings',
      onClick: () => navigate('/settings'),
    }),
    ListItem({
      headline: 'Profile',
      onClick: () => navigate('/profile'),
    }),
  ],
})
```

## Disabled Items

Disabled items render at 38% opacity with no interactions.

```ts
ListItem({
  headline: 'Unavailable',
  disabled: true,
})
```

## Props

### List

| Name | Type | Default | Description |
|---|---|---|---|
| `dense` | `boolean` | `false` | Reduces padding for a more compact list |
| `children` | `AkashNode` | -- | ListItem elements |

### ListItem

| Name | Type | Default | Description |
|---|---|---|---|
| `headline` | `string` | **(required)** | Primary text |
| `supporting` | `string` | -- | Secondary text below the headline |
| `leading` | `AkashNode` | -- | Content placed before the headline (icon, avatar, etc.) |
| `trailing` | `AkashNode` | -- | Content placed after the headline (badge, icon, etc.) |
| `onClick` | `(e: MouseEvent) => void` | -- | Click handler (enables hover and ripple) |
| `disabled` | `boolean` | `false` | Disables hover, click, and ripple |
