/**
 * Component system.
 *
 * Components are functions. defineComponent() wraps a setup function
 * that runs once, establishes signals and effects, and returns a
 * render function that produces DOM nodes.
 */

import { effect } from './signals.js';
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
 * Create a ref for accessing a DOM element.
 */
export function ref<T = HTMLElement>(): Ref<T> {
  return { current: undefined };
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
export function defineComponent<P extends Record<string, unknown> = Record<string, unknown>>(
  setup: (ctx: ComponentContext<P>) => () => AkashNode,
): Component<P> {
  const component = (rawProps: P & { children?: AkashNode | (() => AkashNode) }): Node => {
    // Separate children from props, unwrap getter functions for reactivity
    const { children: childrenProp, ...restProps } = rawProps ?? {};
    const props = new Proxy(restProps as unknown as P, {
      get(target, key, receiver) {
        const val = Reflect.get(target, key, receiver);
        // Unwrap compiler-generated reactive getters (marked with __reactive)
        if (typeof val === 'function' && (val as any).__reactive) {
          return val();
        }
        return val;
      },
    });

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
      renderFn = setup(ctx);
      if (typeof renderFn !== 'function') { throw akashError('AK0040'); }
      const rendered = renderFn();
      domNode = nodeToDOM(rendered);
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
