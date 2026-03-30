/**
 * Compile-time prop validation for .akash components.
 *
 * Given a parent SFC's source and a resolver for child component sources,
 * validates that props passed to child components match the child's
 * `interface Props { ... }` declaration.
 *
 * ```ts
 * const errors = validateProps(parentSource, (componentName) => {
 *   return readFileSync(resolve(componentName + '.akash'), 'utf-8');
 * });
 * ```
 */

import { parse } from './parse.js';
import { parseTemplate, type TemplateNode } from './template.js';

/** Simple type compatibility check for basic types */
function typesMatch(expected: string, received: string): boolean {
  const e = expected.trim().toLowerCase();
  const r = received.trim().toLowerCase();
  if (e === r) return true;
  // 'any' matches everything
  if (e === 'any' || r === 'any') return true;
  // Union types: check if received is one of the union members
  if (e.includes('|')) {
    return e.split('|').some(part => typesMatch(part.trim(), r));
  }
  return false;
}

/** Split interface body into individual property declarations, respecting braces */
function splitProperties(body: string): string[] {
  const results: string[] = [];
  let current = '';
  let depth = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '{' || ch === '(') depth++;
    else if (ch === '}' || ch === ')') depth--;
    // Only track < as depth increase if it looks like a generic (not =>)
    else if (ch === '<' && body[i - 1] !== '=' && !/\w/.test(body[i - 1] ?? '')) depth++;
    else if (ch === '>' && depth > 0) depth--;
    else if ((ch === ';' || ch === '\n') && depth === 0) {
      if (current.trim()) results.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) results.push(current.trim());
  return results;
}

export interface PropError {
  component: string;
  prop: string;
  message: string;
  line?: number;
}

interface PropDef {
  name: string;
  type: string;
  optional: boolean;
}

/**
 * Extract prop definitions from an `interface Props { ... }` block.
 * Also accepts raw interface source (without SFC wrapping) for convenience.
 */
