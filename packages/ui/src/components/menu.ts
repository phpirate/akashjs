/**
 * Material Design 3 Menu component.
 *
 * Floating overlay panel anchored to a trigger element.
 * Supports menu items with icons, keyboard navigation,
 * dividers, and auto-closes on selection or outside click.
 *
 * ```ts
 * Menu({
 *   open: isOpen(),
 *   anchorEl: buttonRef.current,
 *   onClose: () => isOpen.set(false),
 *   children: () => {
 *     const frag = document.createDocumentFragment();
 *     frag.appendChild(MenuItem({ label: 'Edit', icon: 'edit', onClick: handleEdit }));
 *     frag.appendChild(MenuItem({ label: 'Delete', icon: 'delete', onClick: handleDelete }));
 *     return frag;
 *   },
 * })
 * ```
 */

import { defineComponent, effect, signal } from '@akashjs/runtime';
import type { AkashNode } from '@akashjs/runtime';

export interface MenuProps {
  open?: boolean;
  anchorEl?: HTMLElement | null;
  onClose?: () => void;
  children?: () => AkashNode;
  position?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
  width?: string;
}

export interface MenuItemProps {
  label: string;
  icon?: string;
  onClick?: () => void;
  disabled?: boolean;
  shortcut?: string;
}

export interface MenuDividerProps {}

export const Menu = defineComponent<MenuProps>((ctx) => {
  return () => {
    const container = document.createElement('div');
    container.style.cssText = 'position: relative; display: inline-block;';

    const panel = document.createElement('div');
    panel.setAttribute('role', 'menu');
    panel.style.cssText = `
      position: fixed;
      z-index: 3000;
      min-width: ${ctx.props.width ?? '112px'};
      max-width: 280px;
      background: var(--md-sys-color-surface-container, #fff);
      color: var(--md-sys-color-on-surface, #1c1b1f);
      border-radius: 4px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.1);
      padding: 8px 0;
      opacity: 0;
      transform: scaleY(0.8);
      transform-origin: top left;
      transition: opacity 120ms, transform 120ms cubic-bezier(0, 0, 0.2, 1);
      pointer-events: none;
      overflow: auto;
      max-height: 50vh;
      font-family: var(--md-sys-typescale-body-large-font, system-ui);
      font-size: 14px;
    `;

    /** Unwrap a prop that may be a __getter function or a plain value */
    function readProp<T>(val: T | (() => T)): T {
      return typeof val === 'function' && (val as any).__reactive ? (val as () => T)() : val as T;
    }

    // Position and toggle visibility
    effect(() => {
      const open = readProp(ctx.props.open) ?? false;
      const anchor = readProp(ctx.props.anchorEl);
      if (open && anchor) {
        const rect = anchor.getBoundingClientRect();
        const pos = ctx.props.position ?? 'bottom-start';
        if (pos.startsWith('bottom')) {
          panel.style.top = `${rect.bottom + 4}px`;
        } else {
          panel.style.bottom = `${window.innerHeight - rect.top + 4}px`;
        }
        if (pos.endsWith('start')) {
          panel.style.left = `${rect.left}px`;
        } else {
          panel.style.right = `${window.innerWidth - rect.right}px`;
        }
        panel.style.opacity = '1';
        panel.style.transform = 'scaleY(1)';
        panel.style.pointerEvents = 'auto';
      } else {
        panel.style.opacity = '0';
        panel.style.transform = 'scaleY(0.8)';
        panel.style.pointerEvents = 'none';
      }
    }, { render: true });

    // Render children
    if (ctx.props.children) {
      const content = ctx.props.children();
      if (content instanceof Node) panel.appendChild(content);
    }

    // Close on outside click — deferred to avoid catching the opening click
    let outsideClickActive = false;
    effect(() => {
      const open = ctx.props.open ?? false;
      if (open) {
        outsideClickActive = false;
        requestAnimationFrame(() => { outsideClickActive = true; });
      } else {
        outsideClickActive = false;
      }
    });
    document.addEventListener('click', (e) => {
      if (!outsideClickActive) return;
      const anchor = ctx.props.anchorEl;
      const isInsidePanel = panel.contains(e.target as Node);
      const isOnAnchor = anchor ? anchor.contains(e.target as Node) : false;
      if (!isInsidePanel && !isOnAnchor) {
        ctx.props.onClose?.();
      }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && ctx.props.open) {
        ctx.props.onClose?.();
      }
    });
    document.addEventListener('keydown', onKeyDown);

    // Append panel to document.body to avoid overflow:hidden clipping
    if (typeof document !== 'undefined') {
      document.body.appendChild(panel);
    }
    return container;
  };
});

export const MenuItem = defineComponent<MenuItemProps>((ctx) => {
  return () => {
    const item = document.createElement('div');
    item.setAttribute('role', 'menuitem');
    item.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      cursor: ${ctx.props.disabled ? 'default' : 'pointer'};
      opacity: ${ctx.props.disabled ? '0.38' : '1'};
      user-select: none;
      transition: background 80ms;
    `;

    if (!ctx.props.disabled) {
      item.addEventListener('mouseenter', () => {
        item.style.background = 'var(--md-sys-color-surface-container-highest, #f0f0f0)';
      });
      item.addEventListener('mouseleave', () => {
        item.style.background = '';
      });
      if (ctx.props.onClick) {
        item.addEventListener('click', ctx.props.onClick);
      }
    }

    // Icon
    if (ctx.props.icon) {
      const icon = document.createElement('span');
      icon.className = 'material-symbols-outlined';
      icon.textContent = ctx.props.icon;
      icon.style.fontSize = '20px';
      item.appendChild(icon);
    }

    // Label
    const label = document.createElement('span');
    label.textContent = ctx.props.label;
    label.style.flex = '1';
    item.appendChild(label);

    // Shortcut
    if (ctx.props.shortcut) {
      const shortcut = document.createElement('span');
      shortcut.textContent = ctx.props.shortcut;
      shortcut.style.cssText = 'color: var(--md-sys-color-on-surface-variant, #888); font-size: 12px;';
      item.appendChild(shortcut);
    }

    return item;
  };
});

export const MenuDivider = defineComponent<MenuDividerProps>(() => {
  return () => {
    const hr = document.createElement('div');
    hr.style.cssText = 'height: 1px; background: var(--md-sys-color-outline-variant, #e0e0e0); margin: 4px 0;';
    return hr;
  };
});
