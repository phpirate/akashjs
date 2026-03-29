# Keyboard Shortcuts

## Problem

You need keyboard shortcuts with modifier keys, scoped contexts (modal shortcuts vs page shortcuts), a help dialog, and vim-style navigation.

## Solution

Use `useKeyboard` from `@akashjs/runtime` for shortcut registration with scope management.

### 1. Global Shortcuts Setup

```ts
// src/shortcuts.ts
import { useKeyboard } from '@akashjs/runtime';
import { signal } from '@akashjs/runtime';

export const kb = useKeyboard();

// Search palette (Cmd+K / Ctrl+K)
const searchOpen = signal(false);

kb.bind('mod+k', () => searchOpen.set(true), {
  description: 'Open search',
});

// Save (Cmd+S)
kb.bind('mod+s', () => {
  document.querySelector('form')?.requestSubmit();
}, { description: 'Save current form' });

// Close anything (Escape)
kb.bind('Escape', () => {
  if (searchOpen()) { searchOpen.set(false); return; }
  // Close modals, panels, etc.
}, { description: 'Close current panel' });

// Navigation
kb.bind('mod+shift+p', () => openCommandPalette(), {
  description: 'Command palette',
});
```

### 2. Scoped Shortcuts for Modals

```ts
// When a modal opens, enable its scope
function openModal() {
  modal.open();
  kb.enableScope('modal');
}

function closeModal() {
  modal.close();
  kb.disableScope('modal');
}

// These only work when the modal is open
kb.bind('mod+Enter', () => submitModalForm(), {
  scope: 'modal',
  description: 'Submit modal form',
});

kb.bind('Escape', () => closeModal(), {
  scope: 'modal',
  description: 'Close modal',
});
```

::: tip
Scoped shortcuts take priority over global ones. When the modal scope is active, the modal's Escape binding fires instead of the global one. Disable the scope when the modal closes.
:::

### 3. Table/List Navigation

```ts
const selectedIndex = signal(0);
const items = signal<Item[]>([]);

kb.bind('ArrowDown', () => {
  selectedIndex.update((i) => Math.min(i + 1, items().length - 1));
  scrollSelectedIntoView();
}, { scope: 'list', description: 'Move down' });

kb.bind('ArrowUp', () => {
  selectedIndex.update((i) => Math.max(i - 1, 0));
  scrollSelectedIntoView();
}, { scope: 'list', description: 'Move up' });

kb.bind('Enter', () => {
  const item = items()[selectedIndex()];
  if (item) selectItem(item);
}, { scope: 'list', description: 'Select item' });

function scrollSelectedIntoView() {
  const el = document.querySelector(`[data-index="${selectedIndex()}"]`);
  el?.scrollIntoView({ block: 'nearest' });
}
```

### 4. Vim-Style Navigation

```ts
const vimMode = signal(false);

kb.bind('mod+shift+v', () => {
  vimMode.update((v) => !v);
  if (vimMode()) kb.enableScope('vim');
  else kb.disableScope('vim');
}, { description: 'Toggle vim mode' });

kb.bind('j', () => {
  selectedIndex.update((i) => Math.min(i + 1, items().length - 1));
}, { scope: 'vim', description: 'Move down (vim)' });

kb.bind('k', () => {
  selectedIndex.update((i) => Math.max(i - 1, 0));
}, { scope: 'vim', description: 'Move up (vim)' });

kb.bind('g', () => {
  selectedIndex.set(0);
}, { scope: 'vim', description: 'Go to top (vim)' });

kb.bind('shift+g', () => {
  selectedIndex.set(items().length - 1);
}, { scope: 'vim', description: 'Go to bottom (vim)' });

kb.bind('/', () => {
  searchOpen.set(true);
}, { scope: 'vim', description: 'Search (vim)' });
```

::: warning
Single-key shortcuts like `j`, `k`, `/` will conflict with text inputs. The vim scope should be disabled automatically when an `<input>` or `<textarea>` is focused.
:::

```ts
// Disable vim shortcuts in text fields
document.addEventListener('focusin', (e) => {
  const tag = (e.target as HTMLElement).tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) {
    kb.disableScope('vim');
  }
});

document.addEventListener('focusout', () => {
  if (vimMode()) kb.enableScope('vim');
});
```

### 5. Help Dialog (Show All Shortcuts)

```ts
const helpOpen = signal(false);

kb.bind('shift+/', () => helpOpen.set(true), {
  description: 'Show keyboard shortcuts',
});
```

```html
<Portal target="body">
  <div :if={helpOpen()} class="shortcut-help-overlay"
       @click|self={() => helpOpen.set(false)}>
    <div class="shortcut-help" role="dialog" aria-label="Keyboard shortcuts">
      <h2>Keyboard Shortcuts</h2>

      <div :for={binding of kb.getBindings()} :key={binding.key} class="shortcut-row">
        <kbd class="shortcut-key">{binding.key}</kbd>
        <span class="shortcut-desc">{binding.description}</span>
        <span :if={binding.scope} class="shortcut-scope">{binding.scope}</span>
      </div>

      <footer>
        <p class="muted">Press <kbd>?</kbd> to toggle this dialog</p>
      </footer>
    </div>
  </div>
</Portal>
```

### 6. Styles

```css
.shortcut-help-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.shortcut-help {
  background: var(--color-surface, #fff);
  border-radius: 16px;
  padding: 1.5rem 2rem;
  max-width: 500px;
  width: 90vw;
  max-height: 80vh;
  overflow-y: auto;
}

.shortcut-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-border, #eee);
}

kbd {
  display: inline-block;
  background: var(--color-bg, #f5f5f5);
  border: 1px solid var(--color-border, #ddd);
  border-radius: 4px;
  padding: 0.15rem 0.5rem;
  font-family: monospace;
  font-size: 0.85rem;
  min-width: 4rem;
  text-align: center;
}

.shortcut-desc {
  flex: 1;
}

.shortcut-scope {
  font-size: 0.75rem;
  background: var(--color-primary, #6750a4);
  color: white;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
}
```

### 7. Cleanup

```ts
// Dispose when your app or page unmounts
import { onUnmount } from '@akashjs/runtime';

onUnmount(() => {
  kb.dispose();
});
```

::: info
`kb.getBindings()` returns all registered shortcuts with their descriptions and scopes. Use this to auto-generate the help dialog so it never goes out of date.
:::

## Result

A keyboard shortcut system with global shortcuts (Cmd+K, Cmd+S), scoped shortcuts for modals and lists, vim-style navigation with input-awareness, and an auto-generated help dialog. Scopes ensure shortcuts only fire in the right context.
