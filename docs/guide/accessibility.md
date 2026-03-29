# Accessibility

Most frameworks treat accessibility as an afterthought — a third-party library or a checklist you handle yourself. AkashJS ships accessibility primitives as first-class composables. Focus traps, screen reader announcements, and keyboard shortcuts are built in and reactive.

## useFocusTrap()

`useFocusTrap()` constrains keyboard focus within a container element. Essential for modals, dialogs, drawers, and any overlay that should not allow focus to escape.

### Basic Usage

```ts
import { useFocusTrap } from '@akashjs/runtime';

const trap = useFocusTrap();
```

```html
<template>
  <div ref={trap.ref}>
    <h2>Confirm Delete</h2>
    <p>This action cannot be undone.</p>
    <button onClick={onCancel}>Cancel</button>
    <button onClick={onConfirm}>Delete</button>
  </div>
</template>
```

### Activate and Deactivate

```ts
trap.activate();    // start trapping focus
trap.deactivate();  // release focus

trap.active();      // boolean signal — is the trap active?
```

Typically, activate when a modal opens and deactivate when it closes:

```ts
effect(() => {
  if (modalOpen()) {
    trap.activate();
  } else {
    trap.deactivate();
  }
});
```

### Options

```ts
const trap = useFocusTrap({
  initialFocus: '#confirm-button',        // CSS selector or element to focus on activate
  returnFocus: true,                       // return focus to previously focused element on deactivate
  escapeDeactivates: true,                 // pressing Escape deactivates the trap
  allowOutsideClick: false,                // whether clicks outside the trap are allowed
});
```

| Option | Type | Default | Description |
|---|---|---|---|
| `initialFocus` | `string \| HTMLElement \| false` | first focusable | Element to focus when trap activates |
| `returnFocus` | `boolean` | `true` | Restore focus to the trigger element on deactivate |
| `escapeDeactivates` | `boolean` | `true` | Escape key deactivates the trap |
| `allowOutsideClick` | `boolean` | `false` | Allow mouse clicks outside the trapped container |

### Modal Example

```html
<script lang="ts">
import { useFocusTrap } from '@akashjs/runtime';
import { signal } from '@akashjs/runtime';

const open = signal(false);
const trap = useFocusTrap({ escapeDeactivates: true, returnFocus: true });

effect(() => {
  open() ? trap.activate() : trap.deactivate();
});
</script>

<template>
  <button onClick={() => open.set(true)}>Open Modal</button>

  <Show when={open()}>
    <Portal>
      <div class="overlay">
        <div class="modal" ref={trap.ref}>
          <h2>Settings</h2>
          <input placeholder="Name" />
          <button onClick={() => open.set(false)}>Close</button>
        </div>
      </div>
    </Portal>
  </Show>
</template>
```

## useAnnounce()

`useAnnounce()` sends messages to screen readers via a live region. Use it for dynamic content updates that sighted users can see but screen reader users would otherwise miss.

### Basic Usage

```ts
import { useAnnounce } from '@akashjs/runtime';

const announce = useAnnounce();

// Polite announcement (waits for the user to finish current task)
announce('Item added to cart');

// Assertive announcement (interrupts immediately)
announce('Session expired. Please log in again.', 'assertive');
```

### Polite vs Assertive

| Mode | When to Use |
|---|---|
| `'polite'` (default) | Non-urgent updates: "Saved", "3 results found", "Item removed" |
| `'assertive'` | Urgent updates: errors, session expiry, time-sensitive alerts |

### Automatic Route Announcements

When used with `@akashjs/router`, page title changes are announced automatically on navigation. No extra setup is needed — the router calls `announce()` with the new page title after each navigation completes.

To customize the announcement:

```ts
import { createRouter } from '@akashjs/router';

const router = createRouter({
  routes,
  announceRouteChanges: true,                        // enabled by default
  formatRouteAnnouncement: (title) => `Navigated to ${title}`,
});
```

## useKeyboard()

`useKeyboard()` provides declarative keyboard shortcut binding with cross-platform modifier key handling and scoped contexts.

### Basic Usage

```ts
import { useKeyboard } from '@akashjs/runtime';

const keyboard = useKeyboard();

keyboard.bind('mod+s', (e) => {
  e.preventDefault();
  save();
});

keyboard.bind('mod+k', () => {
  openCommandPalette();
});

keyboard.bind('Escape', () => {
  closePanel();
});
```

`mod` maps to `Ctrl` on Windows/Linux and `Cmd` on macOS, so `mod+s` works everywhere.

### Shortcut Syntax

Shortcuts are written as `modifier+key` combinations separated by `+`:

| Modifier | Description |
|---|---|
| `mod` | `Ctrl` (Windows/Linux) or `Cmd` (macOS) |
| `ctrl` | Always `Ctrl` |
| `alt` | `Alt` / `Option` |
| `shift` | `Shift` |

Examples: `mod+s`, `mod+shift+p`, `alt+1`, `ctrl+Enter`, `Escape`

### Scopes

Scopes let you activate different shortcut sets depending on context. Only the active scope receives events.

```ts
const keyboard = useKeyboard();

// Global shortcuts (always active)
keyboard.bind('mod+k', openCommandPalette);

// Editor shortcuts (only active when editing)
keyboard.bind('mod+b', toggleBold, { scope: 'editor' });
keyboard.bind('mod+i', toggleItalic, { scope: 'editor' });

// Table shortcuts (only active when viewing table)
keyboard.bind('Delete', deleteRow, { scope: 'table' });
keyboard.bind('Enter', editCell, { scope: 'table' });

// Activate a scope:
keyboard.setScope('editor');

// Deactivate (return to global only):
keyboard.setScope(null);
```

### Building a Help Dialog

`getBindings()` returns all registered shortcuts, useful for rendering a keyboard shortcut help dialog:

```ts
const bindings = keyboard.getBindings();
// [
//   { shortcut: 'mod+k', description: 'Open command palette', scope: 'global' },
//   { shortcut: 'mod+b', description: 'Bold', scope: 'editor' },
//   ...
// ]
```

Provide descriptions when binding:

```ts
keyboard.bind('mod+s', save, { description: 'Save document', scope: 'editor' });
```

Then render the help dialog:

```html
<template>
  <Show when={showHelp()}>
    <div class="shortcut-help">
      <h2>Keyboard Shortcuts</h2>
      <For each={keyboard.getBindings()}>
        {(binding) => (
          <div class="shortcut-row">
            <kbd>{binding.shortcut}</kbd>
            <span>{binding.description}</span>
          </div>
        )}
      </For>
    </div>
  </Show>
</template>
```

### Cleanup

```ts
keyboard.dispose();  // remove all listeners
```

Shortcuts are automatically cleaned up when the component unmounts.
