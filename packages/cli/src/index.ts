#!/usr/bin/env node

/**
 * @akashjs/cli — The AkashJS command-line tool.
 *
 * Commands:
 *   akash new <name>              Create a new project
 *   akash dev                     Start dev server
 *   akash build                   Build for production
 *   akash generate component <n>  Generate a component (alias: g c)
 *   akash generate route <path>   Generate a route (alias: g r)
 *   akash test                    Run tests
 */

import { Command } from 'commander';
import { registerNewCommand } from './commands/new.js';
import { registerDevCommand } from './commands/dev.js';
import { registerBuildCommand } from './commands/build.js';
import { registerGenerateCommand } from './commands/generate.js';
import { registerTestCommand } from './commands/test.js';
import { registerSizeCommand } from './commands/size.js';
import { registerDeployCommand } from './commands/deploy.js';
import { registerUpdateCommand } from './commands/update.js';
import { registerAuditCommand } from './commands/audit.js';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('akash')
    .description('AkashJS — Angular structure, Svelte simplicity')
    .version('0.1.0');

  registerNewCommand(program);
  registerDevCommand(program);
  registerBuildCommand(program);
  registerGenerateCommand(program);
  registerTestCommand(program);
  registerSizeCommand(program);
  registerDeployCommand(program);
  registerUpdateCommand(program);
  registerAuditCommand(program);

  return program;
}

export const program = createProgram();

// Run CLI when executed directly
const isDirectRun =
  process.argv[1]?.endsWith('/akash') ||
  process.argv[1]?.includes('/cli/dist/') ||
  process.argv[1]?.includes('/cli/src/');

if (isDirectRun) {
  program.parse();
}
