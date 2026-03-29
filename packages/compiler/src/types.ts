/** Parsed blocks from an .akash single-file component */
export interface ParsedSFC {
  script: ScriptBlock | null;
  template: TemplateBlock | null;
  style: StyleBlock | null;
}

export interface ScriptBlock {
  content: string;
  lang: string;
  start: number;
  end: number;
}

export interface TemplateBlock {
  content: string;
  start: number;
  end: number;
}

export interface StyleBlock {
  content: string;
  scoped: boolean;
  start: number;
  end: number;
}

/** Compiler output */
export interface CompileResult {
  code: string;
  css?: string;
  map?: null; // Source maps — future implementation
}

/** Compiler options */
export interface CompileOptions {
  filename?: string;
  dev?: boolean;
  scopeId?: string;
  /** Output mode: 'client' (DOM operations) or 'server' (string concatenation) */
  mode?: 'client' | 'server';
}
