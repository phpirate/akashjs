/**
 * Compiler optimizations — static hoisting.
 *
 * Detects fully static subtrees in templates and hoists them
 * into `<template>` + `cloneNode(true)` calls that execute once.
 * Dynamic parts are patched in after cloning.
 *
 * This is the key optimization that makes AkashJS competitive with
 * Svelte and Vue 3 on initial render performance.
 */

import type { TemplateNode } from './template.js';
import { analyzeTemplate } from './analyze.js';

// --- Static analysis ---

/**
 * Check if a node subtree is fully static (no signals, no directives,
 * no dynamic attributes, no components).
 */
export function isStaticNode(node: TemplateNode): boolean {
  if (node.type === 'expression') return false;
  if (node.type === 'component') return false;
  if (node.type === 'text') return true;

  // Element node
  if (node.directives && node.directives.length > 0) return false;
  if (node.attrs?.some((a) => a.dynamic)) return false;
  if (node.children?.some((c) => !isStaticNode(c))) return false;

  return true;
}

/**
 * Convert a static subtree to an HTML string for cloneNode.
 */
export function staticNodeToHtml(node: TemplateNode): string {
  switch (node.type) {
    case 'text':
      return node.content ?? '';

    case 'element': {
      let html = `<${node.tag}`;
      if (node.attrs) {
        for (const attr of node.attrs) {
          if (attr.name === 'class' || attr.name === 'className') {
            html += ` class="${attr.value}"`;
          } else {
            html += ` ${attr.name}="${attr.value}"`;
          }
        }
      }
      html += '>';
      if (node.children) {
        for (const child of node.children) {
          html += staticNodeToHtml(child);
        }
      }
      html += `</${node.tag}>`;
      return html;
    }

    default:
      return '';
  }
}

// --- Hoisting ---

export interface HoistedTemplate {
  /** Variable name for the template element */
  varName: string;
  /** HTML string for the template */
  html: string;
}

/**
 * Extract static subtrees from a template AST and return them
 * as hoisted templates. The original nodes are annotated with
 * a `hoisted` flag.
 */
export function extractHoistedTemplates(nodes: TemplateNode[]): HoistedTemplate[] {
  const templates: HoistedTemplate[] = [];
  let counter = 0;

  function visit(node: TemplateNode): void {
    if (node.type !== 'element') return;

    // Check if this entire subtree is static AND has children
    // (single text nodes aren't worth hoisting)
    if (isStaticNode(node) && node.children && node.children.length > 0) {
      const varName = `__hoisted_${counter++}`;
      templates.push({
        varName,
        html: staticNodeToHtml(node),
      });
      // Mark node as hoisted so code generator uses cloneNode
      (node as any)._hoisted = varName;
      return; // Don't descend into children
    }

    // Recurse into non-static children
    if (node.children) {
      for (const child of node.children) {
        visit(child);
      }
    }
  }

  for (const node of nodes) {
    visit(node);
  }

  return templates;
}

/**
 * Generate the hoisted template declarations.
 * These go at module scope (outside defineComponent) so they're
 * created once per module, not per component instance.
 */
export function generateHoistedDeclarations(templates: HoistedTemplate[]): string {
  if (templates.length === 0) return '';

  let code = '// Hoisted static templates (created once, cloned per instance)\n';
  for (const t of templates) {
    code += `const ${t.varName} = /*#__PURE__*/ (() => {\n`;
    code += `  const _t = document.createElement('template');\n`;
    code += `  _t.innerHTML = ${JSON.stringify(t.html)};\n`;
    code += `  return _t;\n`;
    code += `})();\n`;
  }
  return code;
}

/**
 * Check if a node was hoisted and return its variable name.
 */
export function getHoistedVar(node: TemplateNode): string | null {
  return (node as any)._hoisted ?? null;
}

// --- Statistics ---

export interface OptimizationStats {
  totalNodes: number;
  staticNodes: number;
  hoistedTemplates: number;
  staticRatio: number;
}

/**
 * Analyze a template and return optimization statistics.
 */
export function getOptimizationStats(nodes: TemplateNode[]): OptimizationStats {
  let totalNodes = 0;
  let staticNodes = 0;

  function count(node: TemplateNode): void {
    totalNodes++;
    if (isStaticNode(node)) staticNodes++;
    if (node.children) {
      for (const child of node.children) {
        count(child);
      }
    }
  }

  for (const node of nodes) {
    count(node);
  }

  const hoisted = extractHoistedTemplates(
    JSON.parse(JSON.stringify(nodes)), // clone to avoid mutation
  );

  return {
    totalNodes,
    staticNodes,
    hoistedTemplates: hoisted.length,
    staticRatio: totalNodes > 0 ? staticNodes / totalNodes : 0,
  };
}
