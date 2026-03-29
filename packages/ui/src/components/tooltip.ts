/**
 * Material Design 3 Tooltip component.
 *
 * Wraps children and shows tooltip on hover/focus.
 */

import { defineComponent } from '@akashjs/runtime';
import type { AkashNode } from '@akashjs/runtime';

export interface TooltipProps {
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip = defineComponent<TooltipProps>((ctx) => {
  const {
    text,
    position = 'top',
  } = ctx.props;

  return () => {
    const wrapper = document.createElement('span');
    wrapper.style.cssText = `
      position: relative;
      display: inline-flex;
    `;

    // --- Tooltip content ---
    const tooltip = document.createElement('div');
    tooltip.setAttribute('role', 'tooltip');
    tooltip.textContent = text;

    const positionStyles: Record<string, string> = {
      top: 'bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%);',
      bottom: 'top: calc(100% + 8px); left: 50%; transform: translateX(-50%);',
      left: 'right: calc(100% + 8px); top: 50%; transform: translateY(-50%);',
      right: 'left: calc(100% + 8px); top: 50%; transform: translateY(-50%);',
    };

    tooltip.style.cssText = `
      position: absolute;
      ${positionStyles[position] ?? positionStyles.top}
      z-index: 2000;
      padding: 4px 8px;
      border-radius: 4px;
      background-color: var(--md-sys-color-inverse-surface, #313033);
      color: var(--md-sys-color-inverse-on-surface, #f4eff4);
      font-family: inherit;
      font-size: 12px;
      font-weight: 500;
      line-height: 16px;
      letter-spacing: 0.4px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 150ms cubic-bezier(0.2, 0, 0, 1);
    `;

    const show = () => { tooltip.style.opacity = '1'; };
    const hide = () => { tooltip.style.opacity = '0'; };

    wrapper.addEventListener('mouseenter', show);
    wrapper.addEventListener('mouseleave', hide);
    wrapper.addEventListener('focusin', show);
    wrapper.addEventListener('focusout', hide);

    // --- Children ---
    const children = ctx.children();
    if (children != null) {
      if (children instanceof Node) {
        wrapper.appendChild(children);
      } else if (Array.isArray(children)) {
        for (const child of children) {
          if (child instanceof Node) wrapper.appendChild(child);
          else if (child != null) wrapper.appendChild(document.createTextNode(String(child)));
        }
      } else {
        wrapper.appendChild(document.createTextNode(String(children)));
      }
    }

    wrapper.appendChild(tooltip);
    return wrapper;
  };
});
