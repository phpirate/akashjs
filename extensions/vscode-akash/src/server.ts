/**
 * AkashJS Language Server.
 *
 * Provides diagnostics, completions, hover, and go-to-definition
 * for .akash single-file components via the Language Server Protocol.
 */

import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  InitializeResult,
  TextDocumentSyncKind,
  CompletionItem as LSPCompletionItem,
  CompletionItemKind,
  Diagnostic as LSPDiagnostic,
  DiagnosticSeverity,
  Hover,
  MarkupKind,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { createLanguageService } from '@akashjs/compiler';
import type { Diagnostic, CompletionItem, HoverInfo } from '@akashjs/compiler';

// Create connection and document manager
const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);
const langService = createLanguageService();

connection.onInitialize((params: InitializeParams): InitializeResult => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        triggerCharacters: ['<', '{', ':', '.', '"', "'", ' '],
        resolveProvider: false,
      },
      hoverProvider: true,
    },
  };
});

// --- Diagnostics ---

function validateDocument(doc: TextDocument): void {
  const source = doc.getText();
  const diags = langService.getDiagnostics(source, doc.uri);

  const lspDiags: LSPDiagnostic[] = diags.map(d => ({
    range: {
      start: { line: d.range.start.line, character: d.range.start.character },
      end: { line: d.range.end.line, character: d.range.end.character },
    },
    message: d.message,
    severity: toSeverity(d.severity),
    source: 'akashjs',
    code: d.code,
  }));

  connection.sendDiagnostics({ uri: doc.uri, diagnostics: lspDiags });
}

function toSeverity(s: Diagnostic['severity']): DiagnosticSeverity {
  switch (s) {
    case 'error': return DiagnosticSeverity.Error;
    case 'warning': return DiagnosticSeverity.Warning;
    case 'info': return DiagnosticSeverity.Information;
    case 'hint': return DiagnosticSeverity.Hint;
  }
}

documents.onDidChangeContent(change => validateDocument(change.document));
documents.onDidOpen(change => validateDocument(change.document));

// --- Completions ---

const COMPLETION_KIND_MAP: Record<CompletionItem['kind'], CompletionItemKind> = {
  component: CompletionItemKind.Class,
  attribute: CompletionItemKind.Property,
  directive: CompletionItemKind.Keyword,
  event: CompletionItemKind.Event,
  property: CompletionItemKind.Field,
  value: CompletionItemKind.Value,
};

connection.onCompletion((params): LSPCompletionItem[] => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];

  const source = doc.getText();
  const pos = { line: params.position.line, character: params.position.character };
  const items = langService.getCompletions(source, pos);

  return items.map((item, i) => ({
    label: item.label,
    kind: COMPLETION_KIND_MAP[item.kind] ?? CompletionItemKind.Text,
    detail: item.detail,
    documentation: item.documentation ? {
      kind: MarkupKind.Markdown,
      value: item.documentation,
    } : undefined,
    insertText: item.insertText ?? item.label,
    sortText: String(i).padStart(4, '0'),
  }));
});

// --- Hover ---

connection.onHover((params): Hover | null => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;

  const source = doc.getText();
  const pos = { line: params.position.line, character: params.position.character };
  const info = langService.getHoverInfo(source, pos);
  if (!info) return null;

  const lines: string[] = [];
  if (info.label) lines.push(`**${info.label}**`);
  if (info.detail) lines.push(`\`${info.detail}\``);
  if (info.documentation) lines.push(info.documentation);

  return {
    contents: {
      kind: MarkupKind.Markdown,
      value: lines.join('\n\n'),
    },
  };
});

// Start listening
documents.listen(connection);
connection.listen();
