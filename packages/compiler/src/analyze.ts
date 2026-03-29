/**
 * Static analysis for .akash templates.
 *
 * Analyzes the template AST to classify expressions as static or dynamic,
 * track signal dependencies, and identify optimization opportunities.
 */

import type { TemplateNode, Directive } from './template.js';

// --- Analysis result types ---

export interface AnalysisResult {
  /** All signal reads found in the template */
  signalReads: SignalRead[];
  /** All event handlers found */
  eventHandlers: EventHandler[];
  /** Whether the template has any dynamic content */
  hasDynamicContent: boolean;
  /** Static elements that could use cloneNode optimization */
  staticSubtrees: TemplateNode[];
  /** Expressions that need reactive effects */
  reactiveExpressions: ReactiveExpression[];
  /** Components used in the template */
  componentRefs: string[];
}

export interface SignalRead {
  /** The expression containing the signal read */
  expression: string;
  /** Where in the template this read occurs */
  context: 'text' | 'attribute' | 'directive' | 'event';
  /** The parent element's tag */
  parentTag?: string;
}

export interface EventHandler {
  /** Event name (e.g., 'click') */
  event: string;
  /** Handler expression */
  handler: string;
  /** Element tag */
  tag: string;
}

export interface ReactiveExpression {
  /** The expression source */
  expression: string;
  /** What kind of binding this is */
  kind: 'text' | 'attribute' | 'conditional' | 'list';
  /** Target attribute name (for attribute bindings) */
  attributeName?: string;
}

// --- Analysis ---

/**
 * Analyze a template AST for signal reads, static/dynamic classification,
 * and optimization opportunities.
 */
export function analyzeTemplate(nodes: TemplateNode[]): AnalysisResult {
  const result: AnalysisResult = {
    signalReads: [],
    eventHandlers: [],
    hasDynamicContent: false,
    staticSubtrees: [],
    reactiveExpressions: [],
    componentRefs: [],
  };

  for (const node of nodes) {
    analyzeNode(node, result);
  }

  return result;
}

function analyzeNode(node: TemplateNode, result: AnalysisResult): void {
  switch (node.type) {
    case 'expression':
      result.hasDynamicContent = true;
      if (node.content) {
        result.reactiveExpressions.push({
          expression: node.content,
          kind: 'text',
        });
        extractSignalReads(node.content, 'text', result);
      }
      break;

    case 'element':
      analyzeElement(node, result);
      break;

    case 'component':
      if (node.tag) {
        result.componentRefs.push(node.tag);
      }
      result.hasDynamicContent = true;
      analyzeAttributes(node, result);
      if (node.children) {
        for (const child of node.children) {
          analyzeNode(child, result);
        }
      }
      break;

    case 'text':
      // Pure static — no analysis needed
      break;
  }
}

function analyzeElement(node: TemplateNode, result: AnalysisResult): void {
  const isDynamic = hasDynamicContent(node);

  // Check directives
  if (node.directives) {
    for (const dir of node.directives) {
      result.hasDynamicContent = true;
      analyzeDirective(dir, node, result);
    }
  }

  // Check attributes
  analyzeAttributes(node, result);

  // If fully static (no dynamic attrs, no directives, no dynamic children),
  // mark as a static subtree candidate
  if (!isDynamic && !node.directives?.length) {
    result.staticSubtrees.push(node);
  }

  // Recurse children
  if (node.children) {
    for (const child of node.children) {
      analyzeNode(child, result);
    }
  }
}

function analyzeAttributes(node: TemplateNode, result: AnalysisResult): void {
  if (!node.attrs) return;

  for (const attr of node.attrs) {
    if (attr.dynamic) {
      result.hasDynamicContent = true;

      if (attr.name.startsWith('on')) {
        // Event handler
        const event = attr.name.slice(2).toLowerCase();
        result.eventHandlers.push({
          event,
          handler: attr.value,
          tag: node.tag ?? 'unknown',
        });
      } else {
        // Dynamic attribute binding
        result.reactiveExpressions.push({
          expression: attr.value,
          kind: 'attribute',
          attributeName: attr.name,
        });
        extractSignalReads(attr.value, 'attribute', result);
      }
    }
  }
}

function analyzeDirective(
  dir: Directive,
  node: TemplateNode,
  result: AnalysisResult,
): void {
  switch (dir.name) {
    case 'if':
    case 'else-if':
    case 'show':
      result.reactiveExpressions.push({
        expression: dir.value,
        kind: 'conditional',
      });
      extractSignalReads(dir.value, 'directive', result);
      break;

    case 'for': {
      // Parse "item of items()" — the list expression is the reactive part
      const match = /\bof\s+(.+)$/.exec(dir.value);
      if (match) {
        result.reactiveExpressions.push({
          expression: match[1],
          kind: 'list',
        });
        extractSignalReads(match[1], 'directive', result);
      }
      break;
    }

    case 'bind': {
      result.reactiveExpressions.push({
        expression: dir.value,
        kind: 'attribute',
        attributeName: dir.value,
      });
      extractSignalReads(dir.value, 'directive', result);
      break;
    }
  }
}

// --- Signal read detection ---

/**
 * Heuristically detect signal reads in an expression.
 *
 * Looks for patterns like `foo()` where `foo` is likely a signal.
 * This is a heuristic — the actual tracking happens at runtime.
 */
function extractSignalReads(
  expression: string,
  context: SignalRead['context'],
  result: AnalysisResult,
): void {
  // Match function calls that look like signal reads: word()
  // Exclude known non-signals: console.log, Math.floor, etc.
  const KNOWN_NON_SIGNALS = new Set([
    'console', 'Math', 'JSON', 'Object', 'Array', 'String', 'Number',
    'Boolean', 'Date', 'RegExp', 'Error', 'Promise', 'parseInt', 'parseFloat',
    'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
    'document', 'window', 'navigator', 'fetch',
  ]);

  // Match identifier() patterns — likely signal reads
  const callPattern = /\b([a-zA-Z_$][\w$]*)\s*\(\s*\)/g;
  let match: RegExpExecArray | null;

  while ((match = callPattern.exec(expression)) !== null) {
    const name = match[1];
    if (!KNOWN_NON_SIGNALS.has(name)) {
      result.signalReads.push({
        expression: `${name}()`,
        context,
      });
    }
  }
}

// --- Helpers ---

/** Check if a node has any dynamic content (attributes or children) */
function hasDynamicContent(node: TemplateNode): boolean {
  if (node.attrs?.some((a) => a.dynamic)) return true;
  if (node.directives?.length) return true;
  if (node.children?.some((c) => c.type === 'expression' || c.type === 'component')) return true;
  if (node.children?.some((c) => hasDynamicContent(c))) return true;
  return false;
}

/**
 * Check if an expression is a pure static value (string literal, number, boolean).
 */
export function isStaticExpression(expr: string): boolean {
  const trimmed = expr.trim();
  // String literal
  if (/^['"`].*['"`]$/.test(trimmed)) return true;
  // Number
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return true;
  // Boolean
  if (trimmed === 'true' || trimmed === 'false') return true;
  // null/undefined
  if (trimmed === 'null' || trimmed === 'undefined') return true;
  return false;
}
