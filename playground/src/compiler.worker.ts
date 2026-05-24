import { compile } from '@akashjs/compiler';

export interface CompileRequest {
  id: number;
  source: string;
  filename: string;
}

export interface CompileResponse {
  id: number;
  code: string | null;
  css: string | null;
  error: string | null;
}

self.onmessage = (e: MessageEvent<CompileRequest>) => {
  const { id, source, filename } = e.data;
  try {
    const result = compile(source, { filename, mode: 'client' });
    const response: CompileResponse = {
      id,
      code: result.code,
      css: result.css || null,
      error: null,
    };
    self.postMessage(response);
  } catch (err: any) {
    const response: CompileResponse = {
      id,
      code: null,
      css: null,
      error: err.message || String(err),
    };
    self.postMessage(response);
  }
};
