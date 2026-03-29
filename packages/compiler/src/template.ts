/**
 * Template compiler.
 *
 * Transforms JSX-like template content from .akash files into
 * imperative DOM creation code that uses the AkashJS runtime.
 *
 * This is a simplified implementation that handles the core patterns.
 * A production version would use a proper AST parser.
 */

/** Represents a parsed template node */
export interface TemplateNode {
  type: 'element' | 'text' | 'expression' | 'component';
  tag?: string;
  attrs?: Array<{ name: string; value: string; dynamic: boolean }>;
  children?: TemplateNode[];
  content?: string;
  directives?: Directive[];
}

export interface Directive {
  name: string; // 'if', 'for', 'key', 'visible', 'else', 'else-if', 'bind'
  value: string;
  /** Argument for directives like bind:value (arg = 'value') */
  arg?: string;
}

/**
 * Parse template content into a simple AST.
 *
 * Handles:
 * - HTML elements: <div class="foo">...</div>
 * - Self-closing: <input />
 * - Expressions: {count()}
 * - Dynamic attributes: class={expr}
 * - Directives: :if={expr}, :for={item of items()}
 * - Components: <MyComponent prop={value} />
 */
export function parseTemplate(content: string): TemplateNode[] {
  const nodes: TemplateNode[] = [];
  let pos = 0;

  while (pos < content.length) {
    if (content[pos] === '<') {
      // Closing tag — handled by parent parseElement call
      if (content[pos + 1] === '/') break;

      const element = parseElement(content, pos);
      if (element) {
        nodes.push(element.node);
        pos = element.end;
        continue;
      }
    }

    if (content[pos] === '{') {
      const expr = parseExpression(content, pos);
      if (expr) {
        nodes.push(expr.node);
        pos = expr.end;
        continue;
      }
    }

    // Text content — advance at least 1 character to prevent infinite loops
    // (e.g., a stray '<' that doesn't start a valid tag)
    const textEnd = findNextBoundary(content, pos + 1);
    const text = content.slice(pos, textEnd).trim();
    if (text) {
      nodes.push({ type: 'text', content: text });
    }
    pos = textEnd;
  }

  return nodes;
}

function parseElement(
  content: string,
  start: number,
): { node: TemplateNode; end: number } | null {
  // Match opening tag
  const tagMatch = /^<([a-zA-Z][a-zA-Z0-9-]*)/.exec(content.slice(start));
  if (!tagMatch) return null;

  const tag = tagMatch[1];
  let pos = start + tagMatch[0].length;

  // Parse attributes and directives
  const attrs: Array<{ name: string; value: string; dynamic: boolean }> = [];
  const directives: Directive[] = [];

  while (pos < content.length) {
    // Skip whitespace
    const ws = /^\s+/.exec(content.slice(pos));
    if (ws) pos += ws[0].length;

    // End of opening tag
    if (content[pos] === '>' || content.slice(pos, pos + 2) === '/>') break;

    // Parse attribute
    const attr = parseAttribute(content, pos);
    if (attr) {
      if (attr.attr.name.startsWith('bind:')) {
        // bind:value={signal} — two-way binding directive
        directives.push({
          name: 'bind',
          arg: attr.attr.name.slice(5), // e.g., 'value'
          value: attr.attr.value,
        });
      } else if (attr.attr.name.startsWith(':')) {
        directives.push({
          name: attr.attr.name.slice(1), // remove ':'
          value: attr.attr.value,
        });
      } else {
        attrs.push(attr.attr);
      }
      pos = attr.end;
    } else {
      pos++; // skip unrecognized character
    }
  }

  const isComponent = tag[0] === tag[0].toUpperCase();

  // Self-closing
  if (content.slice(pos, pos + 2) === '/>') {
    return {
      node: {
        type: isComponent ? 'component' : 'element',
        tag,
        attrs,
        directives: directives.length > 0 ? directives : undefined,
        children: [],
      },
      end: pos + 2,
    };
  }

  // Skip >
  pos++;

  // Parse children
  const children = parseTemplate(content.slice(pos));
  const childContent = content.slice(pos);

  // Find closing tag
  const closeTag = `</${tag}>`;
  const closeIdx = findClosingTag(content, pos, tag);
  if (closeIdx === -1) {
    // No closing tag found — treat as self-closing
    return {
      node: {
        type: isComponent ? 'component' : 'element',
        tag,
        attrs,
        directives: directives.length > 0 ? directives : undefined,
        children,
      },
      end: content.length,
    };
  }

  // Re-parse children within the bounds of the closing tag
  const innerContent = content.slice(pos, closeIdx);
  const parsedChildren = parseTemplate(innerContent);

  return {
    node: {
      type: isComponent ? 'component' : 'element',
      tag,
      attrs,
      directives: directives.length > 0 ? directives : undefined,
      children: parsedChildren,
    },
    end: closeIdx + closeTag.length,
  };
}

