/**
 * AkashJS VS Code Extension — Client.
 *
 * Activates the language server for .akash files,
 * providing diagnostics, completions, and hover.
 */

import * as path from 'path';
import { workspace, ExtensionContext } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: ExtensionContext): void {
  // Path to the server module
  const serverModule = context.asAbsolutePath(path.join('dist', 'server.js'));

  // Server options — run in Node with IPC transport
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc },
  };

  // Client options — register for .akash files
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'akash' }],
    synchronize: {
      fileEvents: workspace.createFileSystemWatcher('**/*.akash'),
    },
  };

  client = new LanguageClient(
    'akashLanguageServer',
    'AkashJS Language Server',
    serverOptions,
    clientOptions,
  );

  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  return client?.stop();
}
