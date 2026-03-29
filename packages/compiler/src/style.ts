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
 * Properly handles @-rules like @media, @supports, @keyframes —
 * only selectors inside rule blocks are scoped, never the at-rule itself.
 */
export function scopeStyles(css: string, scopeId: string): string {
  return scopeBlock(css, scopeId, false);
}

/**
 * Recursively scope a CSS block. Parses brace-delimited structure
 * so @media/at-rules are preserved and only selectors are scoped.
 */
function scopeBlock(css: string, scopeId: string, insideKeyframes: boolean): string {
  let result = '';
  let pos = 0;

  while (pos < css.length) {
    // Skip whitespace
    const wsMatch = /^\s+/.exec(css.slice(pos));
    if (wsMatch) {
      result += wsMatch[0];
      pos += wsMatch[0].length;
      if (pos >= css.length) break;
    }

    // Skip comments
    if (css.slice(pos, pos + 2) === '/*') {
      const endComment = css.indexOf('*/', pos + 2);
      if (endComment === -1) {
        result += css.slice(pos);
        break;
      }
      result += css.slice(pos, endComment + 2);
      pos = endComment + 2;
      continue;
    }

    // Closing brace — end of current block
    if (css[pos] === '}') {
      result += '}';
      pos++;
      continue;
    }

    // Find the next opening brace to get the selector/at-rule
    const braceIdx = css.indexOf('{', pos);
    if (braceIdx === -1) {
      // No more blocks — append remaining text
      result += css.slice(pos);
      break;
    }

    const prelude = css.slice(pos, braceIdx);
    const trimmedPrelude = prelude.trim();

    // Find the matching closing brace
    const bodyStart = braceIdx + 1;
    const bodyEnd = findMatchingBrace(css, braceIdx);
    const body = css.slice(bodyStart, bodyEnd);

    if (trimmedPrelude.startsWith('@')) {
      // At-rule
      const atRule = trimmedPrelude.split(/\s/)[0]; // e.g. @media, @keyframes

      if (atRule === '@keyframes' || atRule === '@-webkit-keyframes') {
        // Don't scope inside keyframes — just pass through
        result += prelude + '{' + body + '}';
      } else if (atRule === '@font-face') {
        result += prelude + '{' + body + '}';
      } else {
        // @media, @supports, @layer, etc. — recurse into the body
        result += prelude + '{' + scopeBlock(body, scopeId, false) + '}';
      }
    } else if (insideKeyframes) {
      // Inside @keyframes — don't scope (from, to, percentages)
      result += prelude + '{' + body + '}';
    } else {
      // Regular selector — scope it
      const scopedSelector = scopeSelectorList(trimmedPrelude, scopeId);
      result += prelude.replace(trimmedPrelude, scopedSelector) + '{' + body + '}';
    }

    pos = bodyEnd + 1;
  }

  return result;
}

/** Find the index of the closing brace matching the opening brace at `openIdx`. */
function findMatchingBrace(css: string, openIdx: number): number {
  let depth = 1;
  let pos = openIdx + 1;

  while (pos < css.length && depth > 0) {
    if (css[pos] === '{') depth++;
    else if (css[pos] === '}') depth--;
    if (depth > 0) pos++;
  }

  return pos;
}

/** Scope a comma-separated selector list. */
function scopeSelectorList(selectorList: string, scopeId: string): string {
  return selectorList
    .split(',')
    .map((s: string) => {
      const trimmed = s.trim();
      if (!trimmed) return s;

      if (
        trimmed === ':root' ||
        trimmed === ':host' ||
        trimmed.includes(scopeId)
      ) {
        return s;
      }

      return scopeSelector(trimmed, scopeId);
    })
    .join(',');
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
