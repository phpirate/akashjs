# Menu

A floating overlay panel anchored to a trigger element. Supports menu items with icons, keyboard shortcuts, dividers, and auto-closes on selection or outside click.

## Basic Usage

```ts
import { Menu, MenuItem, MenuDivider } from '@akashjs/ui';
import { signal, ref } from '@akashjs/runtime';

const isOpen = signal(false);
const buttonRef = ref<HTMLElement>();
```

```html
<template>
  <button ref={buttonRef} onClick={() => isOpen.set(true)}>Actions</button>
  <Menu open={isOpen()} anchorEl={buttonRef.current} onClose={() => isOpen.set(false)}>
    <MenuItem label="Edit" icon="edit" onClick={handleEdit} />
    <MenuItem label="Duplicate" icon="content_copy" onClick={handleDuplicate} />
    <MenuDivider />
    <MenuItem label="Delete" icon="delete" onClick={handleDelete} />
    <MenuItem label="Settings" icon="settings" disabled />
  </Menu>
</template>
```

## Menu Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `open` | `boolean` | `false` | Whether the menu is visible |
| `anchorEl` | `HTMLElement` | — | Element to anchor the menu to |
| `onClose` | `() => void` | — | Called when menu should close |
| `position` | `'bottom-start' \| 'bottom-end' \| 'top-start' \| 'top-end'` | `'bottom-start'` | Menu position relative to anchor |
| `width` | `string` | `'112px'` | Minimum width |
| `children` | `() => Node` | — | Menu content (MenuItems) |

The `open` prop is reactive. The menu panel is rendered into `document.body` with `position: fixed` to avoid clipping by `overflow: hidden` ancestors. The outside-click handler is deferred so clicking the trigger doesn't immediately close the menu.

## MenuItem Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | — | Menu item text |
| `icon` | `string` | — | Material Symbols icon name |
| `onClick` | `() => void` | — | Click handler |
| `disabled` | `boolean` | `false` | Disable the item |
| `shortcut` | `string` | — | Keyboard shortcut text (display only) |

## Keyboard Navigation

- **Escape** — closes the menu
- Click outside — closes the menu
- Click on item — triggers `onClick` and closes

## Context Menu

```html
<template>
  <div onContextMenu={(e) => { e.preventDefault(); pos.set({x: e.clientX, y: e.clientY}); isOpen.set(true); }}>
    Right-click me
  </div>
  <Menu open={isOpen()} anchorEl={null} onClose={() => isOpen.set(false)}>
    <MenuItem label="Cut" shortcut="Ctrl+X" />
    <MenuItem label="Copy" shortcut="Ctrl+C" />
    <MenuItem label="Paste" shortcut="Ctrl+V" />
  </Menu>
</template>
```
