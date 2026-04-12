/**
 * Component system.
 *
 * Components are functions. defineComponent() wraps a setup function
 * that runs once, establishes signals and effects, and returns a
 * render function that produces DOM nodes.
 */

import { effect, untrack } from './signals.js';
import { pushScope, popScope, getCurrentScope } from './context.js';
import { nodeToDOM } from './dom.js';
import { akashError } from './errors.js';
import type { AkashNode } from './types.js';

// --- Reactive getter marker (used by compiler) ---

/** Mark a function as a compiler-generated reactive getter */
export function __getter<T>(fn: () => T): (() => T) & { __reactive: true } {
  (fn as any).__reactive = true;
  return fn as any;
}

// --- Types ---

export interface Ref<T = HTMLElement> {
  current: T | undefined;
}

export interface ComponentContext<P extends Record<string, unknown> = Record<string, unknown>> {
  props: Readonly<P>;
  children: () => AkashNode;
}

export type Component<P extends Record<string, unknown> = Record<string, unknown>> = {
  (props: P & { children?: AkashNode | (() => AkashNode) }): Node;
  _akash: true;
};

// --- Lifecycle hook storage ---

interface LifecycleHooks {
  mount: Array<() => void | (() => void)>;
  unmount: Array<() => void>;
  error: Array<(error: Error) => void>;
}

let currentHooks: LifecycleHooks | null = null;

// --- Public lifecycle hooks ---

/**
 * Register a callback to run after the component is mounted to the DOM.
 * If the callback returns a function, it will be called on unmount (cleanup).
 */
export function onMount(fn: () => void | (() => void)): void {
  if (!currentHooks) {
    throw akashError('AK0020');
  }
  currentHooks.mount.push(fn);
}

/**
 * Register a callback to run before the component is unmounted.
 */
export function onUnmount(fn: () => void): void {
  if (!currentHooks) {
    throw akashError('AK0021');
  }
  currentHooks.unmount.push(fn);
}

/**
 * Register an error handler for this component and its descendants.
 */
export function onError(fn: (error: Error) => void): void {
  if (!currentHooks) {
    throw akashError('AK0022');
  }
  currentHooks.error.push(fn);
}

/**
 * Create a ref for accessing a DOM element or storing a mutable value.
 */
export function ref<T = HTMLElement>(initialValue?: T): Ref<T> {
  return { current: initialValue as T | undefined };
}

// --- defineComponent ---

/**
 * Define a component. The setup function runs once per instance.
 * It receives a context with typed props and must return a render function.
 *
 * ```ts
 * const Counter = defineComponent<{ initial: number }>((ctx) => {
 *   const count = signal(ctx.props.initial);
 *   return () => <div>{count()}</div>;
 * });
 * ```
 */
export function defineComponent<P extends Record<string, any> = Record<string, any>>(
  setup: (ctx: ComponentContext<P>) => () => AkashNode,
): Component<P> {
  const component = (rawProps: P & { children?: AkashNode | (() => AkashNode) }): Node => {
    // Separate children from props, unwrap getter functions for reactivity
    const { children: childrenProp, ...restProps } = rawProps ?? {};
    // Props are passed through as-is — no auto-unwrapping.
    // Components use readProp() to unwrap reactive getters/signals inside
    // effects, which preserves dependency tracking. Auto-unwrapping in the
    // Proxy broke reactivity because it called the getter once and returned
    // the plain value, so effects never subscribed to the underlying signal.
    const props = restProps as unknown as P;

    const childrenFn: () => AkashNode =
      typeof childrenProp === 'function'
        ? childrenProp
        : () => childrenProp ?? null;

    const ctx: ComponentContext<P> = {
      props,
      children: childrenFn,
    };

    // Set up lifecycle hooks collector
    const hooks: LifecycleHooks = { mount: [], unmount: [], error: [] };
    const prevHooks = currentHooks;
    currentHooks = hooks;

    // Push context scope for provide/inject
    const parentScope = getCurrentScope();
    const scope = pushScope(parentScope);

    let renderFn: () => AkashNode;
    let domNode: Node;

    try {
      // Untrack component creation so that signals created inside the component
      // don't register with a parent render effect. This prevents parent effects
      // from re-running (and re-creating the entire component) when internal
      // component state changes. The component's own effects still track their
      // dependencies because effect() sets its own subscriber during execution.
      domNode = untrack(() => {
        renderFn = setup(ctx);
        if (typeof renderFn !== 'function') { throw akashError('AK0040'); }
        const rendered = renderFn();
        return nodeToDOM(rendered);
      });
    } catch (err) {
      popScope(scope);
      currentHooks = prevHooks;
      if (hooks.error.length > 0) {
        for (const handler of hooks.error) {
          handler(err instanceof Error ? err : new Error(String(err)));
        }
        return document.createComment('error');
      }
      throw err;
    }

    // Restore parent state
    popScope(scope);
    currentHooks = prevHooks;

    // Run mount callbacks (microtask to ensure DOM is attached)
    if (hooks.mount.length > 0) {
      queueMicrotask(() => {
        for (const mountFn of hooks.mount) {
          try {
            const cleanup = mountFn();
            if (typeof cleanup === 'function') {
              hooks.unmount.push(cleanup);
            }
          } catch (err) {
            for (const handler of hooks.error) {
              handler(err instanceof Error ? err : new Error(String(err)));
            }
          }
        }
      });
    }

    return domNode;
  };

  component._akash = true as const;
  return component as Component<P>;
}
