/**
 * TypeScript integration for .akash language service.
 *
 * Transforms .akash source into a virtual .ts file, runs TypeScript's
 * language service on it, and maps results back to original positions.
 */

import ts from 'typescript';
import { parse } from './parse.js';
import { parseTemplate, type TemplateNode } from './template.js';

// --- Virtual .ts generation ---

interface VirtualTsResult {
  content: string;
  /** Map from virtual .ts line number to original .akash line number */
  lineMap: Map<number, number>;
  /** Offset of the script block in the original .akash source */
  scriptOffset: number;
  /** Line where template expressions start in the virtual file */
  templateExprStart: number;
}

/**
 * Transform .akash source into a virtual .ts file for TypeScript analysis.
 */
export function akashToVirtualTs(source: string): VirtualTsResult {
  const sfc = parse(source);
  const lines: string[] = [];
  const lineMap = new Map<number, number>();
  let scriptOffset = 0;

  // Make it a module to avoid global scope conflicts (e.g., const name = ...)
  lines.push('export {};');
  // Runtime type declarations so TS knows about signal, computed, etc.
  lines.push('declare function signal<T>(v: T): { (): T; set(v: T): void; update(fn: (p: T) => T): void; peek(): T; };');
  lines.push('declare function computed<T>(fn: () => T): () => T;');
  lines.push('declare function effect(fn: () => void | (() => void), opts?: { render?: boolean }): () => void;');
  lines.push('declare function batch(fn: () => void): void;');
  lines.push('declare function untrack<T>(fn: () => T): T;');
  lines.push('declare function onMount(fn: () => void | (() => void)): void;');
  lines.push('declare function onUnmount(fn: () => void): void;');
  lines.push('declare function ref<T>(): { current: T | null };');
  lines.push('');

  const declLines = lines.length;

  // Script block — insert verbatim with line mapping
  if (sfc.script) {
    const scriptContent = sfc.script.content;
    const sourceLines = source.split('\n');

    // Find the line number of <script> tag in original source
    let scriptTagLine = 0;
    for (let i = 0; i < sourceLines.length; i++) {
      if (sourceLines[i].includes('<script')) {
        scriptTagLine = i + 1; // content starts on next line
        break;
      }
    }
    scriptOffset = scriptTagLine;

    const scriptLines = scriptContent.split('\n');
    for (let i = 0; i < scriptLines.length; i++) {
      const virtualLine = lines.length;
      const originalLine = scriptTagLine + i;
      lineMap.set(virtualLine, originalLine);
      lines.push(scriptLines[i]);
    }
  }

  lines.push('');

  // Template expressions — extract and add as type-checked statements
  const templateExprStart = lines.length;
  if (sfc.template) {
    const nodes = parseTemplate(sfc.template.content);

    // Find template start line
    const sourceLines = source.split('\n');
    let templateTagLine = 0;
    for (let i = 0; i < sourceLines.length; i++) {
      if (sourceLines[i].includes('<template')) {
        templateTagLine = i + 1;
        break;
      }
    }

    // Add props context if Props interface exists
    const hasProps = sfc.script?.content.includes('interface Props');
    if (hasProps) {
      lines.push('declare const ctx: { props: Props; children: () => any };');
    } else {
      lines.push('declare const ctx: { props: { [key: string]: any }; children: () => any };');
    }

    lines.push('void function __templateExpressions() {');
    extractExpressions(nodes, lines, lineMap, templateTagLine);
    lines.push('};');
  }

  return {
    content: lines.join('\n'),
    lineMap,
    scriptOffset,
    templateExprStart,
  };
}

function extractExpressions(
  nodes: TemplateNode[],
  lines: string[],
  lineMap: Map<number, number>,
  baseOffset: number,
): void {
  for (const node of nodes) {
    if (node.type === 'expression' && node.content) {
      const virtualLine = lines.length;
      lineMap.set(virtualLine, baseOffset);
      lines.push(`  void (${node.content});`);
    }
    if (node.attrs) {
      for (const attr of node.attrs) {
        if (attr.dynamic) {
          const virtualLine = lines.length;
          lineMap.set(virtualLine, baseOffset);
          lines.push(`  void (${attr.value});`);
        }
      }
    }
    if (node.children) {
      extractExpressions(node.children, lines, lineMap, baseOffset);
    }
  }
}

// --- TypeScript Language Service Host ---

function createVirtualHost(
  files: Record<string, string>,
): ts.LanguageServiceHost {
  const fileVersions = new Map<string, number>();

  return {
    getScriptFileNames: () => [
      ...Object.keys(files),
      ts.getDefaultLibFilePath({ target: ts.ScriptTarget.ES2022 }),
    ],
    getScriptVersion: (fileName) => String(fileVersions.get(fileName) ?? 0),
    getScriptSnapshot: (fileName) => {
      const content = files[fileName] ?? ts.sys.readFile(fileName);
      if (content == null) return undefined;
      return ts.ScriptSnapshot.fromString(content);
    },
    getCurrentDirectory: () => '/',
    getCompilationSettings: () => ({
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      strict: true,
      jsx: ts.JsxEmit.Preserve,
      noEmit: true,
      skipLibCheck: true,
      allowJs: true,
    }),
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: (path) => path in files || ts.sys.fileExists(path),
    readFile: (path) => files[path] ?? ts.sys.readFile(path),
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
  };
}

// --- Position mapping ---

