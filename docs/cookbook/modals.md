# Modal System

## Problem

You need accessible modals that render via portals, trap focus, close on Escape and backdrop click, support stacking, and animate in and out.

## Solution

Combine `Portal` for DOM placement, `useFocusTrap` for accessibility, and signals for open/close state.

### 1. Base Modal Component

```ts
// src/components/Modal.ts
import { signal, effect } from '@akashjs/runtime';
import { Portal } from '@akashjs/runtime';
import { useFocusTrap } from '@akashjs/runtime';

let modalStack: string[] = [];
let nextId = 0;

export function createModal(options: { id?: string } = {}) {
  const id = options.id ?? `modal-${++nextId}`;
  const isOpen = signal(false);
  let dialogRef: HTMLElement | null = null;

  const trap = useFocusTrap(() => dialogRef, {
    returnFocus: true,
    escapeDeactivates: true,
    onDeactivate: () => close(),
  });

  function open() {
    isOpen.set(true);
    modalStack.push(id);
    requestAnimationFrame(() => trap.activate());
    document.body.style.overflow = 'hidden';
  }

  function close() {
    isOpen.set(false);
    trap.deactivate();
    modalStack = modalStack.filter((m) => m !== id);
    if (modalStack.length === 0) {
      document.body.style.overflow = '';
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) close();
  }

  function setRef(el: HTMLElement) {
    dialogRef = el;
  }

  return { isOpen, open, close, handleBackdropClick, setRef, id };
}
```

### 2. Modal Template

```html
<!-- Usage in a page -->
<Portal target="body">
  <div :if={modal.isOpen()}
       class="modal-backdrop"
       @click={modal.handleBackdropClick}
       role="presentation">
    <div :ref={modal.setRef}
         class="modal-dialog"
         role="dialog"
         aria-modal="true"
         aria-labelledby="{modal.id}-title">

      <header class="modal-header">
        <h2 id="{modal.id}-title">Modal Title</h2>
        <button @click={modal.close} aria-label="Close" class="modal-close">
          &times;
        </button>
      </header>

      <div class="modal-body">
        <!-- Content goes here -->
      </div>

      <footer class="modal-actions">
        <button @click={modal.close}>Cancel</button>
        <button @click={handleConfirm} class="btn-primary">Confirm</button>
      </footer>
    </div>
  </div>
</Portal>
```

::: tip
Always set `aria-modal="true"` and `aria-labelledby` pointing to the title. Screen readers need these to announce the modal correctly.
:::

### 3. Confirmation Dialog

```ts
// src/components/ConfirmDialog.ts
import { signal } from '@akashjs/runtime';
import { createModal } from './Modal';

export function useConfirmDialog() {
  const modal = createModal();
  const message = signal('Are you sure?');
  let resolver: ((confirmed: boolean) => void) | null = null;

  async function confirm(msg: string): Promise<boolean> {
    message.set(msg);
    modal.open();
    return new Promise((resolve) => {
      resolver = resolve;
    });
  }

  function handleYes() {
    resolver?.(true);
    modal.close();
  }

  function handleNo() {
    resolver?.(false);
    modal.close();
  }

  return { modal, message, confirm, handleYes, handleNo };
}

// Usage:
// const dialog = useConfirmDialog();
// if (await dialog.confirm('Delete this item?')) { deleteItem(); }
```

### 4. Form Modal

```ts
// src/components/FormModal.ts
import { defineForm, required, email } from '@akashjs/forms';
import { createModal } from './Modal';

const modal = createModal();

const form = defineForm({
  name: { initial: '', validators: [required()] },
  email: { initial: '', validators: [required(), email()] },
});

async function handleSubmit(values) {
  await saveContact(values);
  form.reset();
  modal.close();
}

// Reset form when modal opens
function openFormModal() {
  form.reset();
  modal.open();
}
```

::: warning
Always reset the form when opening a form modal. Stale validation errors from a previous session confuse users.
:::

### 5. Animated Enter/Exit

```css
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fade-in 0.2s ease-out;
}

.modal-dialog {
  background: var(--color-surface, #fff);
  border-radius: 16px;
  padding: 0;
  max-width: 480px;
  width: 90vw;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 24px 48px var(--color-shadow, rgba(0,0,0,0.2));
  animation: slide-up 0.25s ease-out;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--color-border, #e0e0e0);
}

.modal-body { padding: 1.5rem; }

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--color-border, #e0e0e0);
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
}

@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes slide-up {
  from { opacity: 0; transform: translateY(16px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
```

### 6. Stacked Modals

```ts
// Each createModal() call gets its own z-index
// The stack tracks order, and backdrop clicks only close the topmost modal
function handleBackdropClick(e: MouseEvent) {
  if (e.target !== e.currentTarget) return;
  const topModal = modalStack[modalStack.length - 1];
  if (topModal === id) close();
}
```

::: info
Each stacked modal gets a progressively higher z-index. Only the topmost modal responds to Escape and backdrop clicks, preventing accidental dismissal of modals underneath.
:::

## Result

A modal system with portal rendering, focus trapping, keyboard dismissal, backdrop click handling, stacking support, and smooth CSS animations. Includes ready-made confirmation dialog and form modal patterns.
