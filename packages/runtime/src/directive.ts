/**
 * Custom directive system.
 *
 * Reusable attribute behaviors with lifecycle hooks.
 * Directives attach behavior to elements without components.
 *
 * ```ts
 * const vAutoFocus = defineDirective({
 *   mounted(el) { el.focus(); },
 * });
 *
 * const vTooltip = defineDirective<string>({
 *   mounted(el, { value }) { addTooltip(el, value); },
 *   updated(el, { value }) { updateTooltip(el, value); },
 *   unmounted(el) { removeTooltip(el); },
 * });
 *
 * // Usage:
 * applyDirective(el, vAutoFocus);
 * applyDirective(el, vTooltip, 'Hello tooltip');
 * ```
 */

// =========================================================================
// Types
// =========================================================================

export interface DirectiveBinding<T = any> {
  /** Current value passed to the directive */
  value: T;
  /** Previous value (on update) */
  oldValue?: T;
  /** Argument (e.g., v-on:click → arg = 'click') */
  arg?: string;
  /** Modifiers (e.g., v-on.prevent → modifiers.prevent = true) */
  modifiers?: Record<string, boolean>;
}

export interface DirectiveHooks<T = any> {
  /** Called when the element is inserted into the DOM */
  mounted?: (el: HTMLElement, binding: DirectiveBinding<T>) => void;
  /** Called when the bound value updates */
  updated?: (el: HTMLElement, binding: DirectiveBinding<T>) => void;
  /** Called before the element is removed from the DOM */
  unmounted?: (el: HTMLElement, binding: DirectiveBinding<T>) => void;
}

export interface Directive<T = any> {
  _type: 'directive';
  hooks: DirectiveHooks<T>;
}

// =========================================================================
// defineDirective
// =========================================================================

/**
 * Define a custom directive.
 *
 * ```ts
 * const vClickOutside = defineDirective<() => void>({
 *   mounted(el, { value: handler }) {
 *     const listener = (e: Event) => {
 *       if (!el.contains(e.target as Node)) handler();
 *     };
 *     document.addEventListener('click', listener);
 *     (el as any).__clickOutside = listener;
 *   },
 *   unmounted(el) {
 *     document.removeEventListener('click', (el as any).__clickOutside);
 *   },
 * });
 * ```
 */
export function defineDirective<T = any>(hooks: DirectiveHooks<T>): Directive<T> {
  return { _type: 'directive', hooks };
}

/**
 * Shorthand: directive from a single function (runs on mount).
 */
export function directiveFromFn<T = any>(
  fn: (el: HTMLElement, binding: DirectiveBinding<T>) => void | (() => void),
): Directive<T> {
  return defineDirective<T>({
    mounted(el, binding) {
      const cleanup = fn(el, binding);
      if (typeof cleanup === 'function') {
        (el as any).__directiveCleanup = cleanup;
      }
    },
    unmounted(el) {
      (el as any).__directiveCleanup?.();
    },
  });
}

// =========================================================================
// applyDirective — attach a directive to an element
// =========================================================================

const DIRECTIVE_KEY = Symbol('akash.directives');

interface DirectiveState {
  directive: Directive;
  binding: DirectiveBinding;
}

/**
 * Apply a directive to an element.
 *
 * ```ts
 * applyDirective(el, vAutoFocus);
 * applyDirective(el, vTooltip, 'Hello');
 * ```
 */
export function applyDirective<T>(
  el: HTMLElement,
  directive: Directive<T>,
  value?: T,
  options?: { arg?: string; modifiers?: Record<string, boolean> },
): void {
  const binding: DirectiveBinding<T> = {
    value: value as T,
    arg: options?.arg,
    modifiers: options?.modifiers,
  };

  // Store directive state on element
  const states: DirectiveState[] = (el as any)[DIRECTIVE_KEY] ?? [];
  states.push({ directive, binding });
  (el as any)[DIRECTIVE_KEY] = states;

  // Call mounted hook
  directive.hooks.mounted?.(el, binding);
}

/**
 * Update a directive's value on an element.
 */
export function updateDirective<T>(
  el: HTMLElement,
  directive: Directive<T>,
  newValue: T,
): void {
  const states: DirectiveState[] = (el as any)[DIRECTIVE_KEY] ?? [];
  const state = states.find((s) => s.directive === directive);

  if (state) {
    const oldValue = state.binding.value;
    state.binding = { ...state.binding, value: newValue, oldValue };
    directive.hooks.updated?.(el, state.binding);
  }
}

/**
 * Remove all directives from an element (call on unmount).
 */
export function removeDirectives(el: HTMLElement): void {
  const states: DirectiveState[] = (el as any)[DIRECTIVE_KEY] ?? [];
  for (const state of states) {
    state.directive.hooks.unmounted?.(el, state.binding);
  }
  delete (el as any)[DIRECTIVE_KEY];
}

// =========================================================================
// Built-in directives
// =========================================================================

/** Auto-focus an element when mounted */
export const vAutoFocus = defineDirective({
  mounted(el) {
    requestAnimationFrame(() => el.focus());
  },
});

/** Click outside handler */
export const vClickOutside = defineDirective<() => void>({
  mounted(el, { value: handler }) {
    const listener = (e: Event) => {
      if (!el.contains(e.target as Node)) handler();
    };
    document.addEventListener('click', listener, true);
    (el as any).__vClickOutside = listener;
  },
  unmounted(el) {
    document.removeEventListener('click', (el as any).__vClickOutside, true);
    delete (el as any).__vClickOutside;
  },
});

/** Long press handler */
export const vLongPress = defineDirective<{ handler: () => void; duration?: number }>({
  mounted(el, { value }) {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const duration = value.duration ?? 500;

    const start = () => { timer = setTimeout(value.handler, duration); };
    const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };

    el.addEventListener('pointerdown', start);
    el.addEventListener('pointerup', cancel);
    el.addEventListener('pointerleave', cancel);

    (el as any).__vLongPress = { start, cancel };
  },
  unmounted(el) {
    const fns = (el as any).__vLongPress;
    if (fns) {
      el.removeEventListener('pointerdown', fns.start);
      el.removeEventListener('pointerup', fns.cancel);
      el.removeEventListener('pointerleave', fns.cancel);
    }
  },
});

/** Intersection observer — triggers callback when element enters viewport */
export const vIntersect = defineDirective<(isIntersecting: boolean) => void>({
  mounted(el, { value: callback }) {
    const observer = new IntersectionObserver((entries) => {
      callback(entries[0].isIntersecting);
    });
    observer.observe(el);
    (el as any).__vIntersect = observer;
  },
  unmounted(el) {
    (el as any).__vIntersect?.disconnect();
  },
});

/** Resize observer — triggers callback on element resize */
export const vResize = defineDirective<(entry: ResizeObserverEntry) => void>({
  mounted(el, { value: callback }) {
    const observer = new ResizeObserver((entries) => {
      callback(entries[0]);
    });
    observer.observe(el);
    (el as any).__vResize = observer;
  },
  unmounted(el) {
    (el as any).__vResize?.disconnect();
  },
});