function mapPositionToOffset(
  virtual: VirtualTsResult,
  source: string,
  position: { line: number; character: number },
): number {
  const lines = virtual.content.split('\n');

  // First try: direct line mapping (works for script block)
  let virtualLine = -1;
  for (const [vLine, oLine] of virtual.lineMap) {
    if (oLine === position.line) {
      virtualLine = vLine;
      break;
    }
  }

  // If no direct mapping found, check if position is inside template
  // and find the corresponding expression line in the virtual file
  if (virtualLine === -1) {
    // Check if inside template block
    const sourceLines = source.split('\n');
    let inTemplate = false;
    for (let i = 0; i <= position.line && i < sourceLines.length; i++) {
      if (sourceLines[i].includes('<template')) inTemplate = true;
      if (sourceLines[i].includes('</template>')) inTemplate = false;
    }

    if (inTemplate) {
      // For template positions, place the cursor inside __templateExpressions
      // where the script-scope variables are accessible
      // Find the __templateExpressions function body
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('__templateExpressions')) {
          virtualLine = i + 1; // inside the function body
          break;
        }
      }
    }

    if (virtualLine === -1) virtualLine = position.line;
  }

  // Calculate character offset
  let offset = 0;
  for (let i = 0; i < virtualLine && i < lines.length; i++) {
    offset += lines[i].length + 1; // +1 for newline
  }
  offset += position.character;

  return Math.min(offset, virtual.content.length - 1);
}

// --- Cached service ---

let cachedService: ts.LanguageService | null = null;
let cachedFiles: Record<string, string> = {};
let cachedVirtual: VirtualTsResult | null = null;
let cachedSource: string | null = null;
let cachedFilename: string | null = null;
let fileVersion = 0;

function getService(filename: string, virtualTs: VirtualTsResult, source: string): ts.LanguageService {
  const virtualFilename = filename.replace('.akash', '.ts');

  // Reuse cached service if same file with same content
  if (cachedService && cachedFilename === virtualFilename && cachedSource === source) {
    return cachedService;
  }

  // If same filename but different content, update in place
  if (cachedService && cachedFilename === virtualFilename) {
    cachedFiles[virtualFilename] = virtualTs.content;
    cachedSource = source;
    fileVersion++;
    return cachedService;
  }

  // New file — recreate service
  cachedFiles = { [virtualFilename]: virtualTs.content };
  cachedVirtual = virtualTs;
  cachedSource = source;
  cachedFilename = virtualFilename;
  fileVersion++;

  const host = createVirtualHost(cachedFiles);
  const origGetVersion = host.getScriptVersion;
  host.getScriptVersion = (f) => f === virtualFilename ? String(fileVersion) : origGetVersion(f);

  cachedService = ts.createLanguageService(host);
  return cachedService;
}

// --- Public API ---

export interface TsDiagnostic {
  message: string;
  severity: 'error' | 'warning' | 'info';
  line: number;
  column: number;
  code: string;
}

export function getTsDiagnostics(source: string, filename = 'component.akash'): TsDiagnostic[] {
  const virtual = akashToVirtualTs(source);
  const service = getService(filename, virtual, source);
  const virtualFilename = filename.replace('.akash', '.ts');

  const syntactic = service.getSyntacticDiagnostics(virtualFilename);
  const semantic = service.getSemanticDiagnostics(virtualFilename);
  const allDiags = [...syntactic, ...semantic];

  const results: TsDiagnostic[] = [];
  for (const d of allDiags) {
    if (d.file && d.start != null) {
      const pos = d.file.getLineAndCharacterOfPosition(d.start);
      const originalLine = virtual.lineMap.get(pos.line) ?? pos.line;

      // Skip diagnostics from our injected declarations
      if (pos.line < virtual.scriptOffset && !virtual.lineMap.has(pos.line)) continue;

      // Skip diagnostics from template expression section — these are unreliable
      // since template JSX syntax doesn't translate cleanly to TypeScript
      if (pos.line >= virtual.templateExprStart) continue;

      results.push({
        message: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
        severity: d.category === ts.DiagnosticCategory.Error ? 'error'
          : d.category === ts.DiagnosticCategory.Warning ? 'warning' : 'info',
        line: originalLine,
        column: pos.character,
        code: `TS${d.code}`,
      });
    }
  }

  return results;
}

export function getTsCompletions(
  source: string,
  position: { line: number; character: number },
  filename = 'component.akash',
): Array<{ label: string; kind: string; detail?: string; sortText?: string }> {
  const virtual = akashToVirtualTs(source);
  const service = getService(filename, virtual, source);
  const virtualFilename = filename.replace('.akash', '.ts');

  // Map position to virtual .ts offset
  const offset = mapPositionToOffset(virtual, source, position);

  const completions = service.getCompletionsAtPosition(virtualFilename, offset, {
    includeCompletionsForModuleExports: false,
    includeCompletionsWithInsertText: true,
  });

  if (!completions) return [];

  return completions.entries.slice(0, 50).map(e => ({
    label: e.name,
    kind: ts.ScriptElementKind[e.kind] ?? e.kind,
    detail: e.labelDetails?.detail,
    sortText: e.sortText,
  }));
}

export function getTsHoverInfo(
  source: string,
  position: { line: number; character: number },
  filename = 'component.akash',
): { content: string; documentation?: string } | null {
  const virtual = akashToVirtualTs(source);
  const service = getService(filename, virtual, source);
  const virtualFilename = filename.replace('.akash', '.ts');

  // Map position to virtual .ts offset
  const offset = mapPositionToOffset(virtual, source, position);

  const info = service.getQuickInfoAtPosition(virtualFilename, offset);
  if (!info) return null;

  const content = ts.displayPartsToString(info.displayParts);
  const documentation = info.documentation ? ts.displayPartsToString(info.documentation) : undefined;

  return { content, documentation };
}
