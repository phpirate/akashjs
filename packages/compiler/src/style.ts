/**
 * Scoped CSS processor.
 *
 * Adds a unique data attribute to selectors so styles are scoped
 * to the component. Same approach as Vue and Svelte.
 */

import { createHash } from 'crypto';

/** Generate a scope ID from a filename */
export function generateScopeId(filename: string): string {
  const hash = createHash('md5').update(filename).digest('hex').slice(0, 6);
  return `data-a-${hash}`;
}

/**
 * Rewrite CSS selectors to include the scope attribute.
 *
 * .counter { } → .counter[data-a-x7k3f] { }
 *
 * This is a simplified implementation that handles the most common cases.
 * A production version would use a proper CSS parser like PostCSS.
 */
export function scopeStyles(css: string, scopeId: string): string {
  return css.replace(
    // Match selectors before { blocks
    /([^{}@/]+?)(\s*\{)/g,
    (match, selector: string, brace: string) => {
      // Don't scope @-rules like @keyframes, @media, @font-face
      if (selector.trim().startsWith('@')) {
        return match;
      }

      // Scope each comma-separated selector
      const scopedSelectors = selector
        .split(',')
        .map((s: string) => {
          const trimmed = s.trim();
          if (!trimmed) return s;

          // Don't scope :root, :host, or selectors that are already scoped
          if (
            trimmed === ':root' ||
            trimmed === ':host' ||
            trimmed.includes(scopeId)
          ) {
            return s;
          }

          // Find the first element/class/id selector and add the scope attribute
          // Handle combinators (>, +, ~, space) by scoping the last part
          return scopeSelector(trimmed, scopeId);
        })
        .join(',');

      return scopedSelectors + brace;
    },
  );
}

function scopeSelector(selector: string, scopeId: string): string {
  // Split by combinators, scope the last simple selector
  const parts = selector.split(/(\s*[>+~]\s*|\s+)/);

  // Find the last non-empty, non-combinator part
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i].trim();
    if (part && !isCombinator(part)) {
      // Add scope attribute after the selector
      if (part.includes('::')) {
        // For pseudo-elements, insert before ::
        const [before, after] = part.split('::');
        parts[i] = parts[i].replace(part, `${before}[${scopeId}]::${after}`);
      } else if (part.includes(':')) {
        // For pseudo-classes, insert before :
        const colonIdx = part.indexOf(':');
        const before = part.slice(0, colonIdx);
        const after = part.slice(colonIdx);
        parts[i] = parts[i].replace(part, `${before}[${scopeId}]${after}`);
      } else {
        parts[i] = parts[i].replace(part, `${part}[${scopeId}]`);
      }
      break;
    }
  }

  return parts.join('');
}

function isCombinator(s: string): boolean {
  return s === '>' || s === '+' || s === '~';
}
