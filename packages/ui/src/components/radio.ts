/**
 * Material Design 3 Radio button component.
 *
 * Custom styled radio with circle SVG and ripple effect.
 */

import { defineComponent, effect } from '@akashjs/runtime';
import { addRipple, injectRippleStyles } from './ripple.js';

export interface RadioProps {
  checked?: boolean;
  name?: string;
  value?: string;
  disabled?: boolean;
  label?: string;
  onChange?: (value: string) => void;
}

export const Radio = defineComponent<RadioProps>((ctx) => {
  injectRippleStyles();

  const {
    checked = false,
    name,
    value = '',
    disabled = false,
    label,
    onChange,
  } = ctx.props;

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
    input.type = 'radio';
    input.checked = checked;
    if (name) input.name = name;
    input.value = value;
    if (disabled) input.disabled = true;
    input.style.cssText = `
      position: absolute;
      width: 0;
      height: 0;
      opacity: 0;
      pointer-events: none;
    `;

    // --- Custom radio visual ---
    const svgNS = 'http://www.w3.org/2000/svg';

    const createRadioSvg = (isChecked: boolean): SVGElement => {
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('viewBox', '0 0 20 20');
      svg.setAttribute('width', '20');
      svg.setAttribute('height', '20');

      // Outer circle
      const outerCircle = document.createElementNS(svgNS, 'circle');
      outerCircle.setAttribute('cx', '10');
      outerCircle.setAttribute('cy', '10');
      outerCircle.setAttribute('r', '9');
      outerCircle.setAttribute('fill', 'none');
      outerCircle.setAttribute('stroke', isChecked
        ? 'var(--md-sys-color-primary, #6750a4)'
        : 'var(--md-sys-color-on-surface-variant, #49454f)');
      outerCircle.setAttribute('stroke-width', '2');
      svg.appendChild(outerCircle);

      // Inner filled circle (visible when checked)
      const innerCircle = document.createElementNS(svgNS, 'circle');
      innerCircle.setAttribute('cx', '10');
      innerCircle.setAttribute('cy', '10');
      innerCircle.setAttribute('r', isChecked ? '5' : '0');
      innerCircle.setAttribute('fill', 'var(--md-sys-color-primary, #6750a4)');
      (innerCircle as unknown as HTMLElement).style.cssText = `
        transition: r 200ms cubic-bezier(0.2, 0, 0, 1);
      `;
      svg.appendChild(innerCircle);

      (svg as unknown as HTMLElement).style.cssText = `flex-shrink: 0;`;

      return svg;
    };

    let radioSvg = createRadioSvg(checked);

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
      margin: -10px;
    `;
    rippleArea.appendChild(radioSvg);

    if (!disabled) {
      addRipple(rippleArea);
    }

    // --- Change handler ---
    input.addEventListener('change', () => {
      if (input.checked) {
        const newSvg = createRadioSvg(true);
        rippleArea.replaceChild(newSvg, radioSvg);
        radioSvg = newSvg;
        if (onChange) onChange(value);
      }
    });

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
