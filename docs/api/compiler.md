# @akashjs/compiler API

The compiler transforms `.akash` single-file components into optimized JavaScript with direct DOM operations.

## parse(source)

Parse an `.akash` file into its constituent blocks.

```ts
function parse(source: string): ParseResult;

interface ParseResult {
  script: { content: string; lang: string; start: number; end: number } | null;
  template: { content: string; start: number; end: number } | null;
  styles: Array<{ content: string; scoped: boolean; lang: string; start: number; end: number }>;
}
```

## parseTemplate(template)

Parse a template string into an AST.

```ts
function parseTemplate(template: string): TemplateNode[];
```

Node types: `Element`, `Text`, `Interpolation`, `Comment`, `Directive`.

## compile(source, options?)

Full compilation pipeline: parse, analyze, transform.

```ts
function compile(source: string, options?: CompileOptions): CompileResult;

interface CompileOptions {
  filename?: string;
  sourceMap?: boolean;
  mode?: 'client' | 'server';
}

interface CompileResult {
  code: string;
  map?: string;
}
```

## processStyles(styles, scopeId)

Process `<style>` blocks with optional scoping.

```ts
function processStyles(
  styles: Array<{ content: string; scoped: boolean }>,
  scopeId: string,
): string;
```

Scoped styles are transformed by adding `[data-s-{scopeId}]` attribute selectors.

## Analysis

### analyzeTemplate(nodes)

Analyze a parsed template AST for optimization opportunities and metadata.

```ts
function analyzeTemplate(nodes: TemplateNode[]): AnalysisResult;

interface AnalysisResult {
  staticNodes: number;
  dynamicNodes: number;
  bindings: string[];
  directives: string[];
  components: string[];
  hoistable: TemplateNode[];
}
```

## Optimization

### isStaticNode(node)

Check whether a template node is fully static (no bindings or directives).

```ts
function isStaticNode(node: TemplateNode): boolean;
```

### extractHoistedTemplates(nodes)

Extract static subtrees that can be hoisted out of the render path.

```ts
function extractHoistedTemplates(nodes: TemplateNode[]): {
  hoisted: TemplateNode[];
  remaining: TemplateNode[];
};
```

### generateHoistedDeclarations(hoisted)

Generate JavaScript variable declarations for hoisted static nodes.

```ts
function generateHoistedDeclarations(hoisted: TemplateNode[]): string;
```

### getOptimizationStats(source)

Return optimization statistics for a compiled component.

```ts
function getOptimizationStats(source: string): {
  totalNodes: number;
  staticNodes: number;
  hoistedNodes: number;
  dynamicBindings: number;
};
```

## Server Mode

When `mode: 'server'` is passed to `compile()`, the compiler generates string concatenation code instead of DOM operations. This output is suitable for server-side rendering.

```ts
const result = compile(source, { mode: 'server' });
// result.code contains string-concatenation render function
```

The server output returns an HTML string directly, avoiding any DOM API dependency.

## Language Service

### createLanguageService()

Create a language service instance for IDE integration. Provides diagnostics, completions, and hover information for `.akash` files.

```ts
function createLanguageService(): LanguageService;

interface LanguageService {
  getDiagnostics(fileName: string, source: string): Diagnostic[];
  getCompletions(fileName: string, source: string, position: number): CompletionItem[];
  getHoverInfo(fileName: string, source: string, position: number): HoverInfo | null;
  getAllCompletions(fileName: string, source: string, position: number): CompletionItem[];
}
```

### getDiagnostics(fileName, source)

Return an array of diagnostics (errors and warnings) for the given source.

```ts
interface Diagnostic {
  message: string;
  severity: 'error' | 'warning' | 'info';
  start: number;
  end: number;
  code?: string;
}
```

### getCompletions(fileName, source, position)

Return context-aware completions at the cursor position. Completes component names, props, directives, and signal references.

```ts
interface CompletionItem {
  label: string;
  kind: 'component' | 'prop' | 'directive' | 'signal' | 'keyword';
  detail?: string;
  insertText?: string;
}
```

### getHoverInfo(fileName, source, position)

Return type and documentation info for the symbol at the given position.

```ts
interface HoverInfo {
  text: string;
  range: { start: number; end: number };
}
```

### getAllCompletions(fileName, source, position)

Like `getCompletions()` but returns all possible completions without filtering by prefix. Useful for fuzzy-match UIs in editors.
