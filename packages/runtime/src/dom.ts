/**
 * Direct DOM rendering runtime.
 *
 * No virtual DOM. The compiler generates calls to these helpers.
 * Signal reads inside templates become fine-grained effects that
 * update only the specific DOM node that changed.
 */

import { effect } from './signals.js';
import type { AkashNode } from './types.js';

// --- DOM creation helpers (used by compiler output) ---

/** Create an element and optionally set static attributes */
export function createElement(
  tag: string,
  attrs?: Record<string, unknown>,
): HTMLElement {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      setProperty(el, key, value);
    }
  }
  return el;
}

/** Create a text node */
export function createText(value: string): Text {
  return document.createTextNode(value);
}

/** Clone a template element for static structure */
export function cloneTemplate(html: string): DocumentFragment {
  const template = document.createElement('template');
  template.innerHTML = html;
  return template.content.cloneNode(true) as DocumentFragment;
}

// --- Property/attribute setting ---

export function setProperty(el: HTMLElement, key: string, value: unknown): void {
  if (key === 'class' || key === 'className') {
    el.className = value as string;
  } else if (key === 'style' && typeof value === 'object' && value !== null) {
    Object.assign(el.style, value);
  } else if (key === 'innerHTML') {
    el.innerHTML = value as string;
  } else if (key === 'ref') {
    // Handled separately by component system
  } else if (key.startsWith('on')) {
    const event = key.slice(2).toLowerCase();
    el.addEventListener(event, value as EventListener);
  } else if (key in el) {
    (el as Record<string, unknown>)[key] = value;
  } else if (value === false || value == null) {
    el.removeAttribute(key);
  } else {
    el.setAttribute(key, value === true ? '' : String(value));
  }
}

// --- Reactive binding (used by compiler for dynamic expressions) ---

/** Bind a reactive expression to a text node's content */
export function bindText(node: Text, fn: () => unknown): () => void {
  return effect(
    () => {
      node.textContent = String(fn());
    },
    { render: true },
  );
}

/** Bind a reactive expression to an element's attribute/property */
export function bindProperty(
  el: HTMLElement,
  key: string,
  fn: () => unknown,
): () => void {
  return effect(
    () => {
      setProperty(el, key, fn());
    },
    { render: true },
  );
}

/** Bind a reactive expression to an element's visibility (display) */
export function bindVisible(el: HTMLElement, fn: () => boolean): () => void {
  return effect(
    () => {
      el.style.display = fn() ? '' : 'none';
    },
    { render: true },
  );
}

// --- Conditional rendering ---

/** Anchor node type for marking insertion points */
type Anchor = Comment;

function createAnchor(label = ''): Anchor {
  return document.createComment(label);
}

interface ConditionalBlock {
  nodes: Node[];
  dispose: (() => void) | null;
}

/**
 * Render a conditional block. Swaps DOM fragments based on a reactive
 * condition. Used by the compiler for :if directives and <Show>.
 */
export function renderConditional(
  parent: Node,
  anchor: Node,
  condition: () => boolean,
  trueBranch: () => Node,
  falseBranch?: () => Node,
): () => void {
  let current: ConditionalBlock | null = null;

  const dispose = effect(
    () => {
      const value = condition();

      // Remove old nodes
      if (current) {
        for (const node of current.nodes) {
          try { node.parentNode?.removeChild(node); } catch {}
        }
        current.dispose?.();
        current = null;
      }

      // Insert new nodes — use anchor.parentNode since the anchor may have
      // moved from the initial DocumentFragment into the real DOM
      const branch = value ? trueBranch : falseBranch;
      const liveParent = anchor.parentNode;
      if (branch && liveParent) {
        const fragment = branch();
        const nodes = fragment instanceof DocumentFragment
          ? Array.from(fragment.childNodes)
          : [fragment];
        for (const node of nodes) {
          liveParent.insertBefore(node, anchor);
        }
        current = { nodes, dispose: null };
      }
    },
    { render: true },
  );

  return () => {
    dispose();
    if (current) {
      for (const node of current.nodes) {
        try { node.parentNode?.removeChild(node); } catch {}
      }
      current.dispose?.();
    }
  };
}

// --- List rendering ---

interface ListItem<T> {
  key: unknown;
  value: T;
  nodes: Node[];
  dispose: (() => void) | null;
}

/**
 * Render a reactive list with keyed reconciliation.
 * Used by the compiler for :for directives and <For>.
 */
