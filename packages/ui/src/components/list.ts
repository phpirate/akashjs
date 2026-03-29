/**
 * Material Design 3 List and ListItem components.
 *
 * Vertical list with leading/trailing slots, headline, and supporting text.
 */

import { defineComponent } from '@akashjs/runtime';
import type { AkashNode } from '@akashjs/runtime';
import { addRipple, injectRippleStyles } from './ripple.js';

export interface ListProps {
  dense?: boolean;
}

export const List = defineComponent<ListProps>((ctx) => {
  const { dense = false } = ctx.props;

  return () => {
    const ul = document.createElement('ul');
    ul.setAttribute('role', 'list');
    ul.style.cssText = `
      list-style: none;
      margin: 0;
      padding: ${dense ? '4px 0' : '8px 0'};
      font-family: inherit;
      background-color: var(--md-sys-color-surface, #fffbfe);
      color: var(--md-sys-color-on-surface, #1c1b1f);
    `;

    const children = ctx.children();
    if (children != null) {
      if (children instanceof Node) {
        ul.appendChild(children);
      } else if (Array.isArray(children)) {
        for (const child of children) {
          if (child instanceof Node) ul.appendChild(child);
          else if (child != null) ul.appendChild(document.createTextNode(String(child)));
        }
      } else {
        ul.appendChild(document.createTextNode(String(children)));
      }
    }

    return ul;
  };
});

export interface ListItemProps {
  leading?: AkashNode;
  trailing?: AkashNode;
  headline: string;
  supporting?: string;
  onClick?: (e: MouseEvent) => void;
  disabled?: boolean;
}

export const ListItem = defineComponent<ListItemProps>((ctx) => {
  injectRippleStyles();

  const {
    leading,
    trailing,
    headline,
    supporting,
    onClick,
    disabled = false,
  } = ctx.props;

  return () => {
    const li = document.createElement('li');
    li.setAttribute('role', 'listitem');

    li.style.cssText = `
      display: flex;
      align-items: center;
      gap: 16px;
      padding: ${supporting ? '12px 16px' : '8px 16px'};
      min-height: ${supporting ? '72px' : '56px'};
      cursor: ${disabled ? 'default' : onClick ? 'pointer' : 'default'};
      opacity: ${disabled ? '0.38' : '1'};
      transition: background-color 200ms cubic-bezier(0.2, 0, 0, 1);
      user-select: none;
      -webkit-tap-highlight-color: transparent;
      box-sizing: border-box;
    `;

    // --- Hover ---
    if (!disabled && onClick) {
      li.addEventListener('mouseenter', () => {
        li.style.backgroundColor = 'var(--md-sys-color-surface-container-highest, #e6e0e9)';
      });
      li.addEventListener('mouseleave', () => {
        li.style.backgroundColor = '';
      });
      li.addEventListener('click', onClick);
    }

    // --- Leading slot ---
    if (leading != null) {
      const leadingEl = document.createElement('span');
      leadingEl.style.cssText = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 24px;
        height: 24px;
        color: var(--md-sys-color-on-surface-variant, #49454f);
      `;
      if (leading instanceof Node) {
        leadingEl.appendChild(leading);
      } else {
        leadingEl.appendChild(document.createTextNode(String(leading)));
      }
      li.appendChild(leadingEl);
    }

    // --- Content ---
    const content = document.createElement('div');
    content.style.cssText = `
      flex: 1;
      min-width: 0;
    `;

    const headlineEl = document.createElement('div');
    headlineEl.textContent = headline;
    headlineEl.style.cssText = `
      font-size: 16px;
      line-height: 24px;
      letter-spacing: 0.5px;
      color: var(--md-sys-color-on-surface, #1c1b1f);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
    content.appendChild(headlineEl);

    if (supporting) {
      const supportingEl = document.createElement('div');
      supportingEl.textContent = supporting;
      supportingEl.style.cssText = `
        font-size: 14px;
        line-height: 20px;
        letter-spacing: 0.25px;
        color: var(--md-sys-color-on-surface-variant, #49454f);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      `;
      content.appendChild(supportingEl);
    }

    li.appendChild(content);

    // --- Trailing slot ---
    if (trailing != null) {
      const trailingEl = document.createElement('span');
      trailingEl.style.cssText = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        color: var(--md-sys-color-on-surface-variant, #49454f);
      `;
      if (trailing instanceof Node) {
        trailingEl.appendChild(trailing);
      } else {
        trailingEl.appendChild(document.createTextNode(String(trailing)));
      }
      li.appendChild(trailingEl);
    }

    // --- Ripple ---
    if (!disabled && onClick) {
      addRipple(li);
    }

    return li;
  };
});
