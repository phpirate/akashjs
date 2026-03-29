/**
 * Material Design 3 Card component.
 *
 * Surface container with elevated, filled, and outlined variants.
 */

import { defineComponent } from '@akashjs/runtime';
import type { AkashNode } from '@akashjs/runtime';
import { addRipple, injectRippleStyles } from './ripple.js';

export interface CardProps {
  variant?: 'elevated' | 'filled' | 'outlined';
  clickable?: boolean;
  class?: string;
}

export const Card = defineComponent<CardProps>((ctx) => {
  const {
    variant = 'elevated',
    clickable = false,
    class: className,
  } = ctx.props;

  if (clickable) {
    injectRippleStyles();
  }

  return () => {
    const card = document.createElement('div');
    card.setAttribute('role', clickable ? 'button' : 'region');
    if (clickable) {
      card.tabIndex = 0;
    }

    // --- Base styles ---
    let variantStyles = '';
    switch (variant) {
      case 'elevated':
        variantStyles = `
          background-color: var(--md-sys-color-surface-container-low, #f7f2fa);
          box-shadow: 0 1px 2px 0 rgba(0,0,0,0.3), 0 1px 3px 1px rgba(0,0,0,0.15);
        `;
        break;
      case 'filled':
        variantStyles = `
          background-color: var(--md-sys-color-surface-container-highest, #e6e0e9);
          box-shadow: none;
        `;
        break;
      case 'outlined':
        variantStyles = `
          background-color: var(--md-sys-color-surface, #fffbfe);
          border: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
          box-shadow: none;
        `;
        break;
    }

    card.style.cssText = `
      border-radius: 12px;
      padding: 16px;
      color: var(--md-sys-color-on-surface, #1c1b1f);
      font-family: inherit;
      box-sizing: border-box;
      transition: box-shadow 200ms cubic-bezier(0.2, 0, 0, 1);
      ${clickable ? 'cursor: pointer; user-select: none; -webkit-tap-highlight-color: transparent;' : ''}
      ${variantStyles}
    `;

    // --- Hover elevation for clickable ---
    if (clickable) {
      card.addEventListener('mouseenter', () => {
        if (variant === 'elevated') {
          card.style.boxShadow = '0 1px 2px 0 rgba(0,0,0,0.3), 0 2px 6px 2px rgba(0,0,0,0.15)';
        } else if (variant === 'filled') {
          card.style.boxShadow = '0 1px 2px 0 rgba(0,0,0,0.3), 0 1px 3px 1px rgba(0,0,0,0.15)';
        }
      });
      card.addEventListener('mouseleave', () => {
        card.style.boxShadow = variant === 'elevated'
          ? '0 1px 2px 0 rgba(0,0,0,0.3), 0 1px 3px 1px rgba(0,0,0,0.15)'
          : 'none';
      });
      card.addEventListener('focus', () => {
        card.style.outline = '2px solid var(--md-sys-color-primary, #6750a4)';
        card.style.outlineOffset = '2px';
      });
      card.addEventListener('blur', () => {
        card.style.outline = 'none';
        card.style.outlineOffset = '';
      });
      addRipple(card);
    }

    // --- Children ---
    const children = ctx.children();
    if (children != null) {
      if (children instanceof Node) {
        card.appendChild(children);
      } else if (Array.isArray(children)) {
        for (const child of children) {
          if (child instanceof Node) card.appendChild(child);
          else if (child != null) card.appendChild(document.createTextNode(String(child)));
        }
      } else {
        card.appendChild(document.createTextNode(String(children)));
      }
    }

    if (className) {
      card.className = className;
    }

    return card;
  };
});
