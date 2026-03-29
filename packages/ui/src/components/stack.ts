/**
 * Material Design 3 Stack layout component.
 *
 * Flexbox wrapper for row/column layouts with gap and alignment.
 */

import { defineComponent } from '@akashjs/runtime';
import type { AkashNode } from '@akashjs/runtime';

export interface StackProps {
  direction?: 'row' | 'column';
  gap?: string;
  align?: string;
  justify?: string;
  wrap?: boolean;
}

export const Stack = defineComponent<StackProps>((ctx) => {
  const {
    direction = 'column',
    gap = '0',
    align,
    justify,
    wrap = false,
  } = ctx.props;

  return () => {
    const el = document.createElement('div');

    el.style.cssText = `
      display: flex;
      flex-direction: ${direction};
      gap: ${gap};
      ${align ? `align-items: ${align};` : ''}
      ${justify ? `justify-content: ${justify};` : ''}
      ${wrap ? 'flex-wrap: wrap;' : ''}
    `;

    const children = ctx.children();
    if (children != null) {
      if (children instanceof Node) {
        el.appendChild(children);
      } else if (Array.isArray(children)) {
        for (const child of children) {
          if (child instanceof Node) el.appendChild(child);
          else if (child != null) el.appendChild(document.createTextNode(String(child)));
        }
      } else {
        el.appendChild(document.createTextNode(String(children)));
      }
    }

    return el;
  };
});
