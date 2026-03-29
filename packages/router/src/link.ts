/**
 * <Link> component — declarative navigation.
 *
 * Renders an <a> tag that intercepts clicks and uses the router's
 * navigate() instead of a full page load.
 */

import { defineComponent, createElement, setProperty } from '@akashjs/runtime';
import { useNavigate } from './router.js';
import { resolvePath, } from './router.js';
import { buildUrl } from './history.js';

export interface LinkProps {
  /** Target path (can contain :param placeholders) */
  to: string;
  /** Route params for parameterized paths */
  params?: Record<string, string>;
  /** Query string parameters */
  query?: Record<string, string>;
  /** Hash (without #) */
  hash?: string;
  /** Replace history entry instead of push */
  replace?: boolean;
  /** CSS class name */
  class?: string;
}

export const Link = defineComponent<LinkProps>((ctx) => {
  const navigate = useNavigate();

  return () => {
    const { to, params, query, hash, replace, class: className } = ctx.props;

    const resolvedPath = params ? resolvePath(to, params) : to;
    const href = buildUrl(resolvedPath, query, hash);

    const el = createElement('a');
    setProperty(el, 'href', href);
    if (className) setProperty(el, 'class', className);

    el.addEventListener('click', (e: Event) => {
      const mouseEvent = e as MouseEvent;
      // Allow modifier clicks to do default behavior (open in new tab, etc.)
      if (mouseEvent.metaKey || mouseEvent.ctrlKey || mouseEvent.shiftKey || mouseEvent.altKey) {
        return;
      }

      e.preventDefault();
      navigate(to, { params, query, hash, replace });
    });

    // Append children
    const children = ctx.children();
    if (children instanceof Node) {
      el.appendChild(children);
    } else if (typeof children === 'string' || typeof children === 'number') {
      el.textContent = String(children);
    }

    return el;
  };
});
