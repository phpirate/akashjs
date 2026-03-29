/**
 * Material Design 3 Checkbox component.
 *
 * Custom styled checkbox with checkmark SVG and ripple effect.
 */

import { defineComponent, effect } from '@akashjs/runtime';
import type { Signal } from '@akashjs/runtime';
import { addRipple, injectRippleStyles } from './ripple.js';

export interface CheckboxProps {
  checked?: Signal<boolean> | boolean;
  disabled?: boolean;
  label?: string;
  onChange?: (checked: boolean) => void;
}

export const Checkbox = defineComponent<CheckboxProps>((ctx) => {
  injectRippleStyles();

  const { checked, disabled = false, label, onChange } = ctx.props;

  const isSignal = typeof checked === 'function' && 'set' in (checked as object);

  function getChecked(): boolean {
    if (isSignal) return (checked as Signal<boolean>)();
    return checked as boolean ?? false;
  }

  return () => {
    const container = document.createElement('label');
    container.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 12px;
      cursor: ${disabled ? 'default' : 'pointer'};
      user-select: none;
      -webkit-tap-highlight-color: transparent;
      ${disabled ? 'opacity: 0.38;' : ''}
    `;

    // --- Hidden native input ---
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = getChecked();
    if (disabled) input.disabled = true;
    input.style.cssText = `
      position: absolute;
      width: 0;
      height: 0;
      opacity: 0;
      pointer-events: none;
    `;

    // --- Custom checkbox visual ---
    const box = document.createElement('div');
    const applyBoxStyles = (isChecked: boolean) => {
      box.style.cssText = `
        position: relative;
        width: 18px;
        height: 18px;
        border-radius: 2px;
        border: 2px solid ${isChecked
          ? 'var(--md-sys-color-primary, #6750a4)'
          : 'var(--md-sys-color-on-surface-variant, #49454f)'};
        background-color: ${isChecked
          ? 'var(--md-sys-color-primary, #6750a4)'
          : 'transparent'};
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 200ms cubic-bezier(0.2, 0, 0, 1),
                    border-color 200ms cubic-bezier(0.2, 0, 0, 1);
        flex-shrink: 0;
      `;
    };
    applyBoxStyles(getChecked());

    // --- Checkmark SVG ---
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '14');
    svg.setAttribute('height', '14');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'var(--md-sys-color-on-primary, #ffffff)');
    svg.setAttribute('stroke-width', '3');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');

    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', 'M4.5 12.75l6 6 9-13.5');
    svg.appendChild(path);

    const applyCheckmarkVisibility = (isChecked: boolean) => {
      (svg as unknown as HTMLElement).style.cssText = `
        opacity: ${isChecked ? '1' : '0'};
        transform: ${isChecked ? 'scale(1)' : 'scale(0.5)'};
        transition: opacity 200ms cubic-bezier(0.2, 0, 0, 1),
                    transform 200ms cubic-bezier(0.2, 0, 0, 1);
      `;
    };
    applyCheckmarkVisibility(getChecked());

    box.appendChild(svg);

    // --- Ripple area ---
    const rippleArea = document.createElement('div');
    rippleArea.style.cssText = `
      position: relative;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: -11px;
    `;
    rippleArea.appendChild(box);

    if (!disabled) {
      addRipple(rippleArea);
    }

    // --- Change handler ---
    input.addEventListener('change', () => {
      const newValue = input.checked;
      if (isSignal) {
        (checked as Signal<boolean>).set(newValue);
      }
      applyBoxStyles(newValue);
      applyCheckmarkVisibility(newValue);
      if (onChange) onChange(newValue);
    });

    // --- Reactive sync ---
    if (isSignal) {
      effect(() => {
        const val = (checked as Signal<boolean>)();
        input.checked = val;
        applyBoxStyles(val);
        applyCheckmarkVisibility(val);
      });
    }

    container.appendChild(input);
    container.appendChild(rippleArea);

    // --- Label text ---
    if (label) {
      const labelText = document.createElement('span');
      labelText.textContent = label;
      labelText.style.cssText = `
        font-size: 16px;
        color: var(--md-sys-color-on-surface, #1d1b20);
        line-height: 1.5;
      `;
      container.appendChild(labelText);
    }

    return container;
  };
});
