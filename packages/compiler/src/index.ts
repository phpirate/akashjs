// @akashjs/compiler — Entry point
export { parse } from './parse.js';
export { transform } from './transform.js';
export { scopeStyles, generateScopeId } from './style.js';
export { parseTemplate } from './template.js';
export { analyzeTemplate, isStaticExpression } from './analyze.js';
export { SourceMapBuilder, encodeVLQ, createAkashSourceMap } from './sourcemap.js';
export type { ParsedSFC, CompileResult, CompileOptions } from './types.js';
export type { TemplateNode, Directive } from './template.js';
export type { AnalysisResult, SignalRead, EventHandler, ReactiveExpression } from './analyze.js';
export type { SourceMap, SourceMapping } from './sourcemap.js';
export {
  isStaticNode, staticNodeToHtml, extractHoistedTemplates,
  generateHoistedDeclarations, getHoistedVar, getOptimizationStats,
} from './optimize.js';
export type { HoistedTemplate, OptimizationStats } from './optimize.js';
export { createLanguageService } from './language-service.js';
export type { Diagnostic, CompletionItem, HoverInfo, Position, Range, Definition } from './language-service.js';
export { validateProps, validatePropsAgainst, extractPropDefs } from './prop-checker.js';
export type { PropError } from './prop-checker.js';
export { getTsDiagnostics, getTsCompletions, getTsHoverInfo, akashToVirtualTs } from './ts-service.js';

import { parse } from './parse.js';
import { transform } from './transform.js';
import type { CompileOptions, CompileResult } from './types.js';

/**
 * Compile an .akash single-file component to JavaScript + CSS.
 *
 * This is the main entry point for the compiler.
 */
export function compile(source: string, options: CompileOptions = {}): CompileResult {
  const sfc = parse(source);
  return transform(sfc, options);
}
