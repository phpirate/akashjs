/**
 * @akashjs/runtime/test — Test utilities.
 *
 * Provides mount(), fireEvent, and query helpers for testing
 * AkashJS components with Vitest (or any test runner).
 *
 * No TestBed, no module configuration, no compileComponents().
 * Just mount a component and query the resulting DOM.
 */

import { defineComponent } from './component.js';
import { provide } from './context.js';
import type { Component } from './component.js';
import type { InjectionKey } from './context.js';

// --- Mount result ---

export interface MountResult {
  /** The root container element */
  container: HTMLElement;
  /** Unmount the component and clean up */
  unmount(): void;
  /** Find the first element whose text content contains the given string */
  getByText(text: string): HTMLElement;
  /** Find the first element with the given ARIA role */
  getByRole(role: string): HTMLElement;
  /** Find the first element with the given data-testid */
  getByTestId(id: string): HTMLElement;
  /** Query all elements matching a CSS selector */
  queryAll(selector: string): HTMLElement[];
  /** Query the first element matching a CSS selector, or null */
  query(selector: string): HTMLElement | null;
}

// --- Mount options ---

export interface MountOptions<P extends Record<string, unknown>> {
  /** Props to pass to the component */
  props?: P;
  /** Context values to provide (Map of InjectionKey -> value) */
  provide?: Map<InjectionKey<any>, any>;
}

// --- mount() ---

/**
 * Mount a component into a detached DOM element for testing.
 *
 * ```ts
 * const { getByText, getByRole } = mount(Counter, { props: { initial: 5 } });
 * expect(getByText('Count: 5')).toBeTruthy();
 * ```
 */
export function mount<P extends Record<string, unknown> = Record<string, unknown>>(
  component: Component<P>,
  options?: MountOptions<P>,
): MountResult {
  const container = document.createElement('div');
  container.setAttribute('data-akash-test-root', '');

  const props = (options?.props ?? {}) as P & { children?: undefined };
  const provides = options?.provide;

  let node: Node;

  if (provides && provides.size > 0) {
    // Wrap in a provider component to inject context values
    const Wrapper = defineComponent(() => {
      for (const [key, value] of provides) {
        provide(key, value);
      }
      return () => component(props);
    });
    node = Wrapper({});
  } else {
    node = component(props);
  }

  container.appendChild(node);

  // Attach to document so queries work properly
  document.body.appendChild(container);

  return {
    container,

    unmount() {
      container.remove();
    },

    getByText(text: string): HTMLElement {
      const el = findByText(container, text);
      if (!el) {
        throw new Error(
          `[AkashJS Test] Could not find element with text: "${text}"\n` +
            `  Container HTML: ${container.innerHTML.slice(0, 200)}`,
        );
      }
      return el;
    },

    getByRole(role: string): HTMLElement {
      const el = container.querySelector<HTMLElement>(`[role="${role}"]`)
        ?? findImplicitRole(container, role);
      if (!el) {
        throw new Error(
          `[AkashJS Test] Could not find element with role: "${role}"\n` +
            `  Container HTML: ${container.innerHTML.slice(0, 200)}`,
        );
      }
      return el;
    },

    getByTestId(id: string): HTMLElement {
      const el = container.querySelector<HTMLElement>(`[data-testid="${id}"]`);
      if (!el) {
        throw new Error(
          `[AkashJS Test] Could not find element with data-testid: "${id}"\n` +
            `  Container HTML: ${container.innerHTML.slice(0, 200)}`,
        );
      }
      return el;
    },

    queryAll(selector: string): HTMLElement[] {
      return Array.from(container.querySelectorAll<HTMLElement>(selector));
    },

    query(selector: string): HTMLElement | null {
      return container.querySelector<HTMLElement>(selector);
    },
  };
}

// --- fireEvent ---

/**
 * Fire DOM events on elements. Returns a promise that resolves
 * after a microtask, giving effects time to flush.
 *
 * ```ts
 * await fireEvent.click(button);
 * await fireEvent.input(input, 'hello');
 * ```
 */
export const fireEvent = {
  async click(el: HTMLElement): Promise<void> {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await tick();
  },

  async input(el: HTMLInputElement | HTMLTextAreaElement, value: string): Promise<void> {
    // Set the value property directly (as a user typing would)
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
      'value',
    )?.set;

    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(el, value);
    } else {
      (el as any).value = value;
    }

    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    await tick();
  },

  async submit(el: HTMLFormElement): Promise<void> {
    el.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await tick();
  },

  async focus(el: HTMLElement): Promise<void> {
    el.focus();
    el.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    await tick();
  },

  async blur(el: HTMLElement): Promise<void> {
    el.blur();
    el.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    await tick();
  },

  async keyDown(el: HTMLElement, key: string, options?: KeyboardEventInit): Promise<void> {
    el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...options }));
    await tick();
  },

  async keyUp(el: HTMLElement, key: string, options?: KeyboardEventInit): Promise<void> {
    el.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, ...options }));
    await tick();
  },
};

// --- Internal helpers ---

/** Wait one microtask for effects to flush */
function tick(): Promise<void> {
  return new Promise((resolve) => queueMicrotask(resolve));
}

/** Walk DOM tree to find the deepest element containing text */
function findByText(root: HTMLElement, text: string): HTMLElement | null {
  // Walk all descendant elements; keep the deepest match
  let best: HTMLElement | null = null;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node: Node | null = walker.nextNode(); // skip root itself on first call

  while (node) {
    if (node instanceof HTMLElement && node.textContent?.includes(text)) {
      best = node; // deeper elements overwrite shallower ones
    }
    node = walker.nextNode();
  }

  // If no descendant matched, check root itself
  if (!best && root.textContent?.includes(text)) {
    best = root;
  }

  return best;
}

function getDirectTextContent(el: HTMLElement): string {
  let text = '';
  for (const child of el.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      text += child.textContent ?? '';
    }
  }
  return text;
}

/** Map of HTML tag names to their implicit ARIA roles */
const IMPLICIT_ROLES: Record<string, string[]> = {
  button: ['button'],
  a: ['link'],
  input: ['textbox', 'checkbox', 'radio', 'spinbutton', 'slider'],
  select: ['combobox', 'listbox'],
  textarea: ['textbox'],
  img: ['img'],
  form: ['form'],
  nav: ['navigation'],
  main: ['main'],
  header: ['banner'],
  footer: ['contentinfo'],
  aside: ['complementary'],
  section: ['region'],
  article: ['article'],
  ul: ['list'],
  ol: ['list'],
  li: ['listitem'],
  table: ['table'],
  th: ['columnheader'],
  td: ['cell'],
  h1: ['heading'],
  h2: ['heading'],
  h3: ['heading'],
  h4: ['heading'],
  h5: ['heading'],
  h6: ['heading'],
};

function findImplicitRole(root: HTMLElement, role: string): HTMLElement | null {
  // Find tags that implicitly have this role
  const tags: string[] = [];
  for (const [tag, roles] of Object.entries(IMPLICIT_ROLES)) {
    if (roles.includes(role)) tags.push(tag);
  }

  if (tags.length === 0) return null;

  const selector = tags.join(', ');
  return root.querySelector<HTMLElement>(selector);
}
