/**
 * Material Design 3 Chip component.
 *
 * Compact elements for actions, filters, inputs, and suggestions.
 */

import { defineComponent } from '@akashjs/runtime';
import type { AkashNode } from '@akashjs/runtime';
import { addRipple, injectRippleStyles } from './ripple.js';

export interface ChipProps {
  label: string;
  variant?: 'assist' | 'filter' | 'input' | 'suggestion';
  selected?: boolean;
  icon?: AkashNode;
  onClose?: () => void;
  onClick?: (e: MouseEvent) => void;
}

export const Chip = defineComponent<ChipProps>((ctx) => {
  injectRippleStyles();

  const {
    label,
    variant = 'assist',
    selected = false,
    icon,
    onClose,
    onClick,
  } = ctx.props;

  return () => {
    const chip = document.createElement('div');
    chip.setAttribute('role', variant === 'filter' ? 'option' : 'button');
    chip.tabIndex = 0;
    if (variant === 'filter') {
      chip.setAttribute('aria-selected', String(selected));
    }

    // --- Base styles ---
    const isSelected = selected && variant === 'filter';
    const bgColor = isSelected
      ? 'var(--md-sys-color-secondary-container, #e8def8)'
      : 'transparent';
    const borderColor = isSelected
      ? 'transparent'
      : 'var(--md-sys-color-outline, #79747e)';
    const textColor = isSelected
      ? 'var(--md-sys-color-on-secondary-container, #1d192b)'
      : 'var(--md-sys-color-on-surface-variant, #49454f)';

    chip.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 32px;
      padding: 0 ${onClose ? '4px' : '16px'} 0 ${icon ? '8px' : '16px'};
      border-radius: 8px;
      border: 1px solid ${borderColor};
      background-color: ${bgColor};
      color: ${textColor};
      font-family: inherit;
      font-size: 14px;
      font-weight: 500;
      letter-spacing: 0.1px;
      line-height: 20px;
      cursor: pointer;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
      transition: background-color 200ms cubic-bezier(0.2, 0, 0, 1);
      box-sizing: border-box;
    `;

    // --- Hover / focus ---
    chip.addEventListener('mouseenter', () => {
      chip.style.backgroundColor = isSelected
        ? 'var(--md-sys-color-secondary-container, #e8def8)'
        : 'var(--md-sys-color-surface-container-highest, #e6e0e9)';
    });
    chip.addEventListener('mouseleave', () => {
      chip.style.backgroundColor = bgColor;
    });
    chip.addEventListener('focus', () => {
      chip.style.outline = '2px solid var(--md-sys-color-primary, #6750a4)';
      chip.style.outlineOffset = '2px';
    });
    chip.addEventListener('blur', () => {
      chip.style.outline = 'none';
      chip.style.outlineOffset = '';
    });

    if (onClick) {
      chip.addEventListener('click', onClick);
    }

    // --- Leading icon ---
    if (icon != null) {
      const iconWrapper = document.createElement('span');
      iconWrapper.style.cssText = `
        display: inline-flex;
        align-items: center;
        font-size: 18px;
        width: 18px;
        height: 18px;
      `;
      if (icon instanceof Node) {
        iconWrapper.appendChild(icon);
      }
      chip.appendChild(iconWrapper);
    }

    // --- Filter check mark ---
    if (variant === 'filter' && isSelected) {
      const check = document.createElement('span');
      check.textContent = '\u2713';
      check.style.cssText = `
        display: inline-flex;
        align-items: center;
        font-size: 16px;
        width: 18px;
        height: 18px;
      `;
      chip.appendChild(check);
    }

    // --- Label ---
    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    chip.appendChild(labelEl);

    // --- Close button for input chips ---
    if (onClose && variant === 'input') {
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.setAttribute('aria-label', `Remove ${label}`);
      closeBtn.textContent = '\u2715';
      closeBtn.style.cssText = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border: none;
        background: none;
        border-radius: 50%;
        cursor: pointer;
        color: var(--md-sys-color-on-surface-variant, #49454f);
        font-size: 14px;
        padding: 0;
        margin-left: -4px;
        transition: background-color 200ms;
      `;
      closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.backgroundColor = 'var(--md-sys-color-surface-container-highest, #e6e0e9)';
      });
      closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.backgroundColor = '';
      });
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onClose();
      });
      chip.appendChild(closeBtn);
    }

    addRipple(chip);
    return chip;
  };
});
