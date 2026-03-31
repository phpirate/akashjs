# Drawer

A Material Design 3 side navigation drawer. Supports standard (inline) and modal (overlay) variants, left or right positioning, and animated open/close transitions.

The `open` prop is fully reactive — the drawer slides in/out and the modal scrim fades when the signal changes. The scrim click handler is deferred to prevent closing on the same click that opened the drawer.

## Import

```ts
import { Drawer } from '@akashjs/ui';
```

## Standard Variant

The standard drawer sits inline in the layout with a subtle border separating it from the content.

```ts
Drawer({
  variant: 'standard',
  open: true,
  side: 'left',
  children: navContent,
})
```

## Modal Variant

The modal drawer overlays the page with a fixed position and a scrim (semi-transparent backdrop).

```ts
Drawer({
  variant: 'modal',
  open: true,
  side: 'left',
  onClose: () => console.log('Drawer closed'),
  children: navContent,
})
```

Clicking the scrim calls `onClose` to allow you to close the drawer.

## Left vs Right

```ts
// Left side (default)
Drawer({ side: 'left', open: true, children: content })

// Right side
Drawer({ side: 'right', open: true, children: content })
```

## Open / Close Animation

The drawer uses a CSS `transform: translateX()` transition over 300ms. When closed, a left drawer translates to `-100%` and a right drawer to `100%`. When open, it translates to `0`. The modal scrim fades between `opacity: 0` and `opacity: 0.32`.

## Scrim Overlay

In modal mode, a scrim overlay covers the entire viewport behind the drawer:
- Background: `--md-sys-color-scrim` at 32% opacity when open
- Clicking the scrim triggers `onClose`
- The scrim has `z-index: 1199`, and the drawer has `z-index: 1200`

## Closed State

When `open` is `false`, the drawer slides off-screen but remains in the DOM. The scrim becomes invisible and non-interactive (`pointer-events: none`).

```ts
import { signal } from '@akashjs/runtime';

const isOpen = signal(false);

// Toggle drawer
Drawer({
  variant: 'modal',
  open: isOpen(),
  onClose: () => isOpen.set(false),
  children: menuItems,
})

// Open it
isOpen.set(true);
```

## Props

| Name | Type | Default | Description |
|---|---|---|---|
| `open` | `boolean` | `false` | Whether the drawer is visible |
| `side` | `'left' \| 'right'` | `'left'` | Which side of the viewport the drawer appears on |
| `variant` | `'standard' \| 'modal'` | `'standard'` | Standard (inline) or modal (overlay with scrim) |
| `onClose` | `() => void` | -- | Called when the scrim is clicked (modal only) |
| `children` | `AkashNode` | -- | Drawer content |
