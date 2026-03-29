/**
 * Material Design 3 Switch component.
 *
 * Toggle switch with animated track and thumb.
 */

import { defineComponent, effect } from '@akashjs/runtime';
import type { Signal } from '@akashjs/runtime';

export interface SwitchProps {
  checked?: Signal<boolean> | boolean;
  disabled?: boolean;
  label?: string;
  onChange?: (checked: boolean) => void;
}

export const Switch = defineComponent<SwitchProps>((ctx) => {
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

    // --- Hidden input ---
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.role = 'switch';
    input.checked = getChecked();
    if (disabled) input.disabled = true;
    input.style.cssText = `
      position: absolute;
      width: 0;
      height: 0;
      opacity: 0;
      pointer-events: none;
    `;

    // --- Track ---
    const track = document.createElement('div');
    const thumb = document.createElement('div');

    const applyTrackStyles = (isOn: boolean) => {
      track.style.cssText = `
        position: relative;
        width: 52px;
        height: 32px;
        border-radius: 16px;
        background-color: ${isOn
          ? 'var(--md-sys-color-primary, #6750a4)'
          : 'var(--md-sys-color-surface-container-highest, #e6e0e9)'};
        border: 2px solid ${isOn
          ? 'var(--md-sys-color-primary, #6750a4)'
          : 'var(--md-sys-color-outline, #79747e)'};
        transition: background-color 200ms cubic-bezier(0.2, 0, 0, 1),
                    border-color 200ms cubic-bezier(0.2, 0, 0, 1);
        flex-shrink: 0;
        box-sizing: border-box;
      `;
    };

    const applyThumbStyles = (isOn: boolean) => {
      thumb.style.cssText = `
        position: absolute;
        top: 50%;
        left: ${isOn ? '24px' : '4px'};
        transform: translateY(-50%);
        width: ${isOn ? '24px' : '16px'};
        height: ${isOn ? '24px' : '16px'};
        border-radius: 50%;
        background-color: ${isOn
          ? 'var(--md-sys-color-on-primary, #ffffff)'
          : 'var(--md-sys-color-outline, #79747e)'};
        transition: left 200ms cubic-bezier(0.2, 0, 0, 1),
                    width 200ms cubic-bezier(0.2, 0, 0, 1),
                    height 200ms cubic-bezier(0.2, 0, 0, 1),
                    background-color 200ms cubic-bezier(0.2, 0, 0, 1);
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      `;
    };

    applyTrackStyles(getChecked());
    applyThumbStyles(getChecked());
    track.appendChild(thumb);

    // --- Change handler ---
    input.addEventListener('change', () => {
      const newValue = input.checked;
      if (isSignal) {
        (checked as Signal<boolean>).set(newValue);
      }
      applyTrackStyles(newValue);
      applyThumbStyles(newValue);
      if (onChange) onChange(newValue);
    });

    // --- Reactive sync ---
    if (isSignal) {
      effect(() => {
        const val = (checked as Signal<boolean>)();
        input.checked = val;
        applyTrackStyles(val);
        applyThumbStyles(val);
      });
    }

    container.appendChild(input);
    container.appendChild(track);

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
