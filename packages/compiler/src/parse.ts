/**
 * .akash SFC parser.
 *
 * Extracts <script>, <template>, and <style> blocks from
 * a single-file component. Lightweight regex-based approach —
 * the three top-level tags are well-defined so a full HTML
 * parser is unnecessary.
 */

import type { ParsedSFC, ScriptBlock, TemplateBlock, StyleBlock } from './types.js';

export function parse(source: string): ParsedSFC {
  return {
    script: parseBlock<ScriptBlock>(source, 'script', (content, attrs, start, end) => ({
      content,
      lang: extractAttr(attrs, 'lang') ?? 'ts',
      start,
      end,
    })),
    template: parseBlock<TemplateBlock>(source, 'template', (content, _attrs, start, end) => ({
      content,
      start,
      end,
    })),
    style: parseAllBlocks<StyleBlock>(source, 'style', (content, attrs, start, end) => ({
      content,
      scoped: attrs.includes('scoped'),
      start,
      end,
    })),
  };
}

function parseBlock<T>(
  source: string,
  tag: string,
  factory: (content: string, attrs: string, start: number, end: number) => T,
): T | null {
  // Match <tag ...> ... </tag> — handles attributes like lang="ts" or scoped
  const openPattern = new RegExp(`<${tag}(\\b[^>]*)>`, 'i');
  const closePattern = new RegExp(`</${tag}>`, 'i');

  const openMatch = openPattern.exec(source);
  if (!openMatch) return null;

  const attrs = openMatch[1] ?? '';
  const contentStart = openMatch.index + openMatch[0].length;

  const closeMatch = closePattern.exec(source.slice(contentStart));
  if (!closeMatch) return null;

  const contentEnd = contentStart + closeMatch.index;
  const content = source.slice(contentStart, contentEnd);

  return factory(content.trim(), attrs, contentStart, contentEnd);
}

/**
 * Parse ALL occurrences of a block tag and merge their content.
 * Used for <style> blocks so multiple style blocks are combined.
 */
function parseAllBlocks<T extends { content: string }>(
  source: string,
  tag: string,
  factory: (content: string, attrs: string, start: number, end: number) => T,
): T | null {
  const openPattern = new RegExp(`<${tag}(\\b[^>]*)>`, 'gi');
  const closePattern = new RegExp(`</${tag}>`, 'i');

  let match: RegExpExecArray | null;
  let merged: T | null = null;

  while ((match = openPattern.exec(source)) !== null) {
    const attrs = match[1] ?? '';
    const contentStart = match.index + match[0].length;
    const closeMatch = closePattern.exec(source.slice(contentStart));
    if (!closeMatch) continue;

    const contentEnd = contentStart + closeMatch.index;
    const content = source.slice(contentStart, contentEnd).trim();

    if (!merged) {
      merged = factory(content, attrs, contentStart, contentEnd);
    } else {
      merged.content += '\n' + content;
    }

    // Advance past the close tag so openPattern finds the next one
    openPattern.lastIndex = contentEnd + closeMatch[0].length;
  }

  return merged;
}

function extractAttr(attrs: string, name: string): string | null {
  const match = new RegExp(`${name}=["']([^"']+)["']`).exec(attrs);
  return match?.[1] ?? null;
}
