/**
 * Material Design 3 TextField component.
 *
 * Supports filled and outlined variants with label animation,
 * error states, and helper text.
 */

import { defineComponent, effect } from '@akashjs/runtime';
import type { Signal } from '@akashjs/runtime';

export interface TextFieldProps {
  label?: string;
  value?: Signal<string>;
  type?: 'text' | 'password' | 'email' | 'number';
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  variant?: 'filled' | 'outlined';
  onInput?: (value: string) => void;
  /** Alias for onInput — consistent with other components */
  onChange?: (value: string) => void;
  onBlur?: (e: FocusEvent) => void;
}

export const TextField = defineComponent<TextFieldProps>((ctx) => {
  const {
    label,
    value,
    type = 'text',
    placeholder,
    disabled = false,
    error,
    helperText,
    variant = 'filled',
    onInput,
    onChange,
    onBlur,
  } = ctx.props;
  const onValueChange = onInput ?? onChange;

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
    const isFilled = variant === 'filled';

    fieldContainer.style.cssText = `
      position: relative;
      display: flex;
      align-items: center;
      height: 56px;
      border-radius: ${isFilled ? '4px 4px 0 0' : '4px'};
      ${isFilled
        ? `background-color: var(--md-sys-color-surface-container-highest, #e6e0e9);
           border-bottom: ${error ? '2px' : '1px'} solid ${error
             ? 'var(--md-sys-color-error, #b3261e)'
             : 'var(--md-sys-color-on-surface-variant, #49454f)'};`
        : `background-color: transparent;
           border: ${error ? '2px' : '1px'} solid ${error
             ? 'var(--md-sys-color-error, #b3261e)'
             : 'var(--md-sys-color-outline, #79747e)'};`
      }
      transition: border-color 200ms, border-width 200ms;
      cursor: text;
      ${disabled ? 'opacity: 0.38; pointer-events: none;' : ''}
    `;

    // --- Label element ---
    const labelEl = document.createElement('label');
    const hasValue = value ? value().length > 0 : false;
    let isFloating = hasValue;

    const applyLabelStyles = (floating: boolean) => {
      labelEl.style.cssText = `
        position: absolute;
        left: 16px;
        color: ${error
          ? 'var(--md-sys-color-error, #b3261e)'
          : 'var(--md-sys-color-on-surface-variant, #49454f)'};
        font-size: ${floating ? '12px' : '16px'};
        top: ${floating ? '8px' : '50%'};
        transform: ${floating ? 'none' : 'translateY(-50%)'};
        transition: all 200ms cubic-bezier(0.2, 0, 0, 1);
        pointer-events: none;
        background-color: ${!isFilled && floating ? 'var(--md-sys-color-surface, #fffbfe)' : 'transparent'};
        padding: ${!isFilled && floating ? '0 4px' : '0'};
      `;
    };

    if (label) {
      labelEl.textContent = label;
      applyLabelStyles(isFloating);
      fieldContainer.appendChild(labelEl);
    }

    // --- Input element ---
    const input = document.createElement('input');
    input.type = type;
    // When label is present, only show placeholder when label is floated
    // to prevent overlap between resting label and placeholder text
    if (placeholder && !label) input.placeholder = placeholder;
    if (placeholder && label && isFloating) input.placeholder = placeholder;
    if (disabled) input.disabled = true;
    if (value) input.value = value();

    input.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      outline: none;
      background: transparent;
      font-size: 16px;
      font-family: inherit;
      color: var(--md-sys-color-on-surface, #1d1b20);
      padding: ${label ? '24px 16px 8px' : '16px'};
      box-sizing: border-box;
      caret-color: ${error
        ? 'var(--md-sys-color-error, #b3261e)'
        : 'var(--md-sys-color-primary, #6750a4)'};
    `;

    // --- Focus & value handling ---
    input.addEventListener('focus', () => {
      isFloating = true;
      if (label) {
        applyLabelStyles(true);
        if (placeholder) input.placeholder = placeholder;
      }

      if (isFilled) {
        fieldContainer.style.borderBottomWidth = '2px';
        fieldContainer.style.borderBottomColor = error
          ? 'var(--md-sys-color-error, #b3261e)'
          : 'var(--md-sys-color-primary, #6750a4)';
      } else {
        fieldContainer.style.borderWidth = '2px';
        fieldContainer.style.borderColor = error
          ? 'var(--md-sys-color-error, #b3261e)'
          : 'var(--md-sys-color-primary, #6750a4)';
      }

      if (label && !error) {
        labelEl.style.color = 'var(--md-sys-color-primary, #6750a4)';
      }
    });

    input.addEventListener('blur', (e) => {
      const hasContent = input.value.length > 0;
      isFloating = hasContent;
      if (label) {
        applyLabelStyles(hasContent);
        input.placeholder = hasContent && placeholder ? placeholder : '';
      }

      if (isFilled) {
        fieldContainer.style.borderBottomWidth = error ? '2px' : '1px';
        fieldContainer.style.borderBottomColor = error
          ? 'var(--md-sys-color-error, #b3261e)'
          : 'var(--md-sys-color-on-surface-variant, #49454f)';
      } else {
        fieldContainer.style.borderWidth = error ? '2px' : '1px';
        fieldContainer.style.borderColor = error
          ? 'var(--md-sys-color-error, #b3261e)'
          : 'var(--md-sys-color-outline, #79747e)';
      }

      if (label) {
        labelEl.style.color = error
          ? 'var(--md-sys-color-error, #b3261e)'
          : 'var(--md-sys-color-on-surface-variant, #49454f)';
      }

      if (onBlur) onBlur(e);
    });

    input.addEventListener('input', () => {
      if (value && typeof value.set === 'function') value.set(input.value);
      if (onValueChange) onValueChange(input.value);
    });

    // --- Reactive value sync ---
    if (value) {
      effect(() => {
        const v = value();
        // Skip when the input has focus — the user's keystroke already
        // updated the DOM value, the label is already floated, and
        // running this effect mid-cycle (e.g. type → onChange → URL
        // update → computed re-evaluates) can steal focus.
        if (document.activeElement === input) return;
        if (input.value !== v) {
          input.value = v;
        }
        const hasContent = v.length > 0;
        if (label) {
          applyLabelStyles(hasContent);
          input.placeholder = hasContent && placeholder ? placeholder : '';
        }
      });
    }

    fieldContainer.appendChild(input);

    // Click on container focuses input
    fieldContainer.addEventListener('click', () => {
      input.focus();
    });

    wrapper.appendChild(fieldContainer);

    // --- Helper / error text ---
    const supportText = error || helperText;
    if (supportText) {
      const supportEl = document.createElement('div');
      supportEl.textContent = supportText;
      supportEl.style.cssText = `
        font-size: 12px;
        line-height: 16px;
        padding: 4px 16px 0;
        color: ${error
          ? 'var(--md-sys-color-error, #b3261e)'
          : 'var(--md-sys-color-on-surface-variant, #49454f)'};
      `;
      wrapper.appendChild(supportEl);
    }

    return wrapper;
  };
});
