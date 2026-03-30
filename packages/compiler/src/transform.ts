/**
 * Code generator.
 *
 * Transforms a parsed .akash SFC into JavaScript that uses
 * the AkashJS runtime. The output is a defineComponent() call
 * with imperative DOM creation code.
 */

import type { ParsedSFC, CompileOptions, CompileResult } from './types.js';
import { parseTemplate, type TemplateNode } from './template.js';
import { scopeStyles, generateScopeId } from './style.js';

export function transform(sfc: ParsedSFC, options: CompileOptions = {}): CompileResult {
  const scopeId = options.scopeId ?? (options.filename ? generateScopeId(options.filename) : undefined);
  const imports = new Set<string>();
  const runtimeImports = new Set<string>();

  // Always need defineComponent
  runtimeImports.add('defineComponent');

  // Analyze script for auto-imports
  const script = sfc.script?.content ?? '';
  const template = sfc.template?.content ?? '';
  detectAutoImports(script, template, runtimeImports);

  const isServer = options.mode === 'server';

  // Parse template
  let templateCode = '';
  if (sfc.template) {
    const nodes = parseTemplate(sfc.template.content);
    if (isServer) {
      templateCode = generateServerRenderBody(nodes, runtimeImports, scopeId);
    } else {
      templateCode = generateRenderBody(nodes, runtimeImports, scopeId);
    }
  }

  // Build output
  let code = '';

  // Runtime imports
  if (runtimeImports.size > 0) {
    code += `import { ${[...runtimeImports].join(', ')} } from '@akashjs/runtime';\n`;
  }

  // User script (with Props interface extracted)
  const { cleanScript, propsInterface } = extractPropsInterface(script);

  // Separate user imports from the rest of the script
  const { userImports, bodyScript } = extractUserImports(cleanScript);

  // Hoist user imports to top level
  if (userImports.length > 0) {
    code += userImports.join('\n') + '\n';
  }

  // Generate the component
  const generics = propsInterface ? `<${propsInterface}>` : '';

  code += '\n';
  code += `export default defineComponent${generics}((ctx) => {\n`;

  // Inject props destructuring if the script uses `props`
  if (script.includes('props')) {
    code += `  const props = ctx.props;\n`;
  }

  // Include user script body (without imports, indented)
  if (bodyScript.trim()) {
    const indented = bodyScript
      .trim()
      .split('\n')
      .map((line) => `  ${line}`)
      .join('\n');
    code += `${indented}\n`;
  }

  code += '\n';
  code += `  return () => {\n`;
  code += templateCode;
  code += `  };\n`;
  code += `});\n`;

  // Process CSS
  let css: string | undefined;
  if (sfc.style) {
    css = sfc.style.scoped && scopeId
      ? scopeStyles(sfc.style.content, scopeId)
      : sfc.style.content;
  }

  return { code, css };
}

/** Check if a value is already a function expression (arrow or function keyword) */
function isAlreadyFunction(value: string): boolean {
  const trimmed = value.trim();
  // Arrow function: () => ..., (x) => ..., x => ...
  if (/^(?:\([^)]*\)|[a-zA-Z_$]\w*)\s*=>/.test(trimmed)) return true;
  // Function keyword
  if (/^function[\s(]/.test(trimmed)) return true;
  return false;
}

/**
 * Check if a dynamic expression contains reactive reads (function calls)
 * that need getter wrapping for reactivity.
 *
 * Static values like [...], {...}, "...", 42, true, plain identifiers
 * should NOT be wrapped — only expressions containing () calls.
 */
