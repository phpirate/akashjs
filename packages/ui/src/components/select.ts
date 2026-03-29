/**
 * Material Design 3 Select component.
 *
 * Wraps a native select element with MD3 styling.
 */

import { defineComponent, effect } from '@akashjs/runtime';
import type { Signal } from '@akashjs/runtime';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  options?: SelectOption[];
  value?: Signal<string>;
  label?: string;
  disabled?: boolean;
  placeholder?: string;
  onChange?: (value: string) => void;
}

export const Select = defineComponent<SelectProps>((ctx) => {
  const {
    options = [],
    value,
    label,
    disabled = false,
    placeholder,
    onChange,
  } = ctx.props;

  return () => {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: relative;
      display: inline-flex;
      flex-direction: column;
      min-width: 210px;
      font-family: inherit;
    `;

    // --- Field container ---
    const fieldContainer = document.createElement('div');
    fieldContainer.style.cssText = `
      position: relative;
      display: flex;
      align-items: center;
      height: 56px;
      border-radius: 4px;
      border: 1px solid var(--md-sys-color-outline, #79747e);
      background-color: transparent;
      transition: border-color 200ms, border-width 200ms;
      ${disabled ? 'opacity: 0.38; pointer-events: none;' : ''}
    `;

    // --- Label ---
    const currentValue = value ? value() : '';
    const hasValue = currentValue.length > 0;

    if (label) {
      const labelEl = document.createElement('label');
      labelEl.textContent = label;

      const applyLabelFloat = (floating: boolean) => {
        labelEl.style.cssText = `
          position: absolute;
          left: 16px;
          color: var(--md-sys-color-on-surface-variant, #49454f);
          font-size: ${floating ? '12px' : '16px'};
          top: ${floating ? '-8px' : '50%'};
          transform: ${floating ? 'none' : 'translateY(-50%)'};
          transition: all 200ms cubic-bezier(0.2, 0, 0, 1);
          pointer-events: none;
          background-color: ${floating ? 'var(--md-sys-color-surface, #fffbfe)' : 'transparent'};
          padding: ${floating ? '0 4px' : '0'};
          z-index: 1;
        `;
      };
      applyLabelFloat(hasValue);
      fieldContainer.appendChild(labelEl);

      // Update label on focus/blur
      const updateLabel = () => {
        const hasSel = selectEl.value.length > 0;
        applyLabelFloat(hasSel || document.activeElement === selectEl);
      };

      // Will attach listeners after selectEl is created
      queueMicrotask(() => {
        selectEl.addEventListener('focus', () => {
          applyLabelFloat(true);
          fieldContainer.style.borderWidth = '2px';
          fieldContainer.style.borderColor = 'var(--md-sys-color-primary, #6750a4)';
          labelEl.style.color = 'var(--md-sys-color-primary, #6750a4)';
        });
        selectEl.addEventListener('blur', () => {
          updateLabel();
          fieldContainer.style.borderWidth = '1px';
          fieldContainer.style.borderColor = 'var(--md-sys-color-outline, #79747e)';
          labelEl.style.color = 'var(--md-sys-color-on-surface-variant, #49454f)';
        });
      });
    }

    // --- Select element ---
    const selectEl = document.createElement('select');
    if (disabled) selectEl.disabled = true;

    selectEl.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      outline: none;
      background: transparent;
      font-size: 16px;
      font-family: inherit;
      color: var(--md-sys-color-on-surface, #1d1b20);
      padding: ${label ? '24px 40px 8px 16px' : '16px 40px 16px 16px'};
      box-sizing: border-box;
      cursor: pointer;
      appearance: none;
      -webkit-appearance: none;
    `;

    // --- Placeholder option ---
    if (placeholder) {
      const placeholderOpt = document.createElement('option');
      placeholderOpt.value = '';
      placeholderOpt.textContent = placeholder;
      placeholderOpt.disabled = true;
      if (!hasValue) placeholderOpt.selected = true;
      selectEl.appendChild(placeholderOpt);
    }

    // --- Options ---
    for (const opt of options) {
      const optionEl = document.createElement('option');
      optionEl.value = opt.value;
      optionEl.textContent = opt.label;
      if (value && value() === opt.value) {
        optionEl.selected = true;
      }
      selectEl.appendChild(optionEl);
    }

    // --- Dropdown arrow ---
    const arrow = document.createElement('div');
    arrow.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--md-sys-color-on-surface-variant, #49454f)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`;
    arrow.style.cssText = `
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      display: flex;
      align-items: center;
    `;

    // --- Change handler ---
    selectEl.addEventListener('change', () => {
      if (value) value.set(selectEl.value);
      if (onChange) onChange(selectEl.value);
    });

    // --- Reactive sync ---
    if (value) {
      effect(() => {
        const v = value();
        if (selectEl.value !== v) {
          selectEl.value = v;
        }
      });
    }

    fieldContainer.appendChild(selectEl);
    fieldContainer.appendChild(arrow);
    wrapper.appendChild(fieldContainer);

    return wrapper;
  };
});
