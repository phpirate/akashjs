/**
 * Event modifiers and extended bind/class/style directives.
 *
 * Modifiers: onClick|preventDefault|stopPropagation|once|self|capture
 * Extended binds: bind:clientWidth, bind:scrollY, bind:group, bind:this
 * Class directive: class:active={isActive}
 * Style directive: style:color={textColor}
 */

import { signal, effect } from './signals.js';
import type { Signal, ReadonlySignal } from './signals.js';

// =========================================================================
// Event modifiers
// =========================================================================

export interface EventModifiers {
  preventDefault?: boolean;
  stopPropagation?: boolean;
  stopImmediatePropagation?: boolean;
  once?: boolean;
  capture?: boolean;
  passive?: boolean;
  self?: boolean;
}

/**
 * Wrap an event handler with modifiers.
 *
 * ```ts
 * const handler = withModifiers(onClick, {
 *   preventDefault: true,
 *   stopPropagation: true,
 *   once: true,
 * });
 * el.addEventListener('click', handler);
 * ```
 */
export function withModifiers<E extends Event>(
  handler: (e: E) => void,
  modifiers: EventModifiers,
): (e: E) => void {
  return (e: E) => {
    if (modifiers.self && e.target !== e.currentTarget) return;
    if (modifiers.preventDefault) e.preventDefault();
    if (modifiers.stopPropagation) e.stopPropagation();
    if (modifiers.stopImmediatePropagation) (e as any).stopImmediatePropagation?.();
    handler(e);
  };
}

/**
 * Attach an event handler with modifiers to an element.
 *
 * ```ts
 * onEvent(el, 'click', handler, { preventDefault: true, once: true });
 * ```
 */
export function onEvent<K extends keyof HTMLElementEventMap>(
  el: HTMLElement,
  event: K,
  handler: (e: HTMLElementEventMap[K]) => void,
  modifiers: EventModifiers = {},
): () => void {
  const wrapped = withModifiers(handler, modifiers);
  const listenerOptions: AddEventListenerOptions = {
    once: modifiers.once,
    capture: modifiers.capture,
    passive: modifiers.passive,
  };

  el.addEventListener(event, wrapped as EventListener, listenerOptions);
  return () => el.removeEventListener(event, wrapped as EventListener, listenerOptions);
}

// =========================================================================
// Extended bind directives
// =========================================================================

/**
 * Bind element dimensions to signals (read-only, auto-updating).
 *
 * ```ts
 * const { width, height } = bindDimensions(el);
 * width(); // tracks clientWidth
 * ```
 */
export function bindDimensions(el: HTMLElement): {
  width: ReadonlySignal<number>;
  height: ReadonlySignal<number>;
} {
  const width = signal(el.clientWidth);
  const height = signal(el.clientHeight);

  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        width.set(entry.contentRect.width);
        height.set(entry.contentRect.height);
      }
    });
    observer.observe(el);
  }

  return {
    width: () => width(),
    height: () => height(),
  };
}

/**
 * Bind scroll position to signals.
 *
 * ```ts
 * const { scrollX, scrollY } = bindScroll(el);
 * // or for window:
 * const { scrollX, scrollY } = bindScroll();
 * ```
 */
export function bindScroll(el?: HTMLElement): {
  scrollX: Signal<number>;
  scrollY: Signal<number>;
} {
  const target = el ?? (typeof window !== 'undefined' ? window : null);
  const scrollX = signal(el ? el.scrollLeft : (window?.scrollX ?? 0));
  const scrollY = signal(el ? el.scrollTop : (window?.scrollY ?? 0));

  if (target) {
    const handler = () => {
      if (el) {
        scrollX.set(el.scrollLeft);
        scrollY.set(el.scrollTop);
      } else {
        scrollX.set(window.scrollX);
        scrollY.set(window.scrollY);
      }
    };
    (target as any).addEventListener('scroll', handler, { passive: true });
  }

  // Also allow setting scroll position
  const originalSetY = scrollY.set;
  scrollY.set = (value: number) => {
    originalSetY(value);
    if (el) el.scrollTop = value;
    else window?.scrollTo(window.scrollX, value);
  };

  const originalSetX = scrollX.set;
  scrollX.set = (value: number) => {
    originalSetX(value);
    if (el) el.scrollLeft = value;
    else window?.scrollTo(value, window.scrollY);
  };

  return { scrollX, scrollY };
}

/**
 * Bind a signal to an element reference (like bind:this in Svelte).
 *
 * ```ts
 * const myRef = bindElement<HTMLInputElement>();
 * // In render: myRef.set(inputEl);
 * myRef()?.focus();
 * ```
 */
export function bindElement<T extends HTMLElement = HTMLElement>(): Signal<T | null> {
  return signal<T | null>(null);
}

/**
 * Bind a group of radio/checkbox inputs to a signal.
 *
 * ```ts
 * const selected = bindGroup<string>('color');
 * // Apply to each radio: bindGroupItem(radioEl, selected, 'red');
 * ```
 */
export function bindGroup<T>(name: string): Signal<T | null> {
  return signal<T | null>(null);
}

export function bindGroupItem<T>(
  el: HTMLInputElement,
  group: Signal<T | null>,
  value: T,
): void {
  el.name = typeof value === 'string' ? value : '';
  el.addEventListener('change', () => {
    if (el.checked) group.set(value);
  });

  effect(() => {
    el.checked = group() === value;
  });
}

// =========================================================================
// Class directive
// =========================================================================

/**
 * Conditionally apply a CSS class based on a reactive condition.
 *
 * ```ts
 * bindClass(el, 'active', () => isActive());
 * bindClass(el, 'disabled', () => isDisabled());
 * ```
 */
export function bindClass(
  el: HTMLElement,
  className: string,
  condition: () => boolean,
): () => void {
  return effect(() => {
    if (condition()) {
      el.classList.add(className);
    } else {
      el.classList.remove(className);
    }
  });
}

/**
 * Apply multiple conditional classes at once.
 *
 * ```ts
 * bindClasses(el, {
 *   active: () => isActive(),
 *   disabled: () => isDisabled(),
 *   'text-bold': () => isBold(),
 * });
 * ```
 */
export function bindClasses(
  el: HTMLElement,
  classes: Record<string, () => boolean>,
): () => void {
  const disposers = Object.entries(classes).map(([cls, condition]) =>
    bindClass(el, cls, condition),
  );
  return () => disposers.forEach((d) => d());
}

// =========================================================================
// Style directive
// =========================================================================

/**
 * Reactively bind a CSS property to a value.
 *
 * ```ts
 * bindStyle(el, 'color', () => textColor());
 * bindStyle(el, 'font-size', () => `${fontSize()}px`);
 * ```
 */
export function bindStyle(
  el: HTMLElement,
  property: string,
  value: () => string | number | null,
): () => void {
  const kebab = property.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

  return effect(() => {
    const v = value();
    if (v == null) {
      el.style.removeProperty(kebab);
    } else {
      el.style.setProperty(kebab, typeof v === 'number' ? `${v}px` : String(v));
    }
  });
}

/**
 * Bind multiple style properties at once.
 *
 * ```ts
 * bindStyles(el, {
 *   color: () => color(),
 *   'font-size': () => `${size()}px`,
 *   opacity: () => isVisible() ? 1 : 0,
 * });
 * ```
 */
export function bindStyles(
  el: HTMLElement,
  styles: Record<string, () => string | number | null>,
): () => void {
  const disposers = Object.entries(styles).map(([prop, valueFn]) =>
    bindStyle(el, prop, valueFn),
  );
  return () => disposers.forEach((d) => d());
}
