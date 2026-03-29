/**
 * `akash test` command.
 *
 * Runs vitest with the AkashJS preset.
 */

import { Command } from 'commander';
import { execSync } from 'node:child_process';
import pc from 'picocolors';

export function registerTestCommand(program: Command): void {
  program
    .command('test')
    .description('Run tests with Vitest')
    .option('--watch', 'Run in watch mode')
    .option('--coverage', 'Generate coverage report')
    .option('--ui', 'Open Vitest UI')
    .allowUnknownOption(true)
    .action((options: { watch?: boolean; coverage?: boolean; ui?: boolean }, command: Command) => {
      const args = ['vitest'];

      if (!options.watch) {
        args.push('run');
      }
      if (options.coverage) {
        args.push('--coverage');
      }
      if (options.ui) {
        args.push('--ui');
      }

      // Pass through any extra args
      const extraArgs = command.args;
      if (extraArgs.length > 0) {
        args.push(...extraArgs);
      }

      console.log(pc.cyan('\n  Running tests...\n'));

      try {
        execSync(`npx ${args.join(' ')}`, {
          cwd: process.cwd(),
          stdio: 'inherit',
        });
      } catch {
        process.exit(1);
      }
    });
}
