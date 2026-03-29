/**
 * Material Design 3 Grid layout component.
 *
 * CSS Grid wrapper with responsive column support.
 */

import { defineComponent } from '@akashjs/runtime';
import type { AkashNode } from '@akashjs/runtime';

export interface ResponsiveColumns {
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
}

export interface GridProps {
  columns?: number | ResponsiveColumns;
  gap?: string;
  alignItems?: string;
  justifyContent?: string;
}

export const Grid = defineComponent<GridProps>((ctx) => {
  const {
    columns = 12,
    gap = '16px',
    alignItems,
    justifyContent,
  } = ctx.props;

  return () => {
    const grid = document.createElement('div');

    const colCount = typeof columns === 'number' ? columns : columns.md ?? 12;

    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(${colCount}, 1fr);
      gap: ${gap};
      ${alignItems ? `align-items: ${alignItems};` : ''}
      ${justifyContent ? `justify-content: ${justifyContent};` : ''}
      width: 100%;
      box-sizing: border-box;
    `;

    // --- Responsive columns via media queries ---
    if (typeof columns === 'object') {
      const breakpoints: Record<string, string> = {
        xs: '0px',
        sm: '600px',
        md: '905px',
        lg: '1240px',
        xl: '1440px',
      };

      // Inject responsive styles
      const id = `akash-grid-${Math.random().toString(36).slice(2, 8)}`;
      grid.className = id;

      let css = '';
      for (const [bp, minWidth] of Object.entries(breakpoints)) {
        const cols = (columns as ResponsiveColumns)[bp as keyof ResponsiveColumns];
        if (cols != null) {
          css += `@media (min-width: ${minWidth}) { .${id} { grid-template-columns: repeat(${cols}, 1fr); } }\n`;
        }
      }

      if (css) {
        const style = document.createElement('style');
        style.textContent = css;
        grid.appendChild(style);
      }
    }

    // --- Children ---
    const children = ctx.children();
    if (children != null) {
      if (children instanceof Node) {
        grid.appendChild(children);
      } else if (Array.isArray(children)) {
        for (const child of children) {
          if (child instanceof Node) grid.appendChild(child);
          else if (child != null) grid.appendChild(document.createTextNode(String(child)));
        }
      } else {
        grid.appendChild(document.createTextNode(String(children)));
      }
    }

    return grid;
  };
});

// --- GridItem ---

export interface GridItemProps {
  span?: number;
}

export const GridItem = defineComponent<GridItemProps>((ctx) => {
  const { span = 1 } = ctx.props;

  return () => {
    const item = document.createElement('div');

    item.style.cssText = `
      grid-column: span ${span};
      min-width: 0;
    `;

    const children = ctx.children();
    if (children != null) {
      if (children instanceof Node) {
        item.appendChild(children);
      } else if (Array.isArray(children)) {
        for (const child of children) {
          if (child instanceof Node) item.appendChild(child);
          else if (child != null) item.appendChild(document.createTextNode(String(child)));
        }
      } else {
        item.appendChild(document.createTextNode(String(children)));
      }
    }

    return item;
  };
});
