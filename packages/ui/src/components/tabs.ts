/**
 * Material Design 3 Tabs component.
 *
 * Horizontal tab navigation with animated active indicator.
 */

import { defineComponent } from '@akashjs/runtime';

export interface TabItem {
  label: string;
  value: string;
}

export interface TabsProps {
  items: TabItem[];
  activeValue?: string;
  onChange?: (value: string) => void;
  variant?: 'primary' | 'secondary';
}

export const Tabs = defineComponent<TabsProps>((ctx) => {
  const {
    items = [],
    activeValue,
    onChange,
    variant = 'primary',
  } = ctx.props;

  // Inject animation styles once
  if (typeof document !== 'undefined' && !document.getElementById('akash-tabs-styles')) {
    const style = document.createElement('style');
    style.id = 'akash-tabs-styles';
    style.textContent = `
      @keyframes akash-tab-indicator {
        from { transform: scaleX(0); }
        to { transform: scaleX(1); }
      }
    `;
    document.head.appendChild(style);
  }

  return () => {
    const nav = document.createElement('nav');
    nav.setAttribute('role', 'tablist');

    const isPrimary = variant === 'primary';
    nav.style.cssText = `
      display: flex;
      width: 100%;
      border-bottom: 1px solid var(--md-sys-color-surface-variant, #e7e0ec);
      background-color: var(--md-sys-color-surface, #fffbfe);
      overflow-x: auto;
      scrollbar-width: none;
    `;

    for (const item of items) {
      const isActive = item.value === activeValue;
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', String(isActive));
      button.textContent = item.label;

      button.style.cssText = `
        flex: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        position: relative;
        border: none;
        background: none;
        cursor: pointer;
        font-family: inherit;
        font-size: 14px;
        font-weight: 500;
        letter-spacing: 0.1px;
        line-height: 20px;
        padding: 0 16px;
        height: 48px;
        min-width: 48px;
        color: ${isActive
          ? `var(--md-sys-color-${isPrimary ? 'primary' : 'on-surface'}, ${isPrimary ? '#6750a4' : '#1c1b1f'})`
          : 'var(--md-sys-color-on-surface-variant, #49454f)'};
        transition: color 200ms cubic-bezier(0.2, 0, 0, 1);
        outline: none;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
      `;

      // --- Active indicator ---
      if (isActive) {
        const indicator = document.createElement('span');
        indicator.style.cssText = `
          position: absolute;
          bottom: 0;
          left: ${isPrimary ? '25%' : '0'};
          right: ${isPrimary ? '25%' : '0'};
          height: ${isPrimary ? '3px' : '2px'};
          border-radius: 3px 3px 0 0;
          background-color: var(--md-sys-color-primary, #6750a4);
          animation: akash-tab-indicator 200ms cubic-bezier(0.2, 0, 0, 1) forwards;
        `;
        button.appendChild(indicator);
      }

      // --- Hover state ---
      button.addEventListener('mouseenter', () => {
        if (!isActive) {
          button.style.backgroundColor = 'var(--md-sys-color-surface-variant, #e7e0ec)';
        }
      });
      button.addEventListener('mouseleave', () => {
        button.style.backgroundColor = '';
      });

      // --- Focus ---
      button.addEventListener('focus', () => {
        button.style.outline = '2px solid var(--md-sys-color-primary, #6750a4)';
        button.style.outlineOffset = '-2px';
      });
      button.addEventListener('blur', () => {
        button.style.outline = 'none';
      });

      // --- Click ---
      button.addEventListener('click', () => {
        if (onChange) onChange(item.value);
      });

      nav.appendChild(button);
    }

    return nav;
  };
});
