/**
 * Source map generation for .akash → .js transforms.
 *
 * Generates V3 source maps that map compiled output back to the
 * original .akash file positions (script, template, style blocks).
 */

// --- VLQ encoding for source maps ---

const VLQ_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Encode a signed integer as a VLQ base64 string.
 */
export function encodeVLQ(value: number): string {
  let result = '';
  let vlq = value < 0 ? (-value << 1) | 1 : value << 1;

  do {
    let digit = vlq & 0x1f;
    vlq >>>= 5;
    if (vlq > 0) digit |= 0x20;
    result += VLQ_CHARS[digit];
  } while (vlq > 0);

  return result;
}

// --- Source map builder ---

export interface SourceMapping {
  /** Generated line (0-based) */
  generatedLine: number;
  /** Generated column (0-based) */
  generatedColumn: number;
  /** Original line (0-based) */
  originalLine: number;
  /** Original column (0-based) */
  originalColumn: number;
  /** Source file index */
  source?: number;
}

export interface SourceMap {
  version: 3;
  file: string;
  sources: string[];
  sourcesContent: (string | null)[];
  names: string[];
  mappings: string;
}

/**
 * Build a V3 source map from a list of mappings.
 */
export class SourceMapBuilder {
  private mappings: SourceMapping[] = [];
  private sources: string[] = [];
  private sourcesContent: (string | null)[] = [];

  /**
   * Add a source file.
   * @returns The source index.
   */
  addSource(filename: string, content?: string): number {
    const idx = this.sources.length;
    this.sources.push(filename);
    this.sourcesContent.push(content ?? null);
    return idx;
  }

  /**
   * Add a mapping from generated position to original position.
   */
  addMapping(mapping: SourceMapping): void {
    this.mappings.push(mapping);
  }

  /**
   * Add a 1:1 mapping for a range of lines.
   * Useful for script blocks that are mostly copied verbatim.
   */
  addLineRange(
    generatedStart: number,
    originalStart: number,
    lineCount: number,
    sourceIndex = 0,
  ): void {
    for (let i = 0; i < lineCount; i++) {
      this.addMapping({
        generatedLine: generatedStart + i,
        generatedColumn: 0,
        originalLine: originalStart + i,
        originalColumn: 0,
        source: sourceIndex,
      });
    }
  }

  /**
   * Generate the V3 source map JSON.
   */
  build(outputFilename: string): SourceMap {
    // Sort mappings by generated position
    const sorted = [...this.mappings].sort((a, b) =>
      a.generatedLine - b.generatedLine || a.generatedColumn - b.generatedColumn,
    );

    return {
      version: 3,
      file: outputFilename,
      sources: this.sources,
      sourcesContent: this.sourcesContent,
      names: [],
      mappings: encodeMappings(sorted),
    };
  }

  /**
   * Generate the source map as a JSON string.
   */
  toJSON(outputFilename: string): string {
    return JSON.stringify(this.build(outputFilename));
  }

  /**
   * Generate a data URL for inline source maps.
   */
  toDataUrl(outputFilename: string): string {
    const json = this.toJSON(outputFilename);
    const base64 = typeof btoa === 'function'
      ? btoa(json)
      : Buffer.from(json).toString('base64');
    return `data:application/json;charset=utf-8;base64,${base64}`;
  }
}

/**
 * Encode sorted mappings into the V3 mappings string format.
 */
function encodeMappings(mappings: SourceMapping[]): string {
  const lines: string[][] = [];
  let prevGeneratedLine = 0;
  let prevGeneratedColumn = 0;
  let prevOriginalLine = 0;
  let prevOriginalColumn = 0;
  let prevSource = 0;

  for (const mapping of mappings) {
    // Fill empty lines
    while (lines.length <= mapping.generatedLine) {
      lines.push([]);
    }

    // Reset column tracking at new lines
    if (mapping.generatedLine !== prevGeneratedLine) {
      prevGeneratedColumn = 0;
      prevGeneratedLine = mapping.generatedLine;
    }

    let segment = '';

    // Field 1: Generated column (relative)
    segment += encodeVLQ(mapping.generatedColumn - prevGeneratedColumn);
    prevGeneratedColumn = mapping.generatedColumn;

    // Fields 2-4: Source, original line, original column (all relative)
    const source = mapping.source ?? 0;
    segment += encodeVLQ(source - prevSource);
    prevSource = source;

    segment += encodeVLQ(mapping.originalLine - prevOriginalLine);
    prevOriginalLine = mapping.originalLine;

    segment += encodeVLQ(mapping.originalColumn - prevOriginalColumn);
    prevOriginalColumn = mapping.originalColumn;

    lines[mapping.generatedLine].push(segment);
  }

  return lines.map((segments) => segments.join(',')).join(';');
}

// --- Helper for .akash file source maps ---

/**
 * Create a source map for a compiled .akash file.
 *
 * Maps the script block lines 1:1 and provides approximate
 * mappings for the generated template code.
 */
export function createAkashSourceMap(
  filename: string,
  originalSource: string,
  scriptStartLine: number,
  scriptLineCount: number,
  generatedScriptStartLine: number,
): SourceMapBuilder {
  const builder = new SourceMapBuilder();
  builder.addSource(filename, originalSource);

  // Map script lines 1:1
  builder.addLineRange(
    generatedScriptStartLine,
    scriptStartLine,
    scriptLineCount,
    0,
  );

  return builder;
}
