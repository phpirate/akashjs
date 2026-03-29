/**
 * `akash dev` command.
 *
 * Starts the Vite dev server with @akashjs/vite-plugin preconfigured.
 */

import { Command } from 'commander';
import { execSync } from 'node:child_process';
import pc from 'picocolors';

export function registerDevCommand(program: Command): void {
  program
    .command('dev')
    .description('Start the development server')
    .option('-p, --port <port>', 'Port number', '5173')
    .option('--host', 'Expose to network')
    .option('--no-open', 'Do not open browser')
    .action((options: { port: string; host?: boolean; open: boolean }) => {
      console.log(pc.cyan('\n  Starting AkashJS dev server...\n'));

      const args = ['vite'];
      args.push('--port', options.port);
      if (options.host) args.push('--host');
      if (options.open) args.push('--open');

      try {
        execSync(`npx ${args.join(' ')}`, {
          cwd: process.cwd(),
          stdio: 'inherit',
        });
      } catch {
        // User likely pressed Ctrl+C
      }
    });
}
