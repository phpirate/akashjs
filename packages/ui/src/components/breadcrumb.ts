/**
 * Material Design 3 Breadcrumb component.
 *
 * Navigation breadcrumb trail with separator and aria-current on the last item.
 */

import { defineComponent } from '@akashjs/runtime';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export const Breadcrumb = defineComponent<BreadcrumbProps>((ctx) => {
  const { items = [] } = ctx.props;

  return () => {
    const nav = document.createElement('nav');
    nav.setAttribute('aria-label', 'Breadcrumb');

    nav.style.cssText = `
      font-family: inherit;
      font-size: 14px;
      line-height: 20px;
      letter-spacing: 0.1px;
    `;

    const ol = document.createElement('ol');
    ol.style.cssText = `
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 4px;
      list-style: none;
      margin: 0;
      padding: 0;
    `;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const isLast = i === items.length - 1;

      const li = document.createElement('li');
      li.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 4px;
      `;

      if (item.href && !isLast) {
        const a = document.createElement('a');
        a.href = item.href;
        a.textContent = item.label;
        a.style.cssText = `
          color: var(--md-sys-color-primary, #6750a4);
          text-decoration: none;
          font-weight: 500;
        `;
        a.addEventListener('mouseenter', () => {
          a.style.textDecoration = 'underline';
        });
        a.addEventListener('mouseleave', () => {
          a.style.textDecoration = 'none';
        });
        li.appendChild(a);
      } else {
        const span = document.createElement('span');
        span.textContent = item.label;
        span.style.cssText = `
          color: var(--md-sys-color-on-surface${isLast ? '' : '-variant'}, ${isLast ? '#1c1b1f' : '#49454f'});
          font-weight: ${isLast ? '500' : '400'};
        `;
        if (isLast) {
          span.setAttribute('aria-current', 'page');
        }
        li.appendChild(span);
      }

      // --- Separator ---
      if (!isLast) {
        const separator = document.createElement('span');
        separator.textContent = '/';
        separator.setAttribute('aria-hidden', 'true');
        separator.style.cssText = `
          color: var(--md-sys-color-on-surface-variant, #49454f);
          margin: 0 4px;
          user-select: none;
        `;
        li.appendChild(separator);
      }

      ol.appendChild(li);
    }

    nav.appendChild(ol);
    return nav;
  };
});
