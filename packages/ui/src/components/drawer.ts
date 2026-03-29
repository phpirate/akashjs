/**
 * Material Design 3 Drawer component.
 *
 * Side navigation drawer with standard and modal variants.
 */

import { defineComponent } from '@akashjs/runtime';
import type { AkashNode } from '@akashjs/runtime';

export interface DrawerProps {
  open?: boolean;
  side?: 'left' | 'right';
  variant?: 'standard' | 'modal';
  onClose?: () => void;
}

export const Drawer = defineComponent<DrawerProps>((ctx) => {
  const {
    open = false,
    side = 'left',
    variant = 'standard',
    onClose,
  } = ctx.props;

  return () => {
    const container = document.createDocumentFragment();
    const isModal = variant === 'modal';

    // --- Scrim overlay for modal ---
    if (isModal) {
      const scrim = document.createElement('div');
      scrim.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 1199;
        background-color: var(--md-sys-color-scrim, #000000);
        opacity: ${open ? '0.32' : '0'};
        pointer-events: ${open ? 'auto' : 'none'};
        transition: opacity 300ms cubic-bezier(0.2, 0, 0, 1);
      `;
      if (onClose) {
        scrim.addEventListener('click', onClose);
      }
      container.appendChild(scrim);
    }

    // --- Aside drawer ---
    const aside = document.createElement('aside');
    aside.setAttribute('role', 'navigation');

    const isLeft = side === 'left';
    const translateHidden = isLeft ? 'translateX(-100%)' : 'translateX(100%)';
    const translateVisible = 'translateX(0)';

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
      box-shadow: ${isModal && open ? '0 8px 12px 6px rgba(0,0,0,0.15), 0 4px 4px 0 rgba(0,0,0,0.3)' : 'none'};
      transform: ${open ? translateVisible : translateHidden};
      transition: transform 300ms cubic-bezier(0.2, 0, 0, 1);
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