function needsReactiveWrapper(value: string): boolean {
  const trimmed = value.trim();

  // Literal array or object — static even if dynamic attribute
  if (/^\[/.test(trimmed) && !trimmed.includes('(')) return false;
  if (/^\{/.test(trimmed) && !trimmed.includes('(')) return false;

  // String/number/boolean literals
  if (/^["'`]/.test(trimmed)) return false;
  if (/^\d/.test(trimmed)) return false;
  if (trimmed === 'true' || trimmed === 'false' || trimmed === 'null' || trimmed === 'undefined') return false;

  // Template literal without function calls
  if (trimmed.startsWith('`') && !trimmed.includes('(')) return false;

  // Contains a function call — needs wrapping for reactivity
  // Matches: foo(), foo.bar(), foo()?.bar, etc.
  if (/\w\(/.test(trimmed)) return true;

  // Plain identifier (variable reference) — no call, no reactivity needed
  if (/^[a-zA-Z_$][\w$.]*$/.test(trimmed)) return false;

  // Property access without calls — static
  if (!trimmed.includes('(')) return false;

  return true;
}

/** Detect which runtime APIs are used in script/template and need auto-importing */
function detectAutoImports(script: string, template: string, imports: Set<string>): void {
  // APIs that may appear in the script block
  const scriptApis = [
    'signal', 'computed', 'effect', 'batch', 'untrack',
    'onMount', 'onUnmount', 'onError', 'ref',
    'createContext', 'provide', 'inject',
    'Show', 'For',
  ];

  for (const api of scriptApis) {
    const usagePattern = new RegExp(`\\b${api}\\b`);
    const importPattern = new RegExp(`import\\s+.*\\b${api}\\b.*from`);
    if (usagePattern.test(script) && !importPattern.test(script)) {
      imports.add(api);
    }
  }

  // Template primitives — auto-import when used as tags in the template
  const templatePrimitives = ['Show', 'For'];
  for (const tag of templatePrimitives) {
    if (new RegExp(`<${tag}[\\s/>]`).test(template) && !imports.has(tag)) {
      imports.add(tag);
    }
  }
}

/** Separate import and export statements from the rest of the script */
function extractUserImports(script: string): {
  userImports: string[];
  bodyScript: string;
} {
  const lines = script.split('\n');
  const userImports: string[] = [];
  const bodyLines: string[] = [];

  let inMultiLineImport = false;
  let inMultiLineExport = false;

  for (const line of lines) {
    if (inMultiLineImport) {
      userImports[userImports.length - 1] += '\n' + line;
      if (line.includes('from ') || line.trimEnd().endsWith(';')) {
        inMultiLineImport = false;
      }
      continue;
    }

    if (inMultiLineExport) {
      userImports[userImports.length - 1] += '\n' + line;
      if (line.trimEnd().endsWith('}') || line.trimEnd().endsWith('};')) {
        inMultiLineExport = false;
      }
      continue;
    }

    const trimmed = line.trim();
    if (/^import\s/.test(trimmed)) {
      userImports.push(line.trim());
      // Check if this import spans multiple lines (no `from` on this line)
      if (!trimmed.includes('from ') && !trimmed.endsWith(';')) {
        inMultiLineImport = true;
      }
    } else if (/^export\s+(interface|type|enum)\s/.test(trimmed)) {
      // Type-only exports — hoist to module scope (esbuild will strip them)
      userImports.push(line.trim());
      // Check if this spans multiple lines (e.g., multi-line interface)
      if (!trimmed.endsWith('}') && !trimmed.endsWith('};') && !trimmed.endsWith(';')) {
        inMultiLineExport = true;
      }
    } else if (/^export\s+(const|let|var|function|class)\s/.test(trimmed)) {
      // Value exports — strip 'export' keyword and keep in body
      bodyLines.push(line.replace(/\bexport\s+/, ''));
    } else if (/^declare\s/.test(trimmed)) {
      // TypeScript declare statements — hoist to module scope
      userImports.push(line.trim());
      if (!trimmed.endsWith('}') && !trimmed.endsWith('};') && !trimmed.endsWith(';')) {
        inMultiLineExport = true;
      }
    } else {
      bodyLines.push(line);
    }
  }

  return { userImports, bodyScript: bodyLines.join('\n') };
}

/** Extract Props interface from script so we can use it as generic param */
function extractPropsInterface(script: string): {
  cleanScript: string;
  propsInterface: string | null;
} {
  const match = /interface\s+Props\s*\{([^}]*)\}/s.exec(script);
  if (!match) {
    return { cleanScript: script, propsInterface: null };
  }

  // Remove the interface declaration from the script
  const cleanScript = script.replace(match[0], '').trim();
  // Build inline type
  const propsInterface = `{${match[1].trim()}}`;

  return { cleanScript, propsInterface };
}

/** Generate the render body from template AST nodes */
function generateRenderBody(
  nodes: TemplateNode[],
  imports: Set<string>,
  scopeId?: string,
): string {
  if (nodes.length === 0) {
    return `    return null;\n`;
  }

  // If there's a single root element, generate it directly
  if (nodes.length === 1) {
    const lines: string[] = [];
    generateNode(nodes[0], lines, imports, 4, 'root', scopeId);
    lines.push(`    return root;`);
    return lines.join('\n') + '\n';
  }

  // Multiple root nodes — wrap in a fragment
  imports.add('createElement');
  const lines: string[] = [];
  lines.push(`    const __fragment = document.createDocumentFragment();`);
  for (let i = 0; i < nodes.length; i++) {
    const varName = `__n${i}`;
    generateNode(nodes[i], lines, imports, 4, varName, scopeId);
    lines.push(`    __fragment.appendChild(${varName});`);
  }
  lines.push(`    return __fragment;`);
  return lines.join('\n') + '\n';
}

function generateNode(
  node: TemplateNode,
  lines: string[],
  imports: Set<string>,
  indent: number,
  varName: string,
  scopeId?: string,
): void {
  const pad = ' '.repeat(indent);

  switch (node.type) {
    case 'element':
      generateElement(node, lines, imports, indent, varName, scopeId);
      break;

    case 'component':
      generateComponentCall(node, lines, imports, indent, varName, scopeId);
      break;

    case 'text':
      lines.push(`${pad}const ${varName} = document.createTextNode(${JSON.stringify(node.content ?? '')});`);
      break;

    case 'expression':
      imports.add('effect');
      lines.push(`${pad}const ${varName} = document.createTextNode('');`);
      lines.push(`${pad}effect(() => { ${varName}.textContent = String(${node.content}); }, { render: true });`);
      break;
  }
}

function generateElement(
  node: TemplateNode,
  lines: string[],
  imports: Set<string>,
  indent: number,
  varName: string,
  scopeId?: string,
): void {
  const pad = ' '.repeat(indent);
  const tag = node.tag!;

  // Check for :if directive
  const ifDirective = node.directives?.find((d) => d.name === 'if');
  if (ifDirective) {
    imports.add('renderConditional');
    // Generate the conditional block
    lines.push(`${pad}const ${varName}_anchor = document.createComment('if');`);
    lines.push(`${pad}const ${varName} = document.createDocumentFragment();`);
    lines.push(`${pad}${varName}.appendChild(${varName}_anchor);`);
    lines.push(`${pad}renderConditional(${varName}, ${varName}_anchor, () => ${ifDirective.value}, () => {`);

    // Generate the element inside the true branch
    const innerLines: string[] = [];
    const innerNode = { ...node, directives: node.directives?.filter((d) => d.name !== 'if') };
    generateElement(innerNode, innerLines, imports, indent + 2, '__el', scopeId);
    innerLines.push(`${pad}  return __el;`);
    lines.push(...innerLines);

    lines.push(`${pad}});`);
    return;
  }

  // Check for :for directive
  const forDirective = node.directives?.find((d) => d.name === 'for');
  if (forDirective) {
    imports.add('renderList');
    const keyDirective = node.directives?.find((d) => d.name === 'key');

    // Parse :for="item of items()" or :for="(item, index) of items()"
    const forMatch = /^(?:\(([^)]+)\)|(\w+))\s+of\s+(.+)$/.exec(forDirective.value);
    if (forMatch) {
      const itemVar = forMatch[1] ?? forMatch[2];
      const listExpr = forMatch[3];
      const keyExpr = keyDirective?.value ?? `${itemVar}`;

      lines.push(`${pad}const ${varName}_anchor = document.createComment('for');`);
      lines.push(`${pad}const ${varName} = document.createDocumentFragment();`);
      lines.push(`${pad}${varName}.appendChild(${varName}_anchor);`);
      lines.push(`${pad}renderList(${varName}, ${varName}_anchor, () => ${listExpr}, (${itemVar}) => ${keyExpr}, (${itemVar}) => {`);

      // Generate the element inside the loop
      const innerLines: string[] = [];
      const innerNode = { ...node, directives: node.directives?.filter((d) => d.name !== 'for' && d.name !== 'key') };
      generateElement(innerNode, innerLines, imports, indent + 2, '__el', scopeId);
      innerLines.push(`${pad}  return __el;`);
      lines.push(...innerLines);

      lines.push(`${pad}});`);
    }
    return;
  }

  // Check for bind: directives (two-way binding)
  const bindDirectives = node.directives?.filter((d) => d.name === 'bind') ?? [];
  // Remove bind directives from the list so they don't get processed again
  if (bindDirectives.length > 0 && node.directives) {
    node.directives = node.directives.filter((d) => d.name !== 'bind');
  }

  // Regular element creation
  lines.push(`${pad}const ${varName} = document.createElement('${tag}');`);

  // Add scope ID for scoped styles
  if (scopeId) {
    lines.push(`${pad}${varName}.setAttribute('${scopeId}', '');`);
  }

  // Set attributes — process value/property attributes first, event listeners last
  // This prevents onChange from firing when value is set during render
  const eventAttrs: typeof node.attrs = [];
  const propAttrs: typeof node.attrs = [];

  if (node.attrs) {
    for (const attr of node.attrs) {
      if (attr.name.startsWith('on')) {
        eventAttrs.push(attr);
      } else {
        propAttrs.push(attr);
      }
    }
  }

  // Separate value attrs from other props — value must be set after children
  // (e.g., <select> needs <option> children before .value can take effect)
  const valueAttrs: typeof node.attrs = [];
  const otherPropAttrs: typeof node.attrs = [];

  for (const attr of propAttrs) {
    if (attr.name === 'value') {
      valueAttrs.push(attr);
    } else {
      otherPropAttrs.push(attr);
    }
  }

  // 1. Set non-value properties and attributes
  for (const attr of otherPropAttrs) {
    if (attr.dynamic) {
      imports.add('effect');
      lines.push(`${pad}effect(() => {`);
      if (attr.name === 'class' || attr.name === 'className') {
        lines.push(`${pad}  ${varName}.className = ${attr.value};`);
      } else {
        lines.push(`${pad}  ${varName}.setAttribute('${attr.name}', String(${attr.value}));`);
      }
      lines.push(`${pad}}, { render: true });`);
    } else {
      if (attr.name === 'class' || attr.name === 'className') {
        lines.push(`${pad}${varName}.className = ${JSON.stringify(attr.value)};`);
      } else {
        lines.push(`${pad}${varName}.setAttribute('${attr.name}', ${JSON.stringify(attr.value)});`);
      }
    }
  }

  // 2. Process bind: directives — value effect (before children is OK for input/textarea)
  for (const bindDir of bindDirectives) {
    const prop = bindDir.arg ?? 'value';
    const signalExpr = bindDir.value;
    imports.add('effect');

    // Read: bind signal value to element property (compare to avoid event loops)
    lines.push(`${pad}effect(() => { const __v = ${signalExpr}(); if (${varName}.${prop} !== __v) ${varName}.${prop} = __v; }, { render: true });`);

    // Write: listen for input events and update the signal
    const eventName = prop === 'value' || prop === 'checked' ? 'input' : 'change';
    const valuePath = prop === 'checked' ? 'checked' : 'value';
    lines.push(`${pad}${varName}.addEventListener('${eventName}', (e) => { ${signalExpr}.set(e.target.${valuePath}); });`);
  }

  // 3. Append children (must happen before setting value on <select>)
  if (node.children && node.children.length > 0) {
    for (let i = 0; i < node.children.length; i++) {
      const childVar = `${varName}_c${i}`;
      generateNode(node.children[i], lines, imports, indent, childVar, scopeId);
      lines.push(`${pad}${varName}.appendChild(${childVar});`);
    }
  }

  // 4. Set value property AFTER children (so <select> options exist)
  // Set initial value synchronously, then use effect for reactive updates
  for (const attr of valueAttrs) {
    if (attr.dynamic) {
      // Synchronous initial set — MUST happen before event listeners
      lines.push(`${pad}${varName}.value = ${attr.value};`);
      // Reactive effect for future signal updates
      imports.add('effect');
      lines.push(`${pad}effect(() => {`);
      lines.push(`${pad}  const __v = ${attr.value};`);
      lines.push(`${pad}  if (${varName}.value !== String(__v)) ${varName}.value = __v;`);
      lines.push(`${pad}}, { render: true });`);
    } else {
      lines.push(`${pad}${varName}.value = ${JSON.stringify(attr.value)};`);
    }
  }

  // 5. Attach event listeners LAST (after value is set and children exist)
  for (const attr of eventAttrs) {
    if (attr.dynamic) {
      lines.push(`${pad}${varName}.addEventListener('${attr.name.slice(2).toLowerCase()}', ${attr.value});`);
    } else {
      lines.push(`${pad}${varName}.setAttribute('${attr.name}', ${JSON.stringify(attr.value)});`);
    }
  }
}

function generateComponentCall(
  node: TemplateNode,
  lines: string[],
  imports: Set<string>,
  indent: number,
  varName: string,
  scopeId?: string,
): void {
  const pad = ' '.repeat(indent);
  const tag = node.tag!;

  // Build props object
  const propParts: string[] = [];
  if (node.attrs) {
    for (const attr of node.attrs) {
      if (attr.dynamic) {
        // Check if the value contains JSX (starts with <Tag)
        const jsxContent = tryCompileJSXProp(attr.value, imports, indent, scopeId);
        if (jsxContent) {
          propParts.push(`${attr.name}: ${jsxContent}`);
        } else if (attr.name.startsWith('on') || isAlreadyFunction(attr.value)) {
          // Event handlers and function values — pass through as-is
          propParts.push(`${attr.name}: ${attr.value}`);
        } else if (needsReactiveWrapper(attr.value)) {
          // Contains signal reads — wrap in marked getter for reactivity
          imports.add('__getter');
          propParts.push(`${attr.name}: __getter(() => ${attr.value})`);
        } else {
          // Static value (literal, identifier, etc.) — pass through
          propParts.push(`${attr.name}: ${attr.value}`);
        }
      } else {
        propParts.push(`${attr.name}: ${JSON.stringify(attr.value)}`);
      }
    }
  }

  // Children — compile into a render function that builds real DOM
  if (node.children && node.children.length > 0) {
    const childBody = generateChildrenBody(node.children, imports, indent + 2, scopeId);
    propParts.push(`children: ${childBody}`);
  }

  const propsStr = propParts.length > 0 ? `{ ${propParts.join(', ')} }` : '{}';
  lines.push(`${pad}const ${varName} = ${tag}(${propsStr});`);
}

/**
 * Compile children nodes into a render function body: () => { ... return node; }
 *
 * Handles special cases:
 * - A single expression child that is an arrow function with JSX:
 *   {(value) => <div>...</div>} compiles the JSX and wraps it in (value) => { ... }
 * - Regular element/text/expression children: wrapped in () => { ... }
 */
function generateChildrenBody(
  children: TemplateNode[],
  imports: Set<string>,
  indent: number,
  scopeId?: string,
): string {
  // Single expression child — check for arrow function with JSX
  if (children.length === 1 && children[0].type === 'expression') {
    const compiled = tryCompileArrowJSX(children[0].content ?? '', imports, indent, scopeId);
    if (compiled) return compiled;
  }

  const pad = ' '.repeat(indent);
  const innerLines: string[] = [];

  // Filter out whitespace-only text nodes
  const meaningful = children.filter(
    (c) => !(c.type === 'text' && !(c.content ?? '').trim()),
  );

  if (meaningful.length === 1) {
    generateNode(meaningful[0], innerLines, imports, indent, '__child', scopeId);
    innerLines.push(`${pad}return __child;`);
  } else {
    innerLines.push(`${pad}const __frag = document.createDocumentFragment();`);
    for (let i = 0; i < meaningful.length; i++) {
      const cVar = `__child${i}`;
      generateNode(meaningful[i], innerLines, imports, indent, cVar, scopeId);
      innerLines.push(`${pad}__frag.appendChild(${cVar});`);
    }
    innerLines.push(`${pad}return __frag;`);
  }

  return `() => {\n${innerLines.join('\n')}\n${' '.repeat(indent - 2)}}`;
}

/**
 * Detect arrow functions containing JSX and compile them:
 *   (value) => <div>{value.name}</div>
 *   () => <span>hello</span>
 *
 * Returns compiled function string, or null if not an arrow+JSX pattern.
 */
function tryCompileArrowJSX(
  expr: string,
  imports: Set<string>,
  indent: number,
  scopeId?: string,
): string | null {
  const trimmed = expr.trim();

  // Match arrow function: optional params => JSX body
  // Patterns: () => <Tag>, (x) => <Tag>, x => <Tag>, (x, i) => <Tag>
  const arrowMatch = /^(\(?[^)]*\)?)\s*=>\s*(<[a-zA-Z].*)$/s.exec(trimmed);
  if (!arrowMatch) return null;

  const params = arrowMatch[1];
  const jsxBody = arrowMatch[2];

  // Parse the JSX body as template content
  const nodes = parseTemplate(jsxBody);
  if (nodes.length === 0) return null;

  // Generate the DOM creation code for the JSX
  const pad = ' '.repeat(indent);
  const innerLines: string[] = [];

  if (nodes.length === 1) {
    generateNode(nodes[0], innerLines, imports, indent, '__child', scopeId);
    innerLines.push(`${pad}return __child;`);
  } else {
    innerLines.push(`${pad}const __frag = document.createDocumentFragment();`);
    for (let i = 0; i < nodes.length; i++) {
      const cVar = `__child${i}`;
      generateNode(nodes[i], innerLines, imports, indent, cVar, scopeId);
      innerLines.push(`${pad}__frag.appendChild(${cVar});`);
    }
    innerLines.push(`${pad}return __frag;`);
  }

  return `${params} => {\n${innerLines.join('\n')}\n${' '.repeat(indent - 2)}}`;
}

/**
 * Detect if a dynamic prop value contains JSX and compile it into a render function.
 * Returns the compiled function string, or null if the value is not JSX.
 */
function tryCompileJSXProp(
  value: string,
  imports: Set<string>,
  indent: number,
  scopeId?: string,
): string | null {
  const trimmed = value.trim();

  // Check for arrow function with JSX: (x) => <Tag> or () => <Tag>
  const arrowResult = tryCompileArrowJSX(trimmed, imports, indent + 2, scopeId);
  if (arrowResult) return arrowResult;

  // Check if the value looks like JSX: starts with < followed by a tag name
  if (!/^<[a-zA-Z]/.test(trimmed)) return null;

  // Parse the JSX as template content
  const nodes = parseTemplate(trimmed);
  if (nodes.length === 0) return null;

  // Generate a render function
  return generateChildrenBody(nodes, imports, indent + 2, scopeId);
}

// --- Server-mode code generation (string concatenation) ---

/** Generate server-mode render body that builds HTML strings */
function generateServerRenderBody(
  nodes: TemplateNode[],
  imports: Set<string>,
  scopeId?: string,
): string {
  if (nodes.length === 0) {
    return `    return '';\n`;
  }

  const lines: string[] = [];
  lines.push(`    let __html = '';`);

  for (const node of nodes) {
    generateServerNode(node, lines, imports, 4, scopeId);
  }

  lines.push(`    return __html;`);
  return lines.join('\n') + '\n';
}

function generateServerNode(
  node: TemplateNode,
  lines: string[],
  imports: Set<string>,
  indent: number,
  scopeId?: string,
): void {
  const pad = ' '.repeat(indent);

  switch (node.type) {
    case 'text':
      lines.push(`${pad}__html += ${JSON.stringify(node.content ?? '')};`);
      break;

    case 'expression':
      // Import the escape helper
      imports.add('escapeHtml');
      lines.push(`${pad}__html += escapeHtml(String(${node.content}));`);
      break;

    case 'element':
      generateServerElement(node, lines, imports, indent, scopeId);
      break;

    case 'component':
      // Server-side component rendering — call the component's SSR render
      lines.push(`${pad}// TODO: SSR component rendering for ${node.tag}`);
      lines.push(`${pad}__html += '';`);
      break;
  }
}

const SERVER_VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

function generateServerElement(
  node: TemplateNode,
  lines: string[],
  imports: Set<string>,
  indent: number,
  scopeId?: string,
): void {
  const pad = ' '.repeat(indent);
  const tag = node.tag!;

  // Handle :if directive
  const ifDirective = node.directives?.find((d) => d.name === 'if');
  if (ifDirective) {
    lines.push(`${pad}if (${ifDirective.value}) {`);
    const innerNode = { ...node, directives: node.directives?.filter((d) => d.name !== 'if') };
    generateServerElement(innerNode, lines, imports, indent + 2, scopeId);
    lines.push(`${pad}}`);
    return;
  }

  // Handle :for directive
  const forDirective = node.directives?.find((d) => d.name === 'for');
  if (forDirective) {
    const forMatch = /^(?:\(([^)]+)\)|(\w+))\s+of\s+(.+)$/.exec(forDirective.value);
    if (forMatch) {
      const itemVar = forMatch[1] ?? forMatch[2];
      const listExpr = forMatch[3];
      lines.push(`${pad}for (const ${itemVar} of ${listExpr}) {`);
      const innerNode = { ...node, directives: node.directives?.filter((d) => d.name !== 'for' && d.name !== 'key') };
      generateServerElement(innerNode, lines, imports, indent + 2, scopeId);
      lines.push(`${pad}}`);
    }
    return;
  }

  // Opening tag
  let openTag = `'<${tag}`;

  // Add scope ID
  if (scopeId) {
    openTag += ` ${scopeId}`;
  }

  // Static attributes
  if (node.attrs) {
    for (const attr of node.attrs) {
      if (attr.name.startsWith('on')) continue; // Skip event handlers on server

      if (attr.dynamic) {
        // Close the static string, add dynamic part
        lines.push(`${pad}__html += ${openTag}';`);
        openTag = "'";

        imports.add('escapeHtml');
        if (attr.name === 'class' || attr.name === 'className') {
          lines.push(`${pad}__html += ' class="' + escapeHtml(String(${attr.value})) + '"';`);
        } else {
          lines.push(`${pad}__html += ' ${attr.name}="' + escapeHtml(String(${attr.value})) + '"';`);
        }
      } else {
        if (attr.name === 'class' || attr.name === 'className') {
          openTag += ` class="${attr.value}"`;
        } else {
          openTag += ` ${attr.name}="${attr.value}"`;
        }
      }
    }
  }

  if (SERVER_VOID_ELEMENTS.has(tag)) {
    lines.push(`${pad}__html += ${openTag} />';`);
    return;
  }

  lines.push(`${pad}__html += ${openTag}>';`);

  // Children
  if (node.children) {
    for (const child of node.children) {
      generateServerNode(child, lines, imports, indent, scopeId);
    }
  }

  // Closing tag
  lines.push(`${pad}__html += '</${tag}>';`);
}