export function renderList<T>(
  parent: Node,
  anchor: Node,
  items: () => T[],
  keyFn: (item: T, index: number) => unknown,
  renderItem: (item: T, index: number) => Node,
): () => void {
  let currentItems: ListItem<T>[] = [];

  const dispose = effect(
    () => {
      const newData = items();
      const newItems: ListItem<T>[] = [];
      const oldMap = new Map<unknown, ListItem<T>>();

      for (const item of currentItems) {
        oldMap.set(item.key, item);
      }

      // Build new list, reuse existing DOM nodes when keys match
      for (let i = 0; i < newData.length; i++) {
        const data = newData[i];
        const key = keyFn(data, i);
        const existing = oldMap.get(key);

        if (existing) {
          oldMap.delete(key);
          existing.value = data;
          newItems.push(existing);
        } else {
          const fragment = renderItem(data, i);
          const nodes = fragment instanceof DocumentFragment
            ? Array.from(fragment.childNodes)
            : [fragment];
          newItems.push({ key, value: data, nodes, dispose: null });
        }
      }

      // Remove items that are no longer in the list
      for (const item of oldMap.values()) {
        for (const node of item.nodes) {
          if (node.parentNode) node.parentNode.removeChild(node);
        }
        item.dispose?.();
      }

      // Reconcile DOM order — use anchor.parentNode since anchor may have
      // moved from the initial DocumentFragment into the real DOM
      const liveParent = anchor.parentNode;
      if (liveParent) {
        for (const item of newItems) {
          for (const node of item.nodes) {
            liveParent.insertBefore(node, anchor);
          }
        }
      }

      currentItems = newItems;
    },
    { render: true },
  );

  return () => {
    dispose();
    for (const item of currentItems) {
      for (const node of item.nodes) {
        if (node.parentNode) node.parentNode.removeChild(node);
      }
      item.dispose?.();
    }
    currentItems = [];
  };
}

// --- Built-in control flow components ---

/** Props for the <Show> component */
export interface ShowProps<T> {
  when: (() => T | null | undefined | false) | T | null | undefined | false;
  fallback?: () => AkashNode;
  children: (value: T) => AkashNode;
}

/**
 * <Show> component — conditionally renders children with type narrowing.
 * The children callback receives the non-null/undefined value.
 * `when` can be a reactive getter or a static value.
 */
export function Show<T>(props: ShowProps<T>): Node {
  const anchor = createAnchor('show');
  const container = document.createDocumentFragment();
  container.appendChild(anchor);

  // Resolve when — may be a getter (from compiler) or a static value
  const getWhen = typeof props.when === 'function'
    ? props.when as () => T | null | undefined | false
    : () => props.when as T | null | undefined | false;

  renderConditional(
    container,
    anchor,
    () => !!getWhen(),
    () => nodeToDOM(props.children(getWhen() as T)),
    props.fallback ? () => nodeToDOM(props.fallback!()) : undefined,
  );

  return container;
}

/** Props for the <For> component */
export interface ForProps<T> {
  each: (() => T[]) | T[];
  key: (item: T) => unknown;
  children: (item: T, index: number) => AkashNode;
}

/**
 * <For> component — renders a list with keyed reconciliation.
 * `each` can be a reactive getter or a static array.
 */
export function For<T>(props: ForProps<T>): Node {
  const anchor = createAnchor('for');
  const container = document.createDocumentFragment();
  container.appendChild(anchor);

  // Resolve each — may be a getter (from compiler) or a static array
  const getEach = typeof props.each === 'function'
    ? props.each as () => T[]
    : () => props.each as T[];

  renderList(
    container,
    anchor,
    getEach,
    props.key,
    (item, index) => nodeToDOM(props.children(item, index)),
  );

  return container;
}

// --- Helpers ---

/** Convert an AkashNode to a DOM Node */
export function nodeToDOM(node: AkashNode): Node {
  if (node == null || typeof node === 'boolean') {
    return document.createTextNode('');
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return document.createTextNode(String(node));
  }
  if (node instanceof Node) {
    return node;
  }
  if (Array.isArray(node)) {
    const fragment = document.createDocumentFragment();
    for (const child of node) {
      fragment.appendChild(nodeToDOM(child));
    }
    return fragment;
  }
  return document.createTextNode(String(node));
}

/** Insert a node into a parent before an anchor */
export function insert(parent: Node, node: AkashNode, anchor?: Node): void {
  const domNode = nodeToDOM(node);
  if (anchor) {
    parent.insertBefore(domNode, anchor);
  } else {
    parent.appendChild(domNode);
  }
}
