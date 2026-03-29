/**
 * <Outlet> component — renders the matched route component.
 *
 * Supports nested layouts: each Outlet renders the next level
 * in the route match chain. The outermost Outlet renders the
 * first match (root layout), which contains another Outlet
 * for the next level, and so on.
 */

import { defineComponent, effect, signal, getCurrentScope, runInScope } from '@akashjs/runtime';
import { useRouterInternal } from './router.js';

export const Outlet = defineComponent(() => {
  const routerCtx = useRouterInternal();
  const currentDepth = routerCtx.depth();

  // Capture scope so lazy-loaded children can inherit provide/inject context
  const outletScope = getCurrentScope()!;

  // Container element that we swap content in/out of
  const container = document.createElement('div');
  container.setAttribute('data-akash-outlet', '');
  container.style.display = 'contents'; // No layout impact

  let currentNode: Node | null = null;

  effect(() => {
    const resolved = routerCtx.route();
    if (!resolved) {
      // No match — clear outlet
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      currentNode = null;
      return;
    }

    const match = resolved.matches[currentDepth];
    if (!match) {
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      currentNode = null;
      return;
    }

    // Load the component (layout or page)
    const isLayout = !!match.route.layout && currentDepth < resolved.matches.length - 1;
    const componentLoader = isLayout ? match.route.layout! : match.route.component;

    componentLoader().then((mod) => {
      const Comp = mod.default;

      // Clear previous content
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      // Render the component within the outlet's scope so it inherits context
      const node = runInScope(outletScope, () => Comp({
        children: undefined,
      }));
      container.appendChild(node);
      currentNode = node;
    });
  });

  return () => container;
});
