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
  type: 'element' | 'text' | 'expression' | 'component' | 'fragment';
  tag?: string;
  attrs?: Array<{ name: string; value: string; dynamic: boolean }>;
  children?: TemplateNode[];
  content?: string;
  directives?: Directive[];
  /** Spread expressions like {...props} */
  spreads?: string[];
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
      // HTML comment — skip entirely
      if (content.slice(pos, pos + 4) === '<!--') {
        const endComment = content.indexOf('-->', pos + 4);
        pos = endComment === -1 ? content.length : endComment + 3;
        continue;
      }

      // Closing tag or fragment close — handled by parent call
      if (content[pos + 1] === '/') break;

      // Fragment syntax: <>...</>
      if (content[pos + 1] === '>') {
        pos += 2; // skip <>
        const children = parseTemplate(content.slice(pos));
        // Find closing </> — account for nested fragments
        const closeIdx = findFragmentClose(content, pos);
        let parsedChildren: TemplateNode[];
        if (closeIdx === -1) {
          parsedChildren = children;
          pos = content.length;
        } else {
          parsedChildren = parseTemplate(content.slice(pos, closeIdx));
          pos = closeIdx + 3; // skip </>
        }
        nodes.push({ type: 'fragment', children: parsedChildren });
        continue;
      }

      const element = parseElement(content, pos);
      if (element) {
        nodes.push(element.node);
        pos = element.end;
        continue;
      }
    }

    if (content[pos] === '{') {
      // Block syntax: {#if}, {#each}, {:else}, {:else if}, {:empty}, {/if}, {/each}
      const blockResult = parseBlockSyntax(content, pos);
      if (blockResult) {
        nodes.push(blockResult.node);
        pos = blockResult.end;
        continue;
      }

      const expr = parseExpression(content, pos);
      if (expr) {
        // Skip JSX comments: {/* ... */}
        const trimmedExpr = (expr.node.content ?? '').trim();
        if (trimmedExpr.startsWith('/*') && trimmedExpr.endsWith('*/')) {
          pos = expr.end;
          continue;
        }
        nodes.push(expr.node);
        pos = expr.end;
        continue;
      }
    }

    // Text content — advance at least 1 character to prevent infinite loops
    // (e.g., a stray '<' that doesn't start a valid tag)
    const textEnd = findNextBoundary(content, pos + 1);
    const rawText = content.slice(pos, textEnd);
    const text = rawText.trim();
    if (text) {
      nodes.push({ type: 'text', content: text });
    } else if (rawText.includes(' ') && nodes.length > 0 && textEnd < content.length && content[textEnd] === '{') {
      // Preserve whitespace between inline expressions (e.g., {a()} {b()})
      nodes.push({ type: 'text', content: ' ' });
    }
    pos = textEnd;
  }

  return nodes;
}

/**
 * Parse block syntax and transform to equivalent template content.
 *
 * {#if expr}...{:else if expr}...{:else}...{/if}
 *   → <Show when={expr}>...</Show> with nested fallbacks
 *
 * {#each list as item (key)}...{:empty}...{/each}
 *   → <For each={list} key={(item) => key}>{(item) => ...}</For>
 */