function parseAttribute(
  content: string,
  start: number,
): { attr: { name: string; value: string; dynamic: boolean }; end: number } | null {
  // Match attribute name (including : and bind: prefixes for directives)
  const nameMatch = /^(?:bind:|[:a-zA-Z_])[\w:.-]*/.exec(content.slice(start));
  if (!nameMatch) return null;

  const name = nameMatch[0];
  let pos = start + name.length;

  // No value — boolean attribute
  if (content[pos] !== '=') {
    return { attr: { name, value: 'true', dynamic: false }, end: pos };
  }

  pos++; // skip =

  // Dynamic value: ={expression}
  if (content[pos] === '{') {
    const expr = extractBraced(content, pos);
    if (expr) {
      return {
        attr: { name, value: expr.content, dynamic: true },
        end: expr.end,
      };
    }
  }

  // String value: "..." or '...'
  const quote = content[pos];
  if (quote === '"' || quote === "'") {
    const endQuote = content.indexOf(quote, pos + 1);
    if (endQuote === -1) return null;
    return {
      attr: { name, value: content.slice(pos + 1, endQuote), dynamic: false },
      end: endQuote + 1,
    };
  }

  return null;
}

function parseExpression(
  content: string,
  start: number,
): { node: TemplateNode; end: number } | null {
  const result = extractBraced(content, start);
  if (!result) return null;
  return {
    node: { type: 'expression', content: result.content },
    end: result.end,
  };
}

function extractBraced(
  content: string,
  start: number,
): { content: string; end: number } | null {
  if (content[start] !== '{') return null;

  let depth = 1;
  let pos = start + 1;

  while (pos < content.length && depth > 0) {
    const ch = content[pos];

    if (ch === '"' || ch === "'" || ch === '`') {
      pos = skipString(content, pos) + 1;
      continue;
    }

    if (ch === '{') depth++;
    else if (ch === '}') depth--;

    pos++;
  }

  return {
    content: content.slice(start + 1, pos - 1).trim(),
    end: pos,
  };
}

function skipString(content: string, start: number): number {
  const quote = content[start];
  let pos = start + 1;
  while (pos < content.length) {
    if (content[pos] === '\\') {
      pos += 2;
      continue;
    }
    if (content[pos] === quote) return pos;
    pos++;
  }
  return pos;
}

function findNextBoundary(content: string, start: number): number {
  let pos = start;
  while (pos < content.length) {
    if (content[pos] === '<' || content[pos] === '{') return pos;
    pos++;
  }
  return pos;
}

function findClosingTag(content: string, start: number, tag: string): number {
  const closeTag = `</${tag}>`;
  let depth = 1;
  let pos = start;
  const maxIter = content.length * 2; // safety limit
  let iter = 0;

  while (pos < content.length && iter++ < maxIter) {
    const openIdx = content.indexOf(`<${tag}`, pos);
    const closeIdx = content.indexOf(closeTag, pos);

    if (closeIdx === -1) return -1;

    if (openIdx !== -1 && openIdx < closeIdx) {
      // Find the actual closing > of this open tag, skipping over { } blocks
      const tagEnd = findTagEnd(content, openIdx);
      if (tagEnd !== -1 && content[tagEnd - 1] === '/') {
        // Self-closing — don't increase depth, skip past it
        pos = tagEnd + 1;
      } else if (tagEnd !== -1) {
        depth++;
        pos = tagEnd + 1;
      } else {
        pos = openIdx + 1;
      }
    } else {
      depth--;
      if (depth === 0) return closeIdx;
      pos = closeIdx + 1;
    }
  }

  return -1;
}

/** Find the closing > of an opening tag, skipping over {...} attribute expressions */
function findTagEnd(content: string, tagStart: number): number {
  let pos = tagStart;
  let braceDepth = 0;

  while (pos < content.length) {
    const ch = content[pos];

    if (ch === '{') {
      braceDepth++;
    } else if (ch === '}') {
      braceDepth--;
    } else if (ch === '>' && braceDepth === 0) {
      return pos;
    }

    pos++;
  }

  return -1;
}
