/**
 * Material Design 3 Badge component.
 *
 * Small dot or number badge, positioned absolutely for use on icons/buttons.
 */

import { defineComponent } from '@akashjs/runtime';

export interface BadgeProps {
  content?: string | number;
  variant?: 'small' | 'large';
  color?: 'error' | 'primary';
}

export const Badge = defineComponent<BadgeProps>((ctx) => {
  const {
    content,
    variant = 'small',
    color = 'error',
  } = ctx.props;

  return () => {
    const badge = document.createElement('span');

    const colorMap = {
      error: {
        bg: 'var(--md-sys-color-error, #b3261e)',
        fg: 'var(--md-sys-color-on-error, #ffffff)',
      },
      primary: {
        bg: 'var(--md-sys-color-primary, #6750a4)',
        fg: 'var(--md-sys-color-on-primary, #ffffff)',
      },
    };

    const c = colorMap[color] ?? colorMap.error;
    const isSmall = variant === 'small';

    if (isSmall) {
      badge.style.cssText = `
        position: absolute;
        top: 0;
        right: 0;
        transform: translate(50%, -50%);
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background-color: ${c.bg};
        pointer-events: none;
      `;
    } else {
      const text = content != null ? String(content) : '';
      badge.textContent = text;
      badge.style.cssText = `
        position: absolute;
        top: 0;
        right: 0;
        transform: translate(50%, -50%);
        min-width: 16px;
        height: 16px;
        padding: 0 4px;
        border-radius: 9999px;
        background-color: ${c.bg};
        color: ${c.fg};
        font-family: inherit;
        font-size: 11px;
        font-weight: 500;
        line-height: 16px;
        text-align: center;
        white-space: nowrap;
        pointer-events: none;
        box-sizing: border-box;
      `;
    }

    return badge;
  };
});
