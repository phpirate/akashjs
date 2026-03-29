/**
 * Material Design 3 Button component.
 *
 * Supports filled, outlined, text, and tonal variants with ripple effects.
 */

import { defineComponent, effect } from '@akashjs/runtime';
import type { AkashNode } from '@akashjs/runtime';
import { addRipple, injectRippleStyles } from './ripple.js';

export interface ButtonProps {
  variant?: 'filled' | 'outlined' | 'text' | 'tonal';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  icon?: AkashNode;
  onClick?: (e: MouseEvent) => void;
  class?: string;
}

export const Button = defineComponent<ButtonProps>((ctx) => {
  injectRippleStyles();

  const {
    variant = 'filled',
    size = 'medium',
    disabled = false,
    icon,
    onClick,
    class: className,
  } = ctx.props;

  return () => {
    const button = document.createElement('button');
    button.type = 'button';

    if (disabled) {
      button.disabled = true;
    }

    if (onClick) {
      button.addEventListener('click', onClick);
    }

    // --- Size ---
    const sizeMap = {
      small: { height: '32px', padding: '0 16px', fontSize: '13px', iconSize: '16px' },
      medium: { height: '40px', padding: '0 24px', fontSize: '14px', iconSize: '18px' },
      large: { height: '48px', padding: '0 32px', fontSize: '16px', iconSize: '20px' },
    };
    const s = sizeMap[size] ?? sizeMap.medium;

    // --- Base styles ---
    const baseStyles = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border: none;
      border-radius: 20px;
      cursor: ${disabled ? 'default' : 'pointer'};
      font-family: inherit;
      font-weight: 500;
      letter-spacing: 0.02em;
      height: ${s.height};
      padding: ${s.padding};
      font-size: ${s.fontSize};
      transition: box-shadow 200ms cubic-bezier(0.2, 0, 0, 1),
                  background-color 200ms cubic-bezier(0.2, 0, 0, 1);
      outline: none;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    `;

    // --- Variant styles ---
    let variantStyles = '';
    switch (variant) {
      case 'filled':
        variantStyles = `
          background-color: var(--md-sys-color-primary, #6750a4);
          color: var(--md-sys-color-on-primary, #ffffff);
          ${disabled ? 'opacity: 0.38;' : ''}
        `;
        break;
      case 'outlined':
        variantStyles = `
          background-color: transparent;
          color: var(--md-sys-color-primary, #6750a4);
          border: 1px solid var(--md-sys-color-outline, #79747e);
          ${disabled ? 'opacity: 0.38;' : ''}
        `;
        break;
      case 'text':
        variantStyles = `
          background-color: transparent;
          color: var(--md-sys-color-primary, #6750a4);
          padding: 0 12px;
          ${disabled ? 'opacity: 0.38;' : ''}
        `;
        break;
      case 'tonal':
        variantStyles = `
          background-color: var(--md-sys-color-secondary-container, #e8def8);
          color: var(--md-sys-color-on-secondary-container, #1d192b);
          ${disabled ? 'opacity: 0.38;' : ''}
        `;
        break;
    }

    button.style.cssText = baseStyles + variantStyles;

    // --- Hover / focus states ---
    if (!disabled) {
      button.addEventListener('mouseenter', () => {
        if (variant === 'filled') {
          button.style.boxShadow = '0 1px 3px 1px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.3)';
        }
      });
      button.addEventListener('mouseleave', () => {
        button.style.boxShadow = '';
      });
      button.addEventListener('focus', () => {
        button.style.outline = `2px solid var(--md-sys-color-primary, #6750a4)`;
        button.style.outlineOffset = '2px';
      });
      button.addEventListener('blur', () => {
        button.style.outline = 'none';
        button.style.outlineOffset = '';
      });
    }

    // --- Icon slot ---
    if (icon) {
      const iconWrapper = document.createElement('span');
      iconWrapper.style.cssText = `
        display: inline-flex;
        align-items: center;
        font-size: ${s.iconSize};
        width: ${s.iconSize};
        height: ${s.iconSize};
      `;
      if (icon instanceof Node) {
        iconWrapper.appendChild(icon);
      }
      button.appendChild(iconWrapper);
    }

    // --- Children (label) ---
    const children = ctx.children();
    if (children != null) {
      if (children instanceof Node) {
        button.appendChild(children);
      } else if (Array.isArray(children)) {
        for (const child of children) {
          if (child instanceof Node) button.appendChild(child);
          else if (child != null) button.appendChild(document.createTextNode(String(child)));
        }
      } else {
        button.appendChild(document.createTextNode(String(children)));
      }
    }

    // --- Class ---
    if (className) {
      button.className = className;
    }

    // --- Ripple ---
    if (!disabled) {
      addRipple(button);
    }

    return button;
  };
});
