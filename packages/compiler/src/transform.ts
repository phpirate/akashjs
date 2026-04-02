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

// SVG elements that require createElementNS
const SVG_ELEMENTS = new Set([
  'svg', 'circle', 'rect', 'ellipse', 'line', 'polyline', 'polygon', 'path',
  'text', 'tspan', 'g', 'defs', 'use', 'symbol', 'clipPath', 'mask', 'filter',
  'linearGradient', 'radialGradient', 'stop', 'pattern', 'image', 'foreignObject',
  'animate', 'animateTransform', 'animateMotion', 'set', 'marker', 'textPath',
]);

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

  // Props access — potentially reactive (backed by __getter Proxy)
  if (/\bprops\./.test(trimmed)) return true;

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
      // Value exports — hoist to module scope with export keyword preserved
      userImports.push(line.trim());
      // Multi-line: function/class bodies, or const with object/array literals
      if (/^export\s+(function|class)\s/.test(trimmed) && !trimmed.endsWith('}')) {
        inMultiLineExport = true;
      }
    } else if (/^export\s+default\s/.test(trimmed)) {
      // export default — hoist to module scope
      userImports.push(line.trim());
      if (!trimmed.endsWith(';') && !trimmed.endsWith('}')) {
        inMultiLineExport = true;
      }
    } else if (/^export\s*\{/.test(trimmed)) {
      // Named re-exports: export { foo, bar } — just drop them (they reference local vars)
      if (!trimmed.endsWith('}') && !trimmed.endsWith('};')) {
        inMultiLineExport = true;
        userImports.push(''); // placeholder for multi-line accumulation
      }
      continue;
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
  isSvg?: boolean,
): void {
  const pad = ' '.repeat(indent);

  switch (node.type) {
    case 'element':
      generateElement(node, lines, imports, indent, varName, scopeId, isSvg);
      break;

    case 'component':
      generateComponentCall(node, lines, imports, indent, varName, scopeId);
      break;

    case 'text':
      lines.push(`${pad}const ${varName} = document.createTextNode(${JSON.stringify(node.content ?? '')});`);
      break;

    case 'expression': {
      const expr = node.content ?? '';

      // Detect && with JSX: cond && <Tag>...</Tag>
      const andMatch = /^(.+?)\s*&&\s*(<[a-zA-Z].*)$/s.exec(expr);
      if (andMatch) {
        const condExpr = andMatch[1].trim();
        const jsxStr = andMatch[2].trim();
        const jsxNodes = parseTemplate(jsxStr);
        if (jsxNodes.length > 0) {
          imports.add('renderConditional');
          lines.push(`${pad}const ${varName}_anchor = document.createComment('cond');`);
          lines.push(`${pad}const ${varName} = document.createDocumentFragment();`);
          lines.push(`${pad}${varName}.appendChild(${varName}_anchor);`);
          lines.push(`${pad}renderConditional(${varName}, ${varName}_anchor, () => !!(${condExpr}), () => {`);
          const innerLines: string[] = [];
          if (jsxNodes.length === 1) {
            generateNode(jsxNodes[0], innerLines, imports, indent + 2, '__cond_el', scopeId, isSvg);
            innerLines.push(`${pad}  return __cond_el;`);
          } else {
            innerLines.push(`${pad}  const __frag = document.createDocumentFragment();`);
            for (let j = 0; j < jsxNodes.length; j++) {
              generateNode(jsxNodes[j], innerLines, imports, indent + 2, `__cond_el${j}`, scopeId, isSvg);
              innerLines.push(`${pad}  __frag.appendChild(__cond_el${j});`);
            }
            innerLines.push(`${pad}  return __frag;`);
          }
          lines.push(...innerLines);
          lines.push(`${pad}});`);
          break;
        }
      }

      // Detect ternary with JSX: cond ? <TagA> : <TagB>
      const ternaryMatch = /^(.+?)\s*\?\s*(<[a-zA-Z].*?)\s*:\s*(<[a-zA-Z].*)$/s.exec(expr);
      if (ternaryMatch) {
        const condExpr = ternaryMatch[1].trim();
        const trueJsx = ternaryMatch[2].trim();
        const falseJsx = ternaryMatch[3].trim();
        const trueNodes = parseTemplate(trueJsx);
        const falseNodes = parseTemplate(falseJsx);
        if (trueNodes.length > 0 && falseNodes.length > 0) {
          imports.add('renderConditional');
          lines.push(`${pad}const ${varName}_anchor = document.createComment('cond');`);
          lines.push(`${pad}const ${varName} = document.createDocumentFragment();`);
          lines.push(`${pad}${varName}.appendChild(${varName}_anchor);`);

          // True branch
          lines.push(`${pad}renderConditional(${varName}, ${varName}_anchor, () => !!(${condExpr}), () => {`);
          const trueLines: string[] = [];
          generateNode(trueNodes[0], trueLines, imports, indent + 2, '__cond_t', scopeId, isSvg);
          trueLines.push(`${pad}  return __cond_t;`);
          lines.push(...trueLines);

          // False branch
          lines.push(`${pad}}, () => {`);
          const falseLines: string[] = [];
          generateNode(falseNodes[0], falseLines, imports, indent + 2, '__cond_f', scopeId, isSvg);
          falseLines.push(`${pad}  return __cond_f;`);
          lines.push(...falseLines);
          lines.push(`${pad}});`);
          break;
        }
      }

      // Detect component function calls: PascalCase({...})
      // These must NOT be wrapped in an effect — the component is created once
      // and reactive props are passed as __getter() wrappers so the component
      // can subscribe internally. Re-running the call would destroy & recreate
      // the entire component DOM on every signal change (losing focus, state, etc).
      const componentCallMatch = /^([A-Z][a-zA-Z0-9_$]*)\s*\(\s*\{([\s\S]*)\}\s*\)$/.exec(expr);
      if (componentCallMatch) {
        const compName = componentCallMatch[1];
        const propsBody = componentCallMatch[2];

        // Parse the props object literal and wrap reactive values as getters
        const wrappedProps = propsBody.replace(
          /(\w+)\s*:\s*([^,}]+)/g,
          (_match, key: string, value: string) => {
            const val = value.trim();
            if (key.startsWith('on') || isAlreadyFunction(val)) {
              return `${key}: ${val}`;
            }
            if (needsReactiveWrapper(val)) {
              imports.add('__getter');
              return `${key}: __getter(() => ${val})`;
            }
            return `${key}: ${val}`;
          },
        );

        lines.push(`${pad}const ${varName} = ${compName}({ ${wrappedProps} });`);
        break;
      }

      // Default: reactive expression — handles both text values and DOM nodes.
      // Uses a comment anchor + container pattern so the effect works even before
      // the node is appended to the DOM (effect runs immediately on creation).
      imports.add('effect');
      lines.push(`${pad}const ${varName} = document.createComment('expr');`);
      lines.push(`${pad}let ${varName}_cur = null;`);
      lines.push(`${pad}effect(() => {`);
      lines.push(`${pad}  const __val = ${expr};`);
      lines.push(`${pad}  if (${varName}_cur && ${varName}_cur.parentNode) ${varName}_cur.parentNode.removeChild(${varName}_cur);`);
      lines.push(`${pad}  if (__val instanceof Node) {`);
      lines.push(`${pad}    ${varName}_cur = __val;`);
      lines.push(`${pad}    if (${varName}.parentNode) ${varName}.parentNode.insertBefore(__val, ${varName});`);
      lines.push(`${pad}  } else if (__val != null && __val !== false && __val !== '') {`);
      lines.push(`${pad}    ${varName}_cur = document.createTextNode(String(__val));`);
      lines.push(`${pad}    if (${varName}.parentNode) ${varName}.parentNode.insertBefore(${varName}_cur, ${varName});`);
      lines.push(`${pad}  } else { ${varName}_cur = null; }`);
      lines.push(`${pad}}, { render: true });`);
      break;
    }
  }
}

