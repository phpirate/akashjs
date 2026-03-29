/**
 * <Portal> component.
 *
 * Renders children into a different DOM node, outside the
 * component tree. Essential for modals, tooltips, toasts,
 * dropdowns, and overlays.
 *
 * ```html
 * <Portal target="body">
 *   <div class="modal">Modal content</div>
 * </Portal>
 *
 * <Portal target="#tooltip-container">
 *   <Tooltip />
 * </Portal>
 * ```
 */

import { defineComponent, onUnmount } from './component.js';
import { nodeToDOM } from './dom.js';
import type { AkashNode } from './types.js';

export interface PortalProps {
  /** CSS selector or HTMLElement to render into (default: document.body) */
  target?: string | HTMLElement;
}

/**
 * <Portal> — render children into a different DOM location.
 */
export const Portal = defineComponent<PortalProps>((ctx) => {
  let container: HTMLElement | null = null;
  let mountedNode: Node | null = null;

  function getTarget(): HTMLElement {
    const target = ctx.props.target;
    if (!target) return document.body;
    if (typeof target === 'string') {
      return document.querySelector<HTMLElement>(target) ?? document.body;
    }
    return target;
  }

  onUnmount(() => {
    if (mountedNode && container) {
      container.removeChild(mountedNode);
    }
  });

  return () => {
    container = getTarget();
    const content = ctx.children();
    mountedNode = nodeToDOM(content);
    container.appendChild(mountedNode);

    // Return a placeholder comment in the original tree
    return document.createComment('portal');
  };
});
