/**
 * Switch/Case/Default control flow component.
 *
 * Renders one of multiple branches based on a reactive expression.
 *
 * ```html
 * <Switch on={status()}>
 *   <Case value="loading"><Spinner /></Case>
 *   <Case value="error"><ErrorMessage /></Case>
 *   <Case value="success"><Content /></Case>
 *   <Default><Fallback /></Default>
 * </Switch>
 * ```
 *
 * Or programmatic:
 * ```ts
 * renderSwitch(container, anchor, () => status(), {
 *   loading: () => Spinner({}),
 *   error: () => ErrorView({}),
 *   success: () => Content({}),
 *   _default: () => Fallback({}),
 * });
 * ```
 */

import { defineComponent } from './component.js';
import { signal, effect } from './signals.js';
import { getCurrentScope, runInScope } from './context.js';
import { nodeToDOM } from './dom.js';
import type { AkashNode } from './types.js';

// =========================================================================
// Programmatic renderSwitch
// =========================================================================

/**
 * Render a switch block. Swaps DOM based on reactive expression value.
 */
export function renderSwitch(
  parent: Node,
  anchor: Node,
  expression: () => unknown,
  cases: Record<string, () => Node>,
): () => void {
  let currentNodes: Node[] = [];

  // Capture scope so children inherit provide/inject context
  const scope = getCurrentScope();

  const dispose = effect(
    () => {
      const value = String(expression());

      // Remove current nodes
      for (const node of currentNodes) {
        if (node.parentNode) node.parentNode.removeChild(node);
      }
      currentNodes = [];

      // Find matching case or default
      const branch = cases[value] ?? cases._default;
      const liveParent = anchor.parentNode;
      if (branch && liveParent) {
        const node = scope ? runInScope(scope, branch) : branch();
        const nodes = node instanceof DocumentFragment
          ? Array.from(node.childNodes)
          : [node];
        for (const n of nodes) {
          liveParent.insertBefore(n, anchor);
        }
        currentNodes = nodes;
      }
    },
    { render: true },
  );

  return () => {
    dispose();
    for (const node of currentNodes) {
      if (node.parentNode) node.parentNode.removeChild(node);
    }
  };
}

// =========================================================================
// <Switch> component
// =========================================================================

export interface SwitchProps {
  /** The value to switch on */
  on: unknown;
  /** Cases map: value → render function */
  cases: Record<string, () => AkashNode>;
  /** Default case */
  fallback?: () => AkashNode;
}

/**
 * <Switch> component — declarative switch/case.
 *
 * ```ts
 * Switch({
 *   on: status(),
 *   cases: {
 *     loading: () => Spinner({}),
 *     error: () => ErrorView({}),
 *     success: () => Content({}),
 *   },
 *   fallback: () => 'Unknown status',
 * });
 * ```
 */
export const Switch = defineComponent<SwitchProps>((ctx) => {
  return () => {
    const container = document.createElement('div');
    container.style.display = 'contents';
    const anchor = document.createComment('switch');
    container.appendChild(anchor);

    const casesMap = { ...ctx.props.cases };
    if (ctx.props.fallback) {
      casesMap._default = () => nodeToDOM(ctx.props.fallback!());
    }

    renderSwitch(
      container,
      anchor,
      () => ctx.props.on,
      Object.fromEntries(
        Object.entries(casesMap).map(([k, v]) => [
          k,
          () => nodeToDOM(v()),
        ]),
      ),
    );

    return container;
  };
});

// =========================================================================
// match() — functional pattern matching for signals
// =========================================================================

/**
 * Pattern match on a signal value. Returns the result of the matching branch.
 *
 * ```ts
 * const message = match(status(), {
 *   loading: () => 'Loading...',
 *   error: () => 'Something went wrong',
 *   success: () => 'Done!',
 *   _: () => 'Unknown',
 * });
 * ```
 */
export function match<T, R>(
  value: T,
  cases: Record<string, (value: T) => R> & { _?: (value: T) => R },
): R | undefined {
  const key = String(value);
  const branch = cases[key] ?? cases._;
  return branch ? branch(value) : undefined;
}