function generateElement(
  node: TemplateNode,
  lines: string[],
  imports: Set<string>,
  indent: number,
  varName: string,
  scopeId?: string,
  parentIsSvg?: boolean,
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
    generateElement(innerNode, innerLines, imports, indent + 2, '__el', scopeId, parentIsSvg);
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
      generateElement(innerNode, innerLines, imports, indent + 2, '__el', scopeId, parentIsSvg);
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

  // Extract class: directives (class:active={expr})
  const classDirectives = node.directives?.filter((d) => d.name === 'class') ?? [];
  if (classDirectives.length > 0 && node.directives) {
    node.directives = node.directives.filter((d) => d.name !== 'class');
  }

  // Determine if this element is SVG (or inherits SVG context from parent)
  // foreignObject is SVG itself but its children are HTML
  const isSvg = parentIsSvg || SVG_ELEMENTS.has(tag);
  const childrenAreSvg = isSvg && tag !== 'foreignObject';

  // Regular element creation
  if (isSvg) {
    lines.push(`${pad}const ${varName} = document.createElementNS('http://www.w3.org/2000/svg', '${tag}');`);
  } else {
    lines.push(`${pad}const ${varName} = document.createElement('${tag}');`);
  }

  // Add scope ID for scoped styles
  if (scopeId) {
    lines.push(`${pad}${varName}.setAttribute('${scopeId}', '');`);
  }

  // Set attributes — process value/property attributes first, event listeners last
  // This prevents onChange from firing when value is set during render
  const eventAttrs: typeof node.attrs = [];
  const propAttrs: typeof node.attrs = [];
  let refAttr: { name: string; value: string; dynamic: boolean } | null = null;

  if (node.attrs) {
    for (const attr of node.attrs) {
      if (attr.name === 'ref' && attr.dynamic) {
        refAttr = attr;
      } else if (attr.name.startsWith('on')) {
        eventAttrs.push(attr);
      } else {
        propAttrs.push(attr);
      }
    }
  }

  // Wire ref to the DOM element — supports both ref objects and callback refs
  if (refAttr) {
    const refValue = refAttr.value.trim();
    if (isAlreadyFunction(refValue)) {
      // Callback ref: (el) => { ... } or function(el) { ... }
      lines.push(`${pad}(${refValue})(${varName});`);
    } else {
      // Ref object: myRef.current = element
      lines.push(`${pad}if (typeof ${refValue} === 'function') { (${refValue})(${varName}); } else { ${refValue}.current = ${varName}; }`);
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

  // Boolean DOM properties that must use property assignment, not setAttribute
  // Boolean/IDL DOM properties that must use property assignment, not setAttribute
  const booleanProps = new Set([
    'checked', 'disabled', 'selected', 'readonly', 'required', 'multiple', 'hidden', 'open',
    // Media element booleans
    'autoplay', 'controls', 'loop', 'muted', 'default', 'novalidate',
    // IDL properties
    'autofocus', 'formnovalidate', 'nomodule', 'playsinline', 'reversed', 'allowfullscreen',
  ]);
  // Properties that need property assignment but aren't boolean (IDL string/number properties)
  const idlProps = new Set([
    'tabIndex', 'contentEditable', 'draggable', 'spellcheck', 'translate',
    'id', 'name', 'type', 'placeholder', 'src', 'href', 'alt', 'title',
    'width', 'height', 'colSpan', 'rowSpan', 'htmlFor',
  ]);
  // Map HTML attribute names to their correct DOM property names (when they differ)
  const attrToProp: Record<string, string> = {
    readonly: 'readOnly', tabindex: 'tabIndex', contenteditable: 'contentEditable',
    colspan: 'colSpan', rowspan: 'rowSpan', for: 'htmlFor',
  };

  // 1. Set non-value properties and attributes
  for (const attr of otherPropAttrs) {
    if (attr.dynamic) {
      imports.add('effect');
      lines.push(`${pad}effect(() => {`);
      if (isSvg) {
        // SVG: always use setAttribute (properties don't work reliably on SVG elements)
        if (attr.name === 'class' || attr.name === 'className') {
          lines.push(`${pad}  ${varName}.setAttribute('class', ${attr.value});`);
        } else {
          lines.push(`${pad}  ${varName}.setAttribute('${attr.name}', String(${attr.value}));`);
        }
      } else if (attr.name === 'class' || attr.name === 'className') {
        lines.push(`${pad}  ${varName}.className = ${attr.value};`);
      } else if (booleanProps.has(attr.name)) {
        const domProp = attrToProp[attr.name] ?? attr.name;
        lines.push(`${pad}  ${varName}.${domProp} = !!(${attr.value});`);
      } else if (attr.name === 'innerHTML') {
        lines.push(`${pad}  ${varName}.innerHTML = ${attr.value};`);
      } else if (attr.name === 'style') {
        lines.push(`${pad}  ${varName}.style.cssText = ${attr.value};`);
      } else if (idlProps.has(attr.name) || attrToProp[attr.name]) {
        const domProp = attrToProp[attr.name] ?? attr.name;
        lines.push(`${pad}  ${varName}.${domProp} = ${attr.value};`);
      } else {
        lines.push(`${pad}  ${varName}.setAttribute('${attr.name}', String(${attr.value}));`);
      }
      lines.push(`${pad}}, { render: true });`);
    } else {
      if (isSvg) {
        // SVG: always use setAttribute
        if (attr.name === 'class' || attr.name === 'className') {
          lines.push(`${pad}${varName}.setAttribute('class', ${JSON.stringify(attr.value)});`);
        } else {
          lines.push(`${pad}${varName}.setAttribute('${attr.name}', ${JSON.stringify(attr.value)});`);
        }
      } else if (attr.name === 'class' || attr.name === 'className') {
        lines.push(`${pad}${varName}.className = ${JSON.stringify(attr.value)};`);
      } else if (booleanProps.has(attr.name)) {
        const domProp = attrToProp[attr.name] ?? attr.name;
        lines.push(`${pad}${varName}.${domProp} = true;`);
      } else if (attr.name === 'style') {
        lines.push(`${pad}${varName}.style.cssText = ${JSON.stringify(attr.value)};`);
      } else if (idlProps.has(attr.name) || attrToProp[attr.name]) {
        const domProp = attrToProp[attr.name] ?? attr.name;
        lines.push(`${pad}${varName}.${domProp} = ${JSON.stringify(attr.value)};`);
      } else {
        lines.push(`${pad}${varName}.setAttribute('${attr.name}', ${JSON.stringify(attr.value)});`);
      }
    }
  }

  // 1b. Apply class: directives (class:active={expr})
  for (const dir of classDirectives) {
    imports.add('effect');
    lines.push(`${pad}effect(() => { ${varName}.classList.toggle('${dir.arg}', !!(${dir.value})); }, { render: true });`);
  }

  // 2. Process bind: directives — value effect (before children is OK for input/textarea)
  for (const bindDir of bindDirectives) {
    const prop = bindDir.arg ?? 'value';
    const signalExpr = bindDir.value;
    imports.add('effect');

    // Detect contenteditable — uses textContent instead of value
    const isContentEditable = node.attrs?.some(a => a.name === 'contentEditable' || a.name === 'contenteditable');
    const bindProp = isContentEditable && prop === 'value' ? 'textContent' : prop;

    // Read: bind signal value to element property (compare to avoid event loops)
    lines.push(`${pad}effect(() => { const __v = ${signalExpr}(); if (${varName}.${bindProp} !== __v) ${varName}.${bindProp} = __v; }, { render: true });`);

    // Write: listen for events and update the signal
    const isCheckbox = bindProp === 'checked';
    const eventName = isCheckbox ? 'change' : 'input';
    const valuePath = isCheckbox ? 'checked' : isContentEditable ? 'textContent' : 'value';
    // Detect number/range inputs for type conversion
    const isNumberInput = node.attrs?.some(a => a.name === 'type' && (a.value === 'number' || a.value === 'range'));
    const setter = isNumberInput
      ? `${signalExpr}.set(Number(e.target.${valuePath}))`
      : `${signalExpr}.set(e.target.${valuePath})`;
    lines.push(`${pad}${varName}.addEventListener('${eventName}', (e) => { ${setter}; });`);
  }

  // Apply spread attributes
  if (node.spreads) {
    for (const spreadExpr of node.spreads) {
      lines.push(`${pad}for (const [__k, __v] of Object.entries(${spreadExpr})) {`);
      lines.push(`${pad}  if (__k.startsWith('on') && typeof __v === 'function') {`);
      lines.push(`${pad}    ${varName}.addEventListener(__k.slice(2).toLowerCase(), __v);`);
      lines.push(`${pad}  } else if (__k === 'class' || __k === 'className') {`);
      lines.push(`${pad}    ${varName}.className = __v;`);
      lines.push(`${pad}  } else if (__k in ${varName}) {`);
      lines.push(`${pad}    ${varName}[__k] = __v;`);
      lines.push(`${pad}  } else {`);
      lines.push(`${pad}    ${varName}.setAttribute(__k, String(__v));`);
      lines.push(`${pad}  }`);
      lines.push(`${pad}}`);
    }
  }

  // 3. Append children (must happen before setting value on <select>)
  // For expression nodes, effects must run AFTER appendChild so the node has a parent.
  // Collect deferred effects and emit them after all children are appended.
  const deferredEffects: string[] = [];
  if (node.children && node.children.length > 0) {
    for (let i = 0; i < node.children.length; i++) {
      const childVar = `${varName}_c${i}`;
      const beforeLen = lines.length;
      generateNode(node.children[i], lines, imports, indent, childVar, scopeId, childrenAreSvg);

      // For expression nodes: extract the effect lines, defer them after appendChild
      if (node.children[i].type === 'expression') {
        // Find lines added by generateNode — separate creation from effect
        const added = lines.splice(beforeLen, lines.length - beforeLen);
        const creationLines: string[] = [];
        const effectLines: string[] = [];
        let inEffect = false;
        for (const line of added) {
          if (line.includes('effect(()')) inEffect = true;
          if (inEffect) {
            effectLines.push(line);
            if (line.trim().startsWith('}, {') || line.trim() === '});') {
              inEffect = false;
            }
          } else {
            creationLines.push(line);
          }
        }
        lines.push(...creationLines);
        lines.push(`${pad}${varName}.appendChild(${childVar});`);
        deferredEffects.push(...effectLines);
      } else {
        lines.push(`${pad}${varName}.appendChild(${childVar});`);
      }
    }
  }

  // Emit deferred expression effects (must run after children are in the DOM)
  if (deferredEffects.length > 0) {
    lines.push(...deferredEffects);
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
  // For <select> onChange: skip the first fire that happens during render/insertion
  const isSelect = tag === 'select';
  for (const attr of eventAttrs) {
    if (attr.dynamic) {
      // Parse event name and modifiers: onClick|preventDefault|stopPropagation
      const parts = attr.name.split('|');
      const eventName = parts[0].slice(2).toLowerCase();
      const modifiers = parts.slice(1);

      const needsWrapper = modifiers.length > 0 || (isSelect && eventName === 'change');

      if (needsWrapper) {
        const modCode: string[] = [];
        if (isSelect && eventName === 'change') {
          lines.push(`${pad}{ let __mounted = false; queueMicrotask(() => { __mounted = true; });`);
          modCode.push('if (!__mounted) return');
        }
        for (const mod of modifiers) {
          if (mod === 'preventDefault') modCode.push('e.preventDefault()');
          else if (mod === 'stopPropagation') modCode.push('e.stopPropagation()');
          else if (mod === 'stopImmediatePropagation') modCode.push('e.stopImmediatePropagation()');
          else if (mod === 'once') {} // handled via addEventListener options
          else if (mod === 'capture') {} // handled via addEventListener options
          else if (mod === 'passive') {} // handled via addEventListener options
          else if (mod === 'self') modCode.push(`if (e.target !== ${varName}) return`);
        }

        const listenerOpts: string[] = [];
        if (modifiers.includes('once')) listenerOpts.push('once: true');
        if (modifiers.includes('capture')) listenerOpts.push('capture: true');
        if (modifiers.includes('passive')) listenerOpts.push('passive: true');
        const optsStr = listenerOpts.length > 0 ? `, { ${listenerOpts.join(', ')} }` : '';

        lines.push(`${pad}  ${varName}.addEventListener('${eventName}', (e) => { ${modCode.join('; ')}; (${attr.value})(e); }${optsStr});`);
        if (isSelect && eventName === 'change') {
          lines.push(`${pad}}`);
        }
      } else {
        lines.push(`${pad}${varName}.addEventListener('${eventName}', ${attr.value});`);
      }
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
    // For block syntax {#each}: wrap children with the item variable as parameter
    const itemVar = (node as any)._itemVar as string | undefined;
    const childBody = generateChildrenBody(node.children, imports, indent + 2, scopeId, itemVar);
    propParts.push(`children: ${childBody}`);
  }

  // Block syntax fallback ({:else} / {:else if}) — compiled to fallback prop
  const fallbackNodes = (node as any)._fallbackNodes as TemplateNode[] | undefined;
  if (fallbackNodes && fallbackNodes.length > 0) {
    // Remove the __blockFallback placeholder attr if present
    const filtered = propParts.filter(p => !p.startsWith('__blockFallback'));
    propParts.length = 0;
    propParts.push(...filtered);
    const fallbackBody = generateChildrenBody(fallbackNodes, imports, indent + 2, scopeId);
    propParts.push(`fallback: ${fallbackBody}`);
  }

  // Include spread props
  const spreadParts: string[] = [];
  if (node.spreads) {
    for (const spreadExpr of node.spreads) {
      spreadParts.push(`...${spreadExpr}`);
    }
  }

  const allParts = [...spreadParts, ...propParts];
  const propsStr = allParts.length > 0 ? `{ ${allParts.join(', ')} }` : '{}';
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
  itemVar?: string,
): string {
  // Single expression child — check for arrow function
  if (children.length === 1 && children[0].type === 'expression') {
    const expr = children[0].content ?? '';
    // Arrow with JSX body — compile the JSX
    const compiled = tryCompileArrowJSX(expr, imports, indent, scopeId);
    if (compiled) return compiled;
    // Arrow with non-JSX body (e.g., render function call) — pass through directly
    if (isAlreadyFunction(expr)) return expr;
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

  const params = itemVar ? `(${itemVar})` : '()';
  return `${params} => {\n${innerLines.join('\n')}\n${' '.repeat(indent - 2)}}`;
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
