/**
 * Document head management.
 *
 * Provides Title, Meta, and Head components for managing
 * <head> content declaratively. SSR-compatible — on the server,
 * collects tags; on the client, directly mutates the DOM.
 *
 * ```ts
 * // In any component:
 * useHead({
 *   title: 'My Page',
 *   meta: [
 *     { name: 'description', content: 'Page description' },
 *     { property: 'og:title', content: 'My Page' },
 *   ],
 *   link: [
 *     { rel: 'canonical', href: 'https://example.com/page' },
 *   ],
 * });
 * ```
 */

import { effect } from './signals.js';
import { onUnmount } from './component.js';

// --- Types ---

export interface HeadConfig {
  /** Document title */
  title?: string;
  /** Title template — use %s as placeholder */
  titleTemplate?: string;
  /** Meta tags */
  meta?: MetaTag[];
  /** Link tags */
  link?: LinkTag[];
  /** Script tags */
  script?: ScriptTag[];
  /** HTML attributes */
  htmlAttrs?: Record<string, string>;
  /** Body attributes */
  bodyAttrs?: Record<string, string>;
}

export interface MetaTag {
  name?: string;
  property?: string;
  httpEquiv?: string;
  content: string;
}

export interface LinkTag {
  rel: string;
  href: string;
  type?: string;
  crossorigin?: string;
}

export interface ScriptTag {
  src?: string;
  type?: string;
  async?: boolean;
  defer?: boolean;
  innerHTML?: string;
}

// --- SSR head collection ---

let ssrHeadTags: HeadConfig[] = [];

/** @internal — collect head tags during SSR */
export function collectSSRHead(): HeadConfig[] {
  const tags = ssrHeadTags;
  ssrHeadTags = [];
  return tags;
}

/** Render collected head tags to HTML string (for SSR) */
export function renderHeadToString(configs: HeadConfig[]): string {
  let html = '';

  // Last title wins
  const title = configs.reduce((t, c) => c.title ?? t, '');
  const titleTemplate = configs.reduce((t, c) => c.titleTemplate ?? t, '');

  if (title) {
    const finalTitle = titleTemplate
      ? titleTemplate.replace('%s', title)
      : title;
    html += `<title>${finalTitle}</title>\n`;
  }

  // Merge all meta tags
  for (const config of configs) {
    for (const meta of config.meta ?? []) {
      html += '  <meta';
      if (meta.name) html += ` name="${meta.name}"`;
      if (meta.property) html += ` property="${meta.property}"`;
      if (meta.httpEquiv) html += ` http-equiv="${meta.httpEquiv}"`;
      html += ` content="${meta.content}"`;
      html += ' />\n';
    }
  }

  // Merge all link tags
  for (const config of configs) {
    for (const link of config.link ?? []) {
      html += `  <link rel="${link.rel}" href="${link.href}"`;
      if (link.type) html += ` type="${link.type}"`;
      html += ' />\n';
    }
  }

  return html;
}

// --- Client-side head management ---

const MANAGED_ATTR = 'data-akash-head';

/**
 * Declaratively manage document head tags.
 * Call inside defineComponent() setup.
 *
 * Tags are automatically cleaned up when the component unmounts.
 * Reactive values (signals) in the config trigger updates.
 */
export function useHead(config: HeadConfig | (() => HeadConfig)): void {
  const getConfig = typeof config === 'function' ? config : () => config;

  // SSR: just collect
  if (typeof document === 'undefined') {
    ssrHeadTags.push(getConfig());
    return;
  }

  const managedElements: Element[] = [];

  const dispose = effect(() => {
    const cfg = getConfig();

    // Clean up previously managed elements
    for (const el of managedElements) {
      el.remove();
    }
    managedElements.length = 0;

    // Title
    if (cfg.title) {
      const title = cfg.titleTemplate
        ? cfg.titleTemplate.replace('%s', cfg.title)
        : cfg.title;
      document.title = title;
    }

    // Meta tags
    for (const meta of cfg.meta ?? []) {
      const el = document.createElement('meta');
      el.setAttribute(MANAGED_ATTR, '');
      if (meta.name) el.setAttribute('name', meta.name);
      if (meta.property) el.setAttribute('property', meta.property);
      if (meta.httpEquiv) el.setAttribute('http-equiv', meta.httpEquiv);
      el.setAttribute('content', meta.content);
      document.head.appendChild(el);
      managedElements.push(el);
    }

    // Link tags
    for (const link of cfg.link ?? []) {
      const el = document.createElement('link');
      el.setAttribute(MANAGED_ATTR, '');
      el.setAttribute('rel', link.rel);
      el.setAttribute('href', link.href);
      if (link.type) el.setAttribute('type', link.type);
      document.head.appendChild(el);
      managedElements.push(el);
    }

    // Script tags
    for (const script of cfg.script ?? []) {
      const el = document.createElement('script');
      el.setAttribute(MANAGED_ATTR, '');
      if (script.src) el.setAttribute('src', script.src);
      if (script.type) el.setAttribute('type', script.type);
      if (script.async) el.setAttribute('async', '');
      if (script.defer) el.setAttribute('defer', '');
      if (script.innerHTML) el.textContent = script.innerHTML;
      document.head.appendChild(el);
      managedElements.push(el);
    }

    // HTML attributes
    if (cfg.htmlAttrs) {
      for (const [key, value] of Object.entries(cfg.htmlAttrs)) {
        document.documentElement.setAttribute(key, value);
      }
    }

    // Body attributes
    if (cfg.bodyAttrs) {
      for (const [key, value] of Object.entries(cfg.bodyAttrs)) {
        document.body.setAttribute(key, value);
      }
    }
  });

  // Cleanup on unmount
  try {
    onUnmount(() => {
      dispose();
      for (const el of managedElements) {
        el.remove();
      }
    });
  } catch {
    // onUnmount may throw if called outside component — that's fine,
    // the effect will just persist until the page unloads
  }
}
