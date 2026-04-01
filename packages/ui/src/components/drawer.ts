/**
 * Material Design 3 Drawer component.
 *
 * Side navigation drawer with standard and modal variants.
 */

import { defineComponent, effect } from '@akashjs/runtime';
import type { AkashNode } from '@akashjs/runtime';

export interface DrawerProps {
  open?: boolean;
  side?: 'left' | 'right';
  variant?: 'standard' | 'modal';
  onClose?: () => void;
}

/** Unwrap a prop that may be a __getter function or a plain value */
function readProp<T>(val: T | (() => T)): T {
  return typeof val === 'function' ? (val as () => T)() : val as T;
}

export const Drawer = defineComponent<DrawerProps>((ctx) => {
  const side = ctx.props.side ?? 'left';
  const variant = ctx.props.variant ?? 'standard';
  const onClose = ctx.props.onClose;

  return () => {
    const container = document.createDocumentFragment();
    const isModal = variant === 'modal';
    const isLeft = side === 'left';
    const translateHidden = isLeft ? 'translateX(-100%)' : 'translateX(100%)';

    // --- Scrim overlay for modal ---
    let scrim: HTMLDivElement | null = null;
    if (isModal) {
      scrim = document.createElement('div');
      scrim.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 1199;
        background-color: var(--md-sys-color-scrim, #000000);
        opacity: 0;
        pointer-events: none;
        transition: opacity 300ms cubic-bezier(0.2, 0, 0, 1);
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
      container.appendChild(scrim);
    }

    // --- Aside drawer ---
    const aside = document.createElement('aside');
    aside.setAttribute('role', 'navigation');
    aside.style.cssText = `
      position: ${isModal ? 'fixed' : 'relative'};
      top: 0;
      ${isLeft ? 'left: 0;' : 'right: 0;'}
      bottom: 0;
      z-index: ${isModal ? '1200' : '0'};
      width: 360px;
      max-width: 80vw;
      background-color: var(--md-sys-color-surface, #fffbfe);
      color: var(--md-sys-color-on-surface, #1c1b1f);
      box-shadow: none;
      transform: ${translateHidden};
      transition: transform 300ms cubic-bezier(0.2, 0, 0, 1), box-shadow 300ms;
      overflow-y: auto;
      box-sizing: border-box;
      padding: 12px;
      font-family: inherit;
    `;

    if (!isModal) {
      aside.style.borderRight = isLeft
        ? '1px solid var(--md-sys-color-outline-variant, #cac4d0)'
        : 'none';
      aside.style.borderLeft = !isLeft
        ? '1px solid var(--md-sys-color-outline-variant, #cac4d0)'
        : 'none';
    }

    // --- Reactively toggle open/closed ---
    effect(() => {
      const isOpen = !!readProp(ctx.props.open);
      aside.style.transform = isOpen ? 'translateX(0)' : translateHidden;
      if (isModal) {
        aside.style.boxShadow = isOpen
          ? '0 8px 12px 6px rgba(0,0,0,0.15), 0 4px 4px 0 rgba(0,0,0,0.3)'
          : 'none';
        if (scrim) {
          scrim.style.opacity = isOpen ? '0.32' : '0';
          scrim.style.pointerEvents = isOpen ? 'auto' : 'none';
        }
      }
    }, { render: true });

    // --- Children ---
    const children = ctx.children();
    if (children != null) {
      if (children instanceof Node) {
        aside.appendChild(children);
      } else if (Array.isArray(children)) {
        for (const child of children) {
          if (child instanceof Node) aside.appendChild(child);
          else if (child != null) aside.appendChild(document.createTextNode(String(child)));
        }
      } else {
        aside.appendChild(document.createTextNode(String(children)));
      }
    }

    container.appendChild(aside);
    return container;
  };
});
