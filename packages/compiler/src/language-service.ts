/**
 * Language service for .akash files.
 *
 * Provides IDE features: completion, diagnostics, hover info,
 * and go-to-definition for templates. Used by the VS Code extension
 * and any LSP-compatible editor.
 */

import { parse } from './parse.js';
import { parseTemplate } from './template.js';
import { getTsDiagnostics, getTsCompletions, getTsHoverInfo } from './ts-service.js';
import type { ParsedSFC } from './types.js';
import type { TemplateNode } from './template.js';

// =========================================================================
// Types
// =========================================================================

export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface Diagnostic {
  range: Range;
  message: string;
  severity: 'error' | 'warning' | 'info' | 'hint';
  code?: string;
}

export interface CompletionItem {
  label: string;
  kind: 'component' | 'attribute' | 'directive' | 'event' | 'property' | 'value';
  detail?: string;
  documentation?: string;
  insertText?: string;
}

export interface HoverInfo {
  contents: string;
  range?: Range;
}

export interface Definition {
  file: string;
  range: Range;
}

// =========================================================================
// Built-in completions database
// =========================================================================

const RUNTIME_APIS: CompletionItem[] = [
  { label: 'signal', kind: 'property', detail: 'signal<T>(initial: T): Signal<T>', documentation: 'Create a reactive signal' },
  { label: 'computed', kind: 'property', detail: 'computed<T>(fn: () => T): ReadonlySignal<T>', documentation: 'Create a derived reactive value' },
  { label: 'effect', kind: 'property', detail: 'effect(fn: () => void): () => void', documentation: 'Run a side-effect when dependencies change' },
  { label: 'batch', kind: 'property', detail: 'batch(fn: () => void): void', documentation: 'Batch signal updates' },
  { label: 'untrack', kind: 'property', detail: 'untrack<T>(fn: () => T): T', documentation: 'Read signals without tracking' },
  { label: 'onMount', kind: 'property', detail: 'onMount(fn: () => void | (() => void)): void', documentation: 'Run after component mounts' },
  { label: 'onUnmount', kind: 'property', detail: 'onUnmount(fn: () => void): void', documentation: 'Run before component unmounts' },
  { label: 'provide', kind: 'property', detail: 'provide<T>(key: InjectionKey<T>, value: T): void', documentation: 'Provide a value to descendants' },
  { label: 'inject', kind: 'property', detail: 'inject<T>(key: InjectionKey<T>): T', documentation: 'Inject a value from ancestors' },
  { label: 'defineStore', kind: 'property', detail: 'defineStore(id, config): () => Store', documentation: 'Define a global store' },
  { label: 'useHead', kind: 'property', detail: 'useHead(config: HeadConfig): void', documentation: 'Manage document head tags' },
  { label: 'cx', kind: 'property', detail: 'cx(...inputs): string', documentation: 'Merge CSS class names' },
  { label: 'pipe', kind: 'property', detail: 'pipe(value, transform, ...args): any', documentation: 'Apply a pipe transform' },
];

const BUILT_IN_COMPONENTS: CompletionItem[] = [
  { label: 'Show', kind: 'component', detail: '<Show when={condition}>{value => ...}</Show>', documentation: 'Conditional rendering with type narrowing' },
  { label: 'For', kind: 'component', detail: '<For each={items} key={fn}>{item => ...}</For>', documentation: 'List rendering with keyed reconciliation' },
  { label: 'Switch', kind: 'component', detail: '<Switch on={value} cases={...} />', documentation: 'Switch/case rendering' },
  { label: 'Portal', kind: 'component', detail: '<Portal target="selector">...</Portal>', documentation: 'Render into different DOM node' },
  { label: 'Transition', kind: 'component', detail: '<Transition name="fade" when={show}>...</Transition>', documentation: 'CSS enter/exit transitions' },
  { label: 'ErrorBoundary', kind: 'component', detail: '<ErrorBoundary fallback={fn}>...</ErrorBoundary>', documentation: 'Catch errors from children' },
  { label: 'Suspense', kind: 'component', detail: '<Suspense fallback={fn}>...</Suspense>', documentation: 'Show fallback during async loading' },
  { label: 'VirtualFor', kind: 'component', detail: '<VirtualFor each={items} itemHeight={40}>...</VirtualFor>', documentation: 'Virtual scrolling for large lists' },
  { label: 'Image', kind: 'component', detail: '<Image src="..." alt="..." />', documentation: 'Optimized image with lazy loading' },
];