export function extractPropDefs(source: string): PropDef[] {
  // Try SFC parse first, fall back to raw interface source
  let scriptContent: string;
  if (source.includes('<script') || source.includes('<template')) {
    const sfc = parse(source);
    if (!sfc.script) return [];
    scriptContent = sfc.script.content;
  } else {
    scriptContent = source;
  }

  // Find interface Props { ... } with brace matching (handles nested braces)
  const startMatch = /interface\s+Props\s*\{/.exec(scriptContent);
  if (!startMatch) return [];

  const openIdx = startMatch.index + startMatch[0].length - 1;
  let depth = 1;
  let pos = openIdx + 1;
  while (pos < scriptContent.length && depth > 0) {
    if (scriptContent[pos] === '{') depth++;
    else if (scriptContent[pos] === '}') depth--;
    pos++;
  }
  const body = scriptContent.slice(openIdx + 1, pos - 1);

  const defs: PropDef[] = [];

  // Parse properties — split on semicolons and newlines at depth 0
  const properties = splitProperties(body);
  for (const prop of properties) {
    const trimmed = prop.trim();
    if (!trimmed) continue;
    // Match: name?: type  or  name: type
    const match = /^(\w+)(\??):\s*(.+)$/.exec(trimmed);
    if (match) {
      defs.push({
        name: match[1],
        type: match[3].replace(/;$/, '').trim(),
        optional: match[2] === '?',
      });
    }
  }

  return defs;
}

/**
 * Validate props directly against prop definitions.
 *
 * @param defs - Prop definitions (from extractPropDefs)
 * @param passedProps - Object of passed prop names (values are metadata or ignored)
 * @param componentName - Component name for error messages
 */
export function validatePropsAgainst(
  defs: PropDef[],
  passedProps: Record<string, unknown>,
  componentName = 'Component',
): PropError[] {
  const errors: PropError[] = [];
  const passedKeys = new Set(Object.keys(passedProps));
  const knownProps = new Set(defs.map(d => d.name));
  knownProps.add('children');
  knownProps.add('key');
  knownProps.add('ref');

  // Missing required props
  for (const def of defs) {
    if (!def.optional && !passedKeys.has(def.name)) {
      errors.push({
        component: componentName,
        prop: def.name,
        message: `Required prop "${def.name}" (type: ${def.type}) is not provided`,
      });
    }
  }

  // Type mismatch + unknown props
  for (const key of passedKeys) {
    if (key.startsWith('on')) continue;
    if (!knownProps.has(key)) {
      errors.push({
        component: componentName,
        prop: key,
        message: `Prop "${key}" is not defined in the Props interface`,
      });
      continue;
    }

    // Check type mismatch if the value has type metadata
    const val = passedProps[key];
    if (val && typeof val === 'object' && 'type' in val) {
      const receivedType = (val as any).type as string;
      const def = defs.find(d => d.name === key);
      if (def && receivedType && !typesMatch(def.type, receivedType)) {
        errors.push({
          component: componentName,
          prop: key,
          message: `Prop "${key}" expects type "${def.type}" but received "${receivedType}"`,
        });
      }
    }
  }

  return errors;
}

/**
 * Validate props.
 *
 * Two call patterns:
 * 1. `validateProps(defs, passedProps, componentName?)` — direct validation
 * 2. `validateProps(parentSource, resolveComponent)` — SFC-based validation
 */
export function validateProps(
  defsOrSource: PropDef[] | string,
  propsOrResolver: Record<string, unknown> | ((name: string) => string | null),
  componentName?: string,
): PropError[] {
  // Pattern 1: direct validation with PropDef[]
  if (Array.isArray(defsOrSource)) {
    return validatePropsAgainst(
      defsOrSource,
      propsOrResolver as Record<string, unknown>,
      componentName,
    );
  }

  // Pattern 2: SFC-based validation
  const parentSource = defsOrSource;
  const resolveComponent = propsOrResolver as (name: string) => string | null;
  const errors: PropError[] = [];
  const sfc = parse(parentSource);
  if (!sfc.template) return errors;

  const nodes = parseTemplate(sfc.template.content);
  checkNodes(nodes, resolveComponent, errors);
  return errors;
}

function checkNodes(
  nodes: TemplateNode[],
  resolveComponent: (name: string) => string | null,
  errors: PropError[],
): void {
  for (const node of nodes) {
    if (node.type === 'component' && node.tag) {
      checkComponentProps(node, resolveComponent, errors);
    }
    if (node.children) {
      checkNodes(node.children, resolveComponent, errors);
    }
  }
}

function checkComponentProps(
  node: TemplateNode,
  resolveComponent: (name: string) => string | null,
  errors: PropError[],
): void {
  const tag = node.tag!;
  const childSource = resolveComponent(tag);
  if (!childSource) return; // Can't resolve — skip

  const propDefs = extractPropDefs(childSource);
  if (propDefs.length === 0) return; // No Props interface — skip

  const passedProps = new Set(
    (node.attrs ?? []).map(a => a.name).filter(n => !n.startsWith('on')),
  );

  // Check for missing required props
  for (const def of propDefs) {
    if (!def.optional && !passedProps.has(def.name) && def.name !== 'children') {
      errors.push({
        component: tag,
        prop: def.name,
        message: `Missing required prop "${def.name}" on <${tag}>. Expected type: ${def.type}`,
      });
    }
  }

  // Check for unknown props
  const knownProps = new Set(propDefs.map(d => d.name));
  knownProps.add('children');
  knownProps.add('key');
  knownProps.add('ref');

  for (const attr of node.attrs ?? []) {
    if (attr.name.startsWith('on')) continue; // Event handlers are always OK
    if (!knownProps.has(attr.name)) {
      errors.push({
        component: tag,
        prop: attr.name,
        message: `Unknown prop "${attr.name}" on <${tag}>. Available: ${propDefs.map(d => d.name).join(', ')}`,
      });
    }
  }
}
