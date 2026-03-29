/**
 * Web Components output.
 *
 * Compile AkashJS components to native Custom Elements that can
 * be used in any framework or plain HTML.
 *
 * ```ts
 * import { defineCustomElement } from '@akashjs/runtime';
 * import Counter from './Counter.akash';
 *
 * defineCustomElement('my-counter', Counter, {
 *   props: ['initial'],
 *   shadow: true,
 * });
 *
 * // Now usable as: <my-counter initial="5"></my-counter>
 * ```
 */

import type { Component } from './component.js';

// =========================================================================
// Types
// =========================================================================

export interface CustomElementOptions {
  /** Props to observe as attributes */
  props?: string[];
  /** Use Shadow DOM (default: true) */
  shadow?: boolean;
  /** CSS styles to inject (for shadow DOM) */
  styles?: string;
  /** Extend an existing element */
  extends?: string;
}

// =========================================================================
// defineCustomElement
// =========================================================================

/**
 * Register an AkashJS component as a Custom Element.
 *
 * ```ts
 * defineCustomElement('my-counter', Counter, {
 *   props: ['initial', 'step'],
 *   shadow: true,
 *   styles: ':host { display: block; }',
 * });
 * ```
 */
export function defineCustomElement<P extends Record<string, unknown>>(
  tagName: string,
  component: Component<P>,
  options: CustomElementOptions = {},
): typeof HTMLElement {
  const { props = [], shadow = true, styles } = options;

  class AkashElement extends HTMLElement {
    static get observedAttributes(): string[] {
      return props;
    }

    private _root: ShadowRoot | HTMLElement;
    private _mounted = false;
    private _props: Record<string, unknown> = {};

    constructor() {
      super();
      this._root = shadow ? this.attachShadow({ mode: 'open' }) : this;
    }

    connectedCallback(): void {
      // Read initial attribute values
      for (const prop of props) {
        const attr = this.getAttribute(prop);
        if (attr !== null) {
          this._props[prop] = parseAttributeValue(attr);
        }
      }

      this._render();
      this._mounted = true;
    }

    disconnectedCallback(): void {
      // Clear rendered content
      while (this._root.firstChild) {
        this._root.removeChild(this._root.firstChild);
      }
      this._mounted = false;
    }

    attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void {
      this._props[name] = newValue !== null ? parseAttributeValue(newValue) : undefined;
      if (this._mounted) {
        this._render();
      }
    }

    private _render(): void {
      // Clear previous
      while (this._root.firstChild) {
        this._root.removeChild(this._root.firstChild);
      }

      // Inject styles if shadow DOM
      if (shadow && styles) {
        const styleEl = document.createElement('style');
        styleEl.textContent = styles;
        this._root.appendChild(styleEl);
      }

      // Render component
      const node = component(this._props as any);
      this._root.appendChild(node);
    }

    // Allow programmatic prop setting
    setProps(newProps: Partial<P>): void {
      Object.assign(this._props, newProps);
      if (this._mounted) this._render();
    }
  }

  // Register the custom element
  if (typeof customElements !== 'undefined' && !customElements.get(tagName)) {
    if (options.extends) {
      customElements.define(tagName, AkashElement, { extends: options.extends });
    } else {
      customElements.define(tagName, AkashElement);
    }
  }

  return AkashElement;
}

/**
 * Convert an AkashJS component to a Custom Element class without registering.
 * Useful for testing or when you want to register later.
 */
export function toCustomElement<P extends Record<string, unknown>>(
  component: Component<P>,
  options: CustomElementOptions = {},
): typeof HTMLElement {
  // Same implementation but without auto-registration
  const { props = [], shadow = true, styles } = options;

  return class extends HTMLElement {
    static get observedAttributes() { return props; }

    private _root: ShadowRoot | HTMLElement;
    private _mounted = false;
    private _props: Record<string, unknown> = {};

    constructor() {
      super();
      this._root = shadow ? this.attachShadow({ mode: 'open' }) : this;
    }

    connectedCallback() {
      for (const prop of props) {
        const attr = this.getAttribute(prop);
        if (attr !== null) this._props[prop] = parseAttributeValue(attr);
      }
      this._render();
      this._mounted = true;
    }

    disconnectedCallback() {
      while (this._root.firstChild) this._root.removeChild(this._root.firstChild);
      this._mounted = false;
    }

    attributeChangedCallback(name: string, _old: string | null, val: string | null) {
      this._props[name] = val !== null ? parseAttributeValue(val) : undefined;
      if (this._mounted) this._render();
    }

    private _render() {
      while (this._root.firstChild) this._root.removeChild(this._root.firstChild);
      if (shadow && styles) {
        const s = document.createElement('style');
        s.textContent = styles;
        this._root.appendChild(s);
      }
      this._root.appendChild(component(this._props as any));
    }
  } as any;
}

// =========================================================================
// Helpers
// =========================================================================

function parseAttributeValue(value: string): unknown {
  // Try to parse as JSON (numbers, booleans, objects)
  try {
    return JSON.parse(value);
  } catch {
    return value; // Keep as string
  }
}
