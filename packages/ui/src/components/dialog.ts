/**
 * Material Design 3 Dialog component.
 *
 * Modal dialog with scrim overlay, title, content, and actions slots.
 */

import { defineComponent, effect } from '@akashjs/runtime';
import type { AkashNode } from '@akashjs/runtime';

export interface DialogProps {
  open?: boolean;
  title?: string;
  onClose?: () => void;
}

/** Unwrap a prop that may be a __getter function or a plain value */
function readProp<T>(val: T | (() => T)): T {
  return typeof val === 'function' && (val as any).__reactive ? (val as () => T)() : val as T;
}

export const Dialog = defineComponent<DialogProps>((ctx) => {
  const title = ctx.props.title;
  const onClose = ctx.props.onClose;

  return () => {
    const container = document.createDocumentFragment();

    // --- Scrim ---
    const scrim = document.createElement('div');
    scrim.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 2000;
      background-color: var(--md-sys-color-scrim, #000000);
      opacity: 0;
      pointer-events: none;
      transition: opacity 200ms cubic-bezier(0.2, 0, 0, 1);
    `;
    if (onClose) {
      let scrimClickActive = false;
      effect(() => {
        const isOpen = !!readProp(ctx.props.open);
        if (isOpen) {
          scrimClickActive = false;
          requestAnimationFrame(() => { scrimClickActive = true; });
        } else {
          scrimClickActive = false;
        }
      });
      scrim.addEventListener('click', () => {
        if (scrimClickActive) onClose();
      });
    }

    // --- Dialog surface ---
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    if (title) {
      dialog.setAttribute('aria-labelledby', 'akash-dialog-title');
    }

    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.9);
      z-index: 2001;
      min-width: 280px;
      max-width: 560px;
      width: calc(100% - 48px);
      border-radius: 28px;
      background-color: var(--md-sys-color-surface-container-high, #ece6f0);
      color: var(--md-sys-color-on-surface, #1c1b1f);
      box-shadow: 0 8px 12px 6px rgba(0,0,0,0.15), 0 4px 4px 0 rgba(0,0,0,0.3);
      padding: 24px;
      box-sizing: border-box;
      font-family: inherit;
      opacity: 0;
      pointer-events: none;
      transition: opacity 200ms cubic-bezier(0.2, 0, 0, 1),
                  transform 200ms cubic-bezier(0.2, 0, 0, 1);
    `;
    dialog.tabIndex = -1;
    dialog.style.outline = 'none';

    // --- Reactively toggle open/closed ---
    effect(() => {
      const isOpen = !!readProp(ctx.props.open);
      scrim.style.opacity = isOpen ? '0.32' : '0';
      scrim.style.pointerEvents = isOpen ? 'auto' : 'none';
      dialog.style.opacity = isOpen ? '1' : '0';
      dialog.style.pointerEvents = isOpen ? 'auto' : 'none';
      dialog.style.transform = `translate(-50%, -50%) ${isOpen ? 'scale(1)' : 'scale(0.9)'}`;
    }, { render: true });

    // --- Escape key ---
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && readProp(ctx.props.open) && onClose) {
        onClose();
      }
    });

    // --- Title ---
    if (title) {
      const titleEl = document.createElement('h2');
      titleEl.id = 'akash-dialog-title';
      titleEl.textContent = title;
      titleEl.style.cssText = `
        margin: 0 0 16px 0;
        font-size: 24px;
        line-height: 32px;
        font-weight: 400;
        color: var(--md-sys-color-on-surface, #1c1b1f);
      `;
      dialog.appendChild(titleEl);
    }

    // --- Content (children) ---
    const content = document.createElement('div');
    content.style.cssText = `
      font-size: 14px;
      line-height: 20px;
      letter-spacing: 0.25px;
      color: var(--md-sys-color-on-surface-variant, #49454f);
      margin-bottom: 24px;
    `;

    const children = ctx.children();
    if (children != null) {
      if (children instanceof Node) {
        content.appendChild(children);
      } else if (Array.isArray(children)) {
        for (const child of children) {
          if (child instanceof Node) content.appendChild(child);
          else if (child != null) content.appendChild(document.createTextNode(String(child)));
        }
      } else {
        content.appendChild(document.createTextNode(String(children)));
      }
    }
    dialog.appendChild(content);

    container.appendChild(scrim);
    container.appendChild(dialog);
    return container;
  };
});
