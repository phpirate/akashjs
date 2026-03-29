/**
 * Material Design 3 Divider component.
 *
 * Horizontal or vertical divider with full, inset, and middle variants.
 */

import { defineComponent } from '@akashjs/runtime';

export interface DividerProps {
  variant?: 'full' | 'inset' | 'middle';
  vertical?: boolean;
}

export const Divider = defineComponent<DividerProps>((ctx) => {
  const {
    variant = 'full',
    vertical = false,
  } = ctx.props;

  return () => {
    const el = document.createElement('hr');
    el.setAttribute('role', 'separator');
    el.setAttribute('aria-orientation', vertical ? 'vertical' : 'horizontal');

    const marginMap: Record<string, string> = {
      full: '0',
      inset: vertical ? '0' : '0 0 0 16px',
      middle: vertical ? '8px 0' : '0 16px',
    };

    if (vertical) {
      el.style.cssText = `
        border: none;
        width: 1px;
        align-self: stretch;
        min-height: 100%;
        margin: ${marginMap[variant] ?? '0'};
        background-color: var(--md-sys-color-outline-variant, #cac4d0);
      `;
    } else {
      el.style.cssText = `
        border: none;
        height: 1px;
        width: 100%;
        margin: ${marginMap[variant] ?? '0'};
        background-color: var(--md-sys-color-outline-variant, #cac4d0);
      `;
    }

    return el;
  };
});