function parseBlockSyntax(
  content: string,
  start: number,
): { node: TemplateNode; end: number } | null {
  const slice = content.slice(start);

  // {#if expr}
  const ifMatch = /^\{#if\s+(.+?)\}/.exec(slice);
  if (ifMatch) {
    const condition = ifMatch[1].trim();
    let pos = start + ifMatch[0].length;
    const branches = extractIfBranches(content, pos);
    pos = branches.end;
    return { node: buildShowChain(condition, branches), end: pos };
  }

  // {#each list as item (key)} or {#each list as (item, index) (key)}
  const eachMatch = /^\{#each\s+(.+?)\s+as\s+(\([^)]+\)|\w+)(?:\s*\((.+?)\))?\s*\}/.exec(slice);
  if (eachMatch) {
    const listExpr = eachMatch[1].trim();
    const itemVar = eachMatch[2].trim();
    const keyExpr = eachMatch[3]?.trim();
    let pos = start + eachMatch[0].length;
    const { body, emptyBody, end } = extractEachBranches(content, pos);
    pos = end;

    const bodyNodes = parseTemplate(body);

    // Build children as expression: (item) => <compiled children>
    // Wrap the parsed children in an expression node for the For component
    const childExpr: TemplateNode = {
      type: 'expression',
      content: `(${itemVar}) => null`, // placeholder
    };

    const forAttrs: Array<{ name: string; value: string; dynamic: boolean }> = [
      { name: 'each', value: listExpr, dynamic: true },
      { name: 'key', value: `(${itemVar}) => ${keyExpr ?? itemVar}`, dynamic: true },
    ];

    const forNode: TemplateNode = {
      type: 'component',
      tag: 'For',
      attrs: forAttrs,
      children: bodyNodes.length > 0 ? bodyNodes : undefined,
    };
    // Store item variable for codegen to use as children callback param
    (forNode as any)._itemVar = itemVar;

    if (emptyBody !== null) {
      const emptyNodes = parseTemplate(emptyBody);
      // Wrap in Show: when list has items show For, else show empty content
      const showNode: TemplateNode = {
        type: 'component',
        tag: 'Show',
        attrs: [{ name: 'when', value: `(${listExpr}).length > 0`, dynamic: true }],
        children: [forNode],
      };
      // TODO: attach emptyNodes as fallback prop
      return { node: showNode, end: pos };
    }

    return { node: forNode, end: pos };
  }

  return null;
}

interface IfBranches {
  trueBody: string;
  elseIfs: Array<{ condition: string; body: string }>;
  elseBody: string | null;
  end: number;
}

function extractIfBranches(content: string, start: number): IfBranches {
  let pos = start;
  let depth = 1;
  let sectionStart = pos;
  const trueBody: string[] = [];
  const elseIfs: Array<{ condition: string; body: string }> = [];
  let elseBody: string | null = null;
  let currentTarget = trueBody;

  while (pos < content.length && depth > 0) {
    const rest = content.slice(pos);

    if (/^\{#if\s/.test(rest)) { depth++; pos++; continue; }

    if (rest.startsWith('{/if}')) {
      depth--;
      if (depth === 0) {
        if (currentTarget === trueBody) {
          // no else branches
        }
        pos += 5;
        break;
      }
      currentTarget.push(content[pos]);
      pos++;
      continue;
    }

    if (depth === 1) {
      const elseIfMatch = /^\{:else\s+if\s+(.+?)\}/.exec(rest);
      if (elseIfMatch) {
        elseIfs.push({ condition: elseIfMatch[1].trim(), body: '' });
        pos += elseIfMatch[0].length;
        currentTarget = [];
        (elseIfs[elseIfs.length - 1] as any)._ref = currentTarget;
        continue;
      }
      if (rest.startsWith('{:else}')) {
        pos += 7;
        currentTarget = [];
        elseBody = ''; // mark as present
        (elseBody as any); // placeholder
        // collect until {/if}
        const elseStart = pos;
        let d = 1;
        while (pos < content.length && d > 0) {
          if (/^\{#if\s/.test(content.slice(pos))) d++;
          if (content.slice(pos, pos + 5) === '{/if}') {
            d--;
            if (d === 0) { pos += 5; break; }
          }
          pos++;
        }
        elseBody = content.slice(elseStart, pos - 5);
        break;
      }
    }

    currentTarget.push(content[pos]);
    pos++;
  }

  // Collect else-if bodies
  for (const ei of elseIfs) {
    if ((ei as any)._ref) {
      ei.body = ((ei as any)._ref as string[]).join('');
      delete (ei as any)._ref;
    }
  }

  return {
    trueBody: trueBody.join(''),
    elseIfs,
    elseBody,
    end: pos,
  };
}

function buildShowChain(condition: string, branches: IfBranches): TemplateNode {
  const trueChildren = parseTemplate(branches.trueBody);

  const attrs: Array<{ name: string; value: string; dynamic: boolean }> = [
    { name: 'when', value: condition, dynamic: true },
  ];

  // Build fallback chain: else-if → else-if → ... → else
  let fallbackNode: TemplateNode | null = null;

  if (branches.elseBody !== null) {
    const elseChildren = parseTemplate(branches.elseBody);
    if (elseChildren.length === 1) {
      fallbackNode = elseChildren[0];
    } else if (elseChildren.length > 1) {
      fallbackNode = { type: 'element', tag: 'span', children: elseChildren };
    }
  }

  // Build else-if chain from last to first (each wraps the next as its fallback)
  for (let i = branches.elseIfs.length - 1; i >= 0; i--) {
    const ei = branches.elseIfs[i];
    const eiChildren = parseTemplate(ei.body);
    const eiAttrs: Array<{ name: string; value: string; dynamic: boolean }> = [
      { name: 'when', value: ei.condition, dynamic: true },
    ];
    if (fallbackNode) {
      // Encode the fallback as a __blockFallback marker for the codegen
      eiAttrs.push({ name: '__blockFallback', value: '__fallback__', dynamic: true });
    }
    const eiNode: TemplateNode = {
      type: 'component',
      tag: 'Show',
      attrs: eiAttrs,
      children: eiChildren.length > 0 ? eiChildren : undefined,
      // Stash the fallback node in a temporary field for codegen to pick up
      _fallbackNodes: fallbackNode ? [fallbackNode] : undefined,
    } as any;
    fallbackNode = eiNode;
  }

  // Stash fallback on the outermost Show for codegen
  const node: TemplateNode = {
    type: 'component',
    tag: 'Show',
    attrs,
    children: trueChildren.length > 0 ? trueChildren : undefined,
  };
  if (fallbackNode) {
    (node as any)._fallbackNodes = [fallbackNode];
  }

  return node;
}

function extractEachBranches(content: string, start: number): { body: string; emptyBody: string | null; end: number } {
  let pos = start;
  let depth = 1;
  const body: string[] = [];
  let emptyBody: string | null = null;

  while (pos < content.length && depth > 0) {
    const rest = content.slice(pos);
    if (/^\{#each\s/.test(rest)) depth++;

    if (rest.startsWith('{/each}')) {
      depth--;
      if (depth === 0) { pos += 7; break; }
    }

    if (depth === 1 && rest.startsWith('{:empty}')) {
      pos += 8;
      const emptyStart = pos;
      let d = 1;
      while (pos < content.length && d > 0) {
        if (/^\{#each\s/.test(content.slice(pos))) d++;
        if (content.slice(pos, pos + 7) === '{/each}') {
          d--;
          if (d === 0) { pos += 7; break; }
        }
        pos++;
      }
      emptyBody = content.slice(emptyStart, pos - 7);
      break;
    }

    body.push(content[pos]);
    pos++;
  }

  return { body: body.join(''), emptyBody, end: pos };
}

function parseElement(
  content: string,
  start: number,
): { node: TemplateNode; end: number } | null {
  // Match opening tag
  const tagMatch = /^<([a-zA-Z][a-zA-Z0-9-]*)/.exec(content.slice(start));
  if (!tagMatch) return null;

  const tag = tagMatch[1];

  // Security: strip <script> tags from templates and warn
  if (tag === 'script') {
    console.warn('[AkashJS] <script> tags are not allowed in templates and will be stripped. Move script code to the <script> block.');
    const closeIdx = content.indexOf('</script>', start);
    const end = closeIdx === -1 ? content.length : closeIdx + '</script>'.length;
    return { node: { type: 'text', content: '' }, end };
  }

  let pos = start + tagMatch[0].length;

  // Parse attributes and directives
  const attrs: Array<{ name: string; value: string; dynamic: boolean }> = [];
  const directives: Directive[] = [];
  const spreads: string[] = [];

  while (pos < content.length) {
    // Skip whitespace
    const ws = /^\s+/.exec(content.slice(pos));
    if (ws) pos += ws[0].length;

    // End of opening tag
    if (content[pos] === '>' || content.slice(pos, pos + 2) === '/>') break;

    // Spread: {...expr}
    if (content.slice(pos, pos + 4) === '{...') {
      const expr = extractBraced(content, pos);
      if (expr) {
        // expr.content is "...something" — strip the leading "..."
        spreads.push(expr.content.slice(3).trim());
        pos = expr.end;
        continue;
      }
    }

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
      } else if (attr.attr.name.startsWith('class:')) {
        // class:active={expr} — conditional class toggle directive
        directives.push({
          name: 'class',
          arg: attr.attr.name.slice(6), // e.g., 'active'
          value: attr.attr.value,
        });
      } else if (attr.attr.name.startsWith(':')) {
        directives.push({
          name: attr.attr.name.slice(1), // remove ':'
          value: attr.attr.value,
        });
      } else {
        // Merge duplicate class/className attributes
        const name = attr.attr.name;
        if (name === 'class' || name === 'className') {
          const existing = attrs.find(a => a.name === 'class' || a.name === 'className');
          if (existing) {
            if (existing.dynamic && attr.attr.dynamic) {
              existing.value = `(${existing.value}) + ' ' + (${attr.attr.value})`;
            } else if (existing.dynamic) {
              existing.value = `(${existing.value}) + ' ${attr.attr.value}'`;
            } else if (attr.attr.dynamic) {
              existing.value = `'${existing.value} ' + (${attr.attr.value})`;
              existing.dynamic = true;
            } else {
              existing.value = `${existing.value} ${attr.attr.value}`;
            }
            pos = attr.end;
            continue;
          }
        }
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
        spreads: spreads.length > 0 ? spreads : undefined,
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
  const VOID_ELEMENTS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr',
  ]);
  if (closeIdx === -1) {
    // Warn about unclosed non-void elements
    if (!VOID_ELEMENTS.has(tag) && !isComponent) {
      console.warn(`[AkashJS] Unclosed <${tag}> tag in template. Add </${tag}> or use self-closing <${tag} />.`);
    }
    return {
      node: {
        type: isComponent ? 'component' : 'element',
        tag,
        attrs,
        directives: directives.length > 0 ? directives : undefined,
        spreads: spreads.length > 0 ? spreads : undefined,
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
      spreads: spreads.length > 0 ? spreads : undefined,
      children: parsedChildren,
    },
    end: closeIdx + closeTag.length,
  };
}

function parseAttribute(
  content: string,
  start: number,
): { attr: { name: string; value: string; dynamic: boolean }; end: number } | null {
  // Match attribute name (including : and bind: prefixes, and |modifier suffixes)
  const nameMatch = /^(?:bind:|[:a-zA-Z_])[\w:.\-|]*/.exec(content.slice(start));
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

/** Find the closing </> for a fragment, handling nested fragments */
function findFragmentClose(content: string, start: number): number {
  let depth = 1;
  let pos = start;

  while (pos < content.length) {
    // Nested fragment open: <>
    if (content[pos] === '<' && content[pos + 1] === '>') {
      depth++;
      pos += 2;
      continue;
    }
    // Fragment close: </>
    if (content[pos] === '<' && content[pos + 1] === '/' && content[pos + 2] === '>') {
      depth--;
      if (depth === 0) return pos;
      pos += 3;
      continue;
    }
    pos++;
  }

  return -1;
}