const DIRECTIVES: CompletionItem[] = [
  { label: ':if', kind: 'directive', detail: ':if={condition}', documentation: 'Conditional rendering' },
  { label: ':for', kind: 'directive', detail: ':for={item of items()}', documentation: 'List rendering' },
  { label: ':show', kind: 'directive', detail: ':show={condition}', documentation: 'Toggle visibility (display)' },
  { label: ':key', kind: 'directive', detail: ':key={uniqueId}', documentation: 'Reconciliation key for lists' },
  { label: 'bind:value', kind: 'directive', detail: 'bind:value={signal}', documentation: 'Two-way binding' },
  { label: 'bind:checked', kind: 'directive', detail: 'bind:checked={signal}', documentation: 'Two-way checkbox binding' },
];

const HTML_EVENTS: CompletionItem[] = [
  'onClick', 'onInput', 'onChange', 'onSubmit', 'onKeyDown', 'onKeyUp',
  'onFocus', 'onBlur', 'onMouseEnter', 'onMouseLeave', 'onScroll',
  'onLoad', 'onError', 'onResize', 'onPointerDown', 'onPointerUp',
].map((name) => ({
  label: name,
  kind: 'event' as const,
  detail: `${name}={(e) => { ... }}`,
  documentation: `${name.slice(2)} event handler`,
}));

// =========================================================================
// Language service implementation
// =========================================================================

/**
 * Create a language service instance for .akash files.
 */
export function createLanguageService() {
  return {
    /**
     * Get diagnostics for an .akash file.
     */
    getDiagnostics(source: string, filename?: string): Diagnostic[] {
      const diagnostics: Diagnostic[] = [];

      try {
        const sfc = parse(source);

        // Check for missing template
        if (!sfc.template) {
          diagnostics.push({
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
            message: 'Missing <template> block',
            severity: 'warning',
          });
        }

        // Check template for common issues
        if (sfc.template) {
          const nodes = parseTemplate(sfc.template.content);
          validateNodes(nodes, diagnostics, sfc.template.start);
        }

        // TypeScript diagnostics (script block type errors + template expression errors)
        try {
          const tsDiags = getTsDiagnostics(source, filename);
          for (const td of tsDiags) {
            diagnostics.push({
              range: {
                start: { line: td.line, character: td.column },
                end: { line: td.line, character: td.column + 1 },
              },
              message: td.message,
              severity: td.severity === 'error' ? 'error' : td.severity === 'warning' ? 'warning' : 'info',
              code: td.code,
            });
          }
        } catch {
          // TypeScript not available or failed — skip TS diagnostics
        }
      } catch (err) {
        diagnostics.push({
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
          message: `Parse error: ${err instanceof Error ? err.message : String(err)}`,
          severity: 'error',
        });
      }

      return diagnostics;
    },

    /**
     * Get completion items at a position.
     */
    getCompletions(source: string, positionOrFilename?: Position | string | any, maybePosition?: Position | any): CompletionItem[] {
      // Support (source, position), (source, filename, position), and { line, column } as alias for { line, character }
      const rawPos = maybePosition ?? (typeof positionOrFilename === 'object' ? positionOrFilename! : { line: 0, character: 0 });
      const position: Position = { line: rawPos.line ?? 0, character: rawPos.character ?? rawPos.column ?? 0 };
      const filename = typeof positionOrFilename === 'string' ? positionOrFilename : undefined;
      const line = source.split('\n')[position.line] ?? '';
      const before = line.slice(0, position.character);

      // Inside <script> — TypeScript completions + runtime APIs
      if (isInScript(source, position)) {
        try {
          const tsCompletions = getTsCompletions(source, position, filename);
          if (tsCompletions.length > 0) {
            return tsCompletions.map(c => ({
              label: c.label,
              kind: 'property' as const,
              detail: c.detail,
              sortText: c.sortText,
            }));
          }
        } catch { /* fall through to static completions */ }
        return [...RUNTIME_APIS];
      }

      // Inside <template>
      if (isInTemplate(source, position)) {
        // After < — suggest components and HTML tags
        if (before.endsWith('<') || /^<[A-Z]/.test(before.trimStart())) {
          return [...BUILT_IN_COMPONENTS];
        }

        // After : — suggest directives
        if (before.endsWith(':') || before.includes(':')) {
          return [...DIRECTIVES];
        }

        // Inside a tag — suggest attributes and events
        if (isInsideTag(before)) {
          return [...DIRECTIVES, ...HTML_EVENTS];
        }

        return [...BUILT_IN_COMPONENTS, ...DIRECTIVES];
      }

      return [];
    },

    /**
     * Get hover information at a position.
     */
    getHoverInfo(source: string, positionOrFilename?: Position | string | any, maybePosition?: Position | any): HoverInfo | null {
      const rawPos = maybePosition ?? (typeof positionOrFilename === 'object' ? positionOrFilename! : { line: 0, character: 0 });
      const position: Position = { line: rawPos.line ?? 0, character: rawPos.character ?? rawPos.column ?? 0 };
      const filename = typeof positionOrFilename === 'string' ? positionOrFilename : undefined;
      const line = source.split('\n')[position.line] ?? '';
      const word = getWordAt(line, position.character);

      // Try TypeScript hover first (gives type information)
      try {
        const tsHover = getTsHoverInfo(source, position, filename);
        if (tsHover) {
          return {
            contents: tsHover.content + (tsHover.documentation ? `\n\n${tsHover.documentation}` : ''),
          };
        }
      } catch { /* fall through */ }

      // Check runtime APIs
      const api = RUNTIME_APIS.find((a) => a.label === word);
      if (api) {
        return { contents: `**${api.label}**\n\n${api.detail}\n\n${api.documentation}` };
      }

      // Check components
      const comp = BUILT_IN_COMPONENTS.find((c) => c.label === word);
      if (comp) {
        return { contents: `**${comp.label}**\n\n${comp.detail}\n\n${comp.documentation}` };
      }

      return null;
    },

    /**
     * Get all available completions (for external tooling).
     */
    getAllCompletions(): {
      apis: CompletionItem[];
      components: CompletionItem[];
      directives: CompletionItem[];
      events: CompletionItem[];
    } {
      return {
        apis: RUNTIME_APIS,
        components: BUILT_IN_COMPONENTS,
        directives: DIRECTIVES,
        events: HTML_EVENTS,
      };
    },
  };
}

