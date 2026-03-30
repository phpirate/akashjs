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
  let result = scopeBlock(css, scopeId, false);
  result = scopeKeyframeReferences(result, scopeId);
  return result;
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
        // Scope the keyframes name to avoid cross-component conflicts
        const scopedPrelude = scopeKeyframeName(trimmedPrelude, scopeId);
        result += prelude.replace(trimmedPrelude, scopedPrelude) + '{' + body + '}';
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
      // Check if body contains nested CSS rules (& selector — CSS nesting)
      const hasNestedRules = body.includes('{');
      if (hasNestedRules) {
        // Recurse into body to scope nested selectors
        result += prelude.replace(trimmedPrelude, scopedSelector) + '{' + scopeBlock(body, scopeId, false) + '}';
      } else {
        result += prelude.replace(trimmedPrelude, scopedSelector) + '{' + body + '}';
      }
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

/** Split a selector list on commas, respecting parentheses (don't split inside :is(), :where(), etc.) */
function splitSelectorList(selectorList: string): string[] {
  const result: string[] = [];
  let current = '';
  let depth = 0;
  for (const ch of selectorList) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ',' && depth === 0) {
      result.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  result.push(current);
  return result;
}

/** Scope a comma-separated selector list. */
function scopeSelectorList(selectorList: string, scopeId: string): string {
  return splitSelectorList(selectorList)
    .map((s: string) => {
      const trimmed = s.trim();
      if (!trimmed) return s;

      if (
        trimmed === ':root' ||
        trimmed === ':host' ||
        trimmed === 'body' ||
        trimmed === 'html' ||
        trimmed === '*' ||
        trimmed.includes(scopeId)
      ) {
        return s;
      }

      return scopeSelector(trimmed, scopeId);
    })
    .join(',');
}

function scopeSelector(selector: string, scopeId: string): string {
  // Handle :global() — if the entire selector is :global(...), unwrap and don't scope
  const globalOnlyMatch = /^:global\((.+)\)$/.exec(selector.trim());
  if (globalOnlyMatch) {
    return globalOnlyMatch[1];
  }

  // Split by combinators, scope the last non-global simple selector
  const parts = selector.split(/(\s*[>+~]\s*|\s+)/);

  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i].trim();
    if (part && !isCombinator(part)) {
      // Check if this part is :global(selector) — unwrap without scoping
      const globalMatch = /^:global\((.+)\)$/.exec(part);
      if (globalMatch) {
        parts[i] = parts[i].replace(part, globalMatch[1]);
        // Scope the previous non-combinator part instead
        continue;
      }

      // Skip if already scoped
      if (part.includes(scopeId)) break;

      // Add scope attribute after the selector
      if (part.includes('::')) {
        // For pseudo-elements, insert before ::
        const [before, after] = part.split('::');
        parts[i] = parts[i].replace(part, `${before}[${scopeId}]::${after}`);
      } else if (part.includes(':') && !part.startsWith(':global')) {
        // Find the first pseudo-class, but skip inside parentheses
        // e.g., .x:is(.a, .b) — insert scope before :is, not inside it
        let colonIdx = -1;
        let parenDepth = 0;
        for (let c = 0; c < part.length; c++) {
          if (part[c] === '(') parenDepth++;
          else if (part[c] === ')') parenDepth--;
          else if (part[c] === ':' && parenDepth === 0) { colonIdx = c; break; }
        }
        if (colonIdx > 0) {
          const before = part.slice(0, colonIdx);
          const after = part.slice(colonIdx);
          parts[i] = parts[i].replace(part, `${before}[${scopeId}]${after}`);
        } else if (colonIdx === 0) {
          // Pseudo-class at start (e.g., :hover) — append scope after
          parts[i] = parts[i].replace(part, `${part}[${scopeId}]`);
        } else {
          parts[i] = parts[i].replace(part, `${part}[${scopeId}]`);
        }
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

/**
 * Scope a @keyframes name by appending the scope hash.
 * @keyframes spin → @keyframes spin-a66f07a
 */
function scopeKeyframeName(prelude: string, scopeId: string): string {
  const hash = scopeId.replace('data-a-', '');
  return prelude.replace(/^(@(?:-webkit-)?keyframes\s+)(\S+)/, `$1$2-${hash}`);
}

/**
 * Collect all @keyframes names in the CSS and build a rewriting map.
 * Then rewrite animation/animation-name references in the output.
 */
export function scopeKeyframeReferences(css: string, scopeId: string): string {
  const hash = scopeId.replace('data-a-', '');
  // Find all keyframe names that were scoped
  const names: string[] = [];
  const kfPattern = /@(?:-webkit-)?keyframes\s+(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = kfPattern.exec(css)) !== null) {
    // The name already has the hash suffix from scopeKeyframeName
    const scopedName = m[1];
    const originalName = scopedName.replace(new RegExp(`-${hash}$`), '');
    if (originalName !== scopedName) {
      names.push(originalName);
    }
  }

  if (names.length === 0) return css;

  // Replace animation and animation-name references
  for (const name of names) {
    // Match the original name in animation/animation-name property values
    // Be careful not to match inside @keyframes declarations themselves
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    css = css.replace(
      new RegExp(`(animation(?:-name)?\\s*:[^;}]*\\b)(${escaped})(\\b)`, 'g'),
      `$1$2-${hash}$3`,
    );
  }

  return css;
}
