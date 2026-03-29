# Dialog & Snackbar

Modal dialogs for confirmations and focused tasks. Snackbars for brief, non-blocking feedback messages.

## Dialog

### Import

```ts
import { Dialog } from '@akashjs/ui';
```

### Basic Usage

```ts
Dialog({
  open: true,
  title: 'Confirm Action',
  onClose: () => console.log('closed'),
  children: 'Are you sure you want to proceed?',
})
```

### Open / Close

Control the dialog with the `open` prop. When `open` is `false`, the dialog and scrim fade out and become non-interactive.

```ts
import { signal } from '@akashjs/runtime';

const showDialog = signal(false);

// Render dialog
Dialog({
  open: showDialog(),
  title: 'Delete Item',
  onClose: () => showDialog.set(false),
  children: 'This action cannot be undone.',
})

// Open it
showDialog.set(true);
```

### Scrim Overlay

The dialog renders a scrim (semi-transparent black overlay) behind it:
- Scrim: `z-index: 2000`, 32% opacity when open
- Dialog surface: `z-index: 2001`
- Clicking the scrim calls `onClose`

### Escape to Close

When the dialog is open, pressing the `Escape` key triggers `onClose`. The dialog also auto-focuses when opened.

### Transition Animation

The dialog uses a combined opacity + scale animation:
- **Open:** `opacity: 0 -> 1`, `scale(0.9) -> scale(1)` over 200ms
- **Close:** The reverse transition

### Actions Slot

Pass action buttons as part of the children content.

```ts
const actions = document.createElement('div');
actions.style.cssText = 'display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;';

actions.appendChild(Button({
  variant: 'text',
  children: 'Cancel',
  onClick: () => showDialog.set(false),
}));

actions.appendChild(Button({
  variant: 'filled',
  children: 'Confirm',
  onClick: () => {
    performAction();
    showDialog.set(false);
  },
}));

Dialog({
  open: true,
  title: 'Confirm',
  onClose: () => showDialog.set(false),
  children: [
    document.createTextNode('Proceed with the action?'),
    actions,
  ],
})
```

### Dialog Props

| Name | Type | Default | Description |
|---|---|---|---|
| `open` | `boolean` | `false` | Whether the dialog is visible |
| `title` | `string` | -- | Dialog title (sets `aria-labelledby`) |
| `onClose` | `() => void` | -- | Called when scrim is clicked or Escape is pressed |
| `children` | `AkashNode` | -- | Dialog body content |

---

## Snackbar

### Import

```ts
import { Snackbar } from '@akashjs/ui';
```

### Basic Usage

```ts
Snackbar({
  message: 'Item saved successfully',
  onDismiss: () => removeSnackbar(),
})
```

### With Action Button

```ts
Snackbar({
  message: 'Email archived',
  action: {
    label: 'Undo',
    onClick: () => undoArchive(),
  },
  onDismiss: () => removeSnackbar(),
})
```

### Auto-Dismiss Duration

By default, the snackbar auto-dismisses after 4000ms. Customize with the `duration` prop.

```ts
Snackbar({
  message: 'Quick notice',
  duration: 2000, // 2 seconds
  onDismiss: () => removeSnackbar(),
})
```

Set `duration` to `0` to disable auto-dismiss (user must click the close button).

### Animation

The snackbar slides up with a fade-in animation from `translateY(16px)` to `translateY(0)` over 200ms.

### Positioning

Snackbars are fixed at the bottom center of the viewport (`bottom: 24px; left: 50%; z-index: 3000`).

### Snackbar Props

| Name | Type | Default | Description |
|---|---|---|---|
| `message` | `string` | **(required)** | The message text |
| `action` | `SnackbarAction` | -- | Action button configuration |
| `duration` | `number` | `4000` | Auto-dismiss duration in ms (0 to disable) |
| `onDismiss` | `() => void` | -- | Called when dismissed (auto or manual) |

### SnackbarAction

| Name | Type | Description |
|---|---|---|
| `label` | `string` | Action button text |
| `onClick` | `() => void` | Action button handler |