// =========================================================================
// Validation helpers
// =========================================================================

function validateNodes(nodes: TemplateNode[], diagnostics: Diagnostic[], baseOffset: number): void {
  for (const node of nodes) {
    // Check for img without alt
    if (node.type === 'element' && node.tag === 'img') {
      const hasAlt = node.attrs?.some((a) => a.name === 'alt');
      if (!hasAlt) {
        diagnostics.push({
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
          message: '<img> element should have an alt attribute for accessibility',
          severity: 'warning',
          code: 'a11y-img-alt',
        });
      }
    }

    // Check for button without type
    if (node.type === 'element' && node.tag === 'button') {
      const hasType = node.attrs?.some((a) => a.name === 'type');
      if (!hasType) {
        diagnostics.push({
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
          message: '<button> should have an explicit type attribute (type="button" or type="submit")',
          severity: 'hint',
          code: 'a11y-button-type',
        });
      }
    }

    // Recurse children
    if (node.children) {
      validateNodes(node.children, diagnostics, baseOffset);
    }
  }
}

// =========================================================================
// Position helpers
// =========================================================================

function isInScript(source: string, pos: Position): boolean {
  const lines = source.split('\n');
  let inScript = false;
  for (let i = 0; i <= pos.line && i < lines.length; i++) {
    if (lines[i].includes('<script')) inScript = true;
    if (lines[i].includes('</script>')) inScript = false;
  }
  return inScript;
}

function isInTemplate(source: string, pos: Position): boolean {
  const lines = source.split('\n');
  let inTemplate = false;
  for (let i = 0; i <= pos.line && i < lines.length; i++) {
    if (lines[i].includes('<template>')) inTemplate = true;
    if (lines[i].includes('</template>')) inTemplate = false;
  }
  return inTemplate;
}

function isInsideTag(before: string): boolean {
  const lastOpen = before.lastIndexOf('<');
  const lastClose = before.lastIndexOf('>');
  return lastOpen > lastClose;
}

function getWordAt(line: string, col: number): string {
  let start = col;
  let end = col;
  while (start > 0 && /\w/.test(line[start - 1])) start--;
  while (end < line.length && /\w/.test(line[end])) end++;
  return line.slice(start, end);
}
