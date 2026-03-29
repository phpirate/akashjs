/**
 * Material Design 3 App Bar component.
 *
 * Top app bar with title, leading/trailing actions, and elevation support.
 */

import { defineComponent } from '@akashjs/runtime';
import type { AkashNode } from '@akashjs/runtime';

export interface AppBarProps {
  title?: string;
  variant?: 'center' | 'small' | 'medium' | 'large';
  elevation?: number;
  class?: string;
}

export const AppBar = defineComponent<AppBarProps>((ctx) => {
  const {
    title = '',
    variant = 'small',
    elevation = 0,
    class: className,
  } = ctx.props;

  return () => {
    const header = document.createElement('header');
    header.setAttribute('role', 'banner');

    // --- Elevation shadow ---
    const elevationMap: Record<number, string> = {
      0: 'none',
      1: '0 1px 2px 0 rgba(0,0,0,0.3), 0 1px 3px 1px rgba(0,0,0,0.15)',
      2: '0 1px 2px 0 rgba(0,0,0,0.3), 0 2px 6px 2px rgba(0,0,0,0.15)',
      3: '0 4px 8px 3px rgba(0,0,0,0.15), 0 1px 3px 0 rgba(0,0,0,0.3)',
      4: '0 6px 10px 4px rgba(0,0,0,0.15), 0 2px 3px 0 rgba(0,0,0,0.3)',
      5: '0 8px 12px 6px rgba(0,0,0,0.15), 0 4px 4px 0 rgba(0,0,0,0.3)',
    };

    // --- Title typography by variant ---
    const titleStyles: Record<string, string> = {
      center: 'font-size: 22px; line-height: 28px; font-weight: 400; text-align: center; flex: 1;',
      small: 'font-size: 22px; line-height: 28px; font-weight: 400;',
      medium: 'font-size: 24px; line-height: 32px; font-weight: 400;',
      large: 'font-size: 28px; line-height: 36px; font-weight: 400;',
    };

    const isLargeVariant = variant === 'medium' || variant === 'large';
    const barHeight = isLargeVariant ? 'auto' : '64px';
    const paddingBottom = variant === 'large' ? '28px' : variant === 'medium' ? '24px' : '0';

    header.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      min-height: ${barHeight};
      padding: 0 4px;
      ${isLargeVariant ? `padding-bottom: ${paddingBottom};` : ''}
      background-color: var(--md-sys-color-surface, #fffbfe);
      color: var(--md-sys-color-on-surface, #1c1b1f);
      box-shadow: ${elevationMap[elevation] ?? 'none'};
      font-family: inherit;
      box-sizing: border-box;
    `;

    // --- Top row: leading actions, title (for center/small), trailing actions ---
    const topRow = document.createElement('div');
    topRow.style.cssText = `
      display: flex;
      align-items: center;
      height: 64px;
      padding: 0 4px;
      gap: 4px;
    `;

    // --- Children slot: leading and trailing actions ---
    const children = ctx.children();
    if (children != null) {
      if (children instanceof Node) {
        topRow.appendChild(children);
      } else if (Array.isArray(children)) {
        for (const child of children) {
          if (child instanceof Node) topRow.appendChild(child);
          else if (child != null) topRow.appendChild(document.createTextNode(String(child)));
        }
      } else {
        topRow.appendChild(document.createTextNode(String(children)));
      }
    }

    // --- Title ---
    if (!isLargeVariant) {
      // For center/small, title goes in the top row
      const titleEl = document.createElement('span');
      titleEl.textContent = title;
      titleEl.style.cssText = `
        ${titleStyles[variant] ?? titleStyles.small}
        color: var(--md-sys-color-on-surface, #1c1b1f);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        padding: 0 16px;
      `;

      if (variant === 'center') {
        // Insert title so it's centered between leading and trailing
        if (topRow.firstChild) {
          topRow.insertBefore(titleEl, topRow.firstChild.nextSibling);
        } else {
          topRow.appendChild(titleEl);
        }
      } else {
        // Small: title after leading actions
        if (topRow.firstChild) {
          topRow.insertBefore(titleEl, topRow.firstChild.nextSibling);
        } else {
          topRow.appendChild(titleEl);
        }
      }

      header.appendChild(topRow);
    } else {
      // For medium/large, title goes below the top row
      header.appendChild(topRow);

      const titleEl = document.createElement('div');
      titleEl.textContent = title;
      titleEl.style.cssText = `
        ${titleStyles[variant]}
        color: var(--md-sys-color-on-surface, #1c1b1f);
        padding: 0 16px;
      `;
      header.appendChild(titleEl);
    }

    if (className) {
      header.className = className;
    }

    return header;
  };
});
