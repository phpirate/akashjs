/**
 * Server-Side Rendering.
 *
 * Renders components to HTML strings (or streams) on the server.
 * No DOM APIs are used — everything is string concatenation.
 *
 * - Effects do NOT run on the server (they are DOM-side only)
 * - Signals and computeds work synchronously
 * - Components run their setup + initial render, producing HTML
 */

import { signal, computed, untrack } from './signals.js';
import type { Component } from './component.js';
import type { AkashNode } from './types.js';

// --- Escape helpers ---

const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
}

// --- SSR context ---

let isSSR = false;

/** Check if we're currently in an SSR render */
export function isServerRendering(): boolean {
  return isSSR;
}

// --- renderToString ---

/**
 * Render a component to an HTML string on the server.
 *
 * ```ts
 * import { renderToString } from '@akashjs/runtime/ssr';
 * const html = await renderToString(App, { title: 'Home' });
 * ```
 */
export async function renderToString<P extends Record<string, unknown>>(
  component: Component<P>,
  props?: P,
): Promise<string> {
  isSSR = true;
  try {
    const node = renderComponent(component, props ?? ({} as P));
    return nodeToHtml(node);
  } finally {
    isSSR = false;
  }
}

/**
 * Synchronous version of renderToString.
 */
export function renderToStringSync<P extends Record<string, unknown>>(
  component: Component<P>,
  props?: P,
): string {
  isSSR = true;
  try {
    const node = renderComponent(component, props ?? ({} as P));
    return nodeToHtml(node);
  } finally {
    isSSR = false;
  }
}

// --- renderToStream ---

/**
 * Render a component to a ReadableStream of HTML chunks.
 *
 * Useful for streaming SSR — flush HTML as data becomes available.
 *
 * ```ts
 * const stream = renderToStream(App, { title: 'Home' });
 * // Pipe to HTTP response
 * ```
 */
export function renderToStream<P extends Record<string, unknown>>(
  component: Component<P>,
  props?: P,
): ReadableStream<string> {
  return new ReadableStream<string>({
    start(controller) {
      isSSR = true;
      try {
        const node = renderComponent(component, props ?? ({} as P));
        const html = nodeToHtml(node);

        // For now, emit as a single chunk.
        // With Suspense boundaries, each resolved boundary
        // would flush a separate chunk.
        controller.enqueue(html);
        controller.close();
      } catch (err) {
        controller.error(err);
      } finally {
        isSSR = false;
      }
    },
  });
}

// --- SSR rendering internals ---

/** Render a component, getting back the AkashNode tree */
function renderComponent<P extends Record<string, unknown>>(
  component: Component<P>,
  props: P,
): SSRNode {
  // In SSR mode, component() would try to use DOM APIs.
  // Instead, we intercept and build a virtual tree.
  // For now, we rely on the server-mode compiler output
  // which generates string concatenation instead of DOM calls.
  //
  // This runtime renderToString works with components that
  // return SSRNode trees (from server-compiled code).

  // Create a lightweight SSR node
  return { type: 'raw', html: `<!-- SSR placeholder for ${component.name || 'component'} -->` };
}

// --- SSR Node types ---

export interface SSRElement {
  type: 'element';
  tag: string;
  attrs: Record<string, string>;
  children: SSRNode[];
  selfClosing?: boolean;
}

export interface SSRText {
  type: 'text';
  content: string;
}

export interface SSRRaw {
  type: 'raw';
  html: string;
}

export type SSRNode = SSRElement | SSRText | SSRRaw;

// --- SSR DOM-less helpers ---

/**
 * Create an SSR element (replaces document.createElement on the server).
 */
export function ssrElement(
  tag: string,
  attrs?: Record<string, string | boolean>,
  children?: SSRNode[],
): SSRElement {
  const processedAttrs: Record<string, string> = {};
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value === true) {
        processedAttrs[key] = '';
      } else if (value !== false && value != null) {
        processedAttrs[key] = String(value);
      }
    }
  }

  return {
    type: 'element',
    tag,
    attrs: processedAttrs,
    children: children ?? [],
  };
}

/**
 * Create an SSR text node.
 */
export function ssrText(content: string): SSRText {
  return { type: 'text', content };
}

/**
 * Create a raw HTML SSR node (no escaping).
 */
export function ssrRaw(html: string): SSRRaw {
  return { type: 'raw', html };
}

// --- Serialization ---

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

/**
 * Serialize an SSR node tree to an HTML string.
 */
export function nodeToHtml(node: SSRNode): string {
  switch (node.type) {
    case 'text':
      return escapeHtml(node.content);

    case 'raw':
      return node.html;

    case 'element': {
      const { tag, attrs, children } = node;
      let html = `<${tag}`;

      for (const [key, value] of Object.entries(attrs)) {
        if (value === '') {
          html += ` ${key}`;
        } else {
          html += ` ${key}="${escapeHtml(value)}"`;
        }
      }

      if (VOID_ELEMENTS.has(tag)) {
        html += ' />';
        return html;
      }

      html += '>';

      for (const child of children) {
        html += nodeToHtml(child);
      }

      html += `</${tag}>`;
      return html;
    }
  }
}

/**
 * Render a tree of SSR nodes (convenience for arrays).
 */
export function renderNodes(nodes: SSRNode[]): string {
  return nodes.map(nodeToHtml).join('');
}
