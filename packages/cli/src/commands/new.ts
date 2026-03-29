/**
 * `akash new <project-name>` command.
 *
 * Scaffolds a new AkashJS project with optional router and forms.
 */

import { Command } from 'commander';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import pc from 'picocolors';
import {
  packageJson,
  tsconfig,
  viteConfig,
  vitestConfig,
  indexHtml,
  mainTs,
  appAkash,
  counterAkash,
  gitignore,
} from '../templates/index.js';

export function registerNewCommand(program: Command): void {
  program
    .command('new <project-name>')
    .description('Create a new AkashJS project')
    .option('--router', 'Include @akashjs/router', false)
    .option('--forms', 'Include @akashjs/forms', false)
    .option('--no-git', 'Skip git initialization')
    .option('--no-install', 'Skip dependency installation')
    .action(async (projectName: string, options: {
      router: boolean;
      forms: boolean;
      git: boolean;
      install: boolean;
    }) => {
      const targetDir = resolve(process.cwd(), projectName);

      if (existsSync(targetDir)) {
        console.error(pc.red(`Error: Directory "${projectName}" already exists.`));
        process.exit(1);
      }

      console.log(pc.cyan(`\nCreating ${pc.bold(projectName)}...\n`));

      const opts = {
        name: projectName,
        includeRouter: options.router,
        includeForms: options.forms,
      };

      // Create directory structure
      const dirs = [
        '',
        'src',
        'src/components',
      ];
      if (options.router) {
        dirs.push('src/routes');
      }

      for (const dir of dirs) {
        mkdirSync(join(targetDir, dir), { recursive: true });
      }

      // Write files
      const files: [string, string][] = [
        ['package.json', packageJson(opts)],
        ['tsconfig.json', tsconfig()],
        ['vite.config.ts', viteConfig()],
        ['vitest.config.ts', vitestConfig()],
        ['index.html', indexHtml(opts)],
        ['.gitignore', gitignore()],
        ['src/main.ts', mainTs()],
        ['src/App.akash', appAkash(opts)],
        ['src/components/Counter.akash', counterAkash()],
      ];

      for (const [filePath, content] of files) {
        const fullPath = join(targetDir, filePath);
        writeFileSync(fullPath, content, 'utf-8');
        console.log(pc.green('  +') + ' ' + filePath);
      }

      // Initialize git
      if (options.git) {
        try {
          execSync('git init', { cwd: targetDir, stdio: 'ignore' });
          console.log(pc.green('\n  Initialized git repository'));
        } catch {
          console.log(pc.yellow('\n  Warning: Failed to initialize git'));
        }
      }

      // Install dependencies
      if (options.install) {
        const pkgManager = detectPackageManager();
        console.log(pc.cyan(`\n  Installing dependencies with ${pkgManager}...\n`));
        try {
          execSync(`${pkgManager} install`, { cwd: targetDir, stdio: 'inherit' });
        } catch {
          console.log(pc.yellow('\n  Warning: Failed to install dependencies. Run install manually.'));
        }
      }

      console.log(pc.green(pc.bold('\n  Done!\n')));
      console.log('  Next steps:\n');
      console.log(pc.cyan(`    cd ${projectName}`));
      if (!options.install) {
        console.log(pc.cyan('    npm install'));
      }
      console.log(pc.cyan('    npx akash dev'));
      console.log();
    });
}

function detectPackageManager(): string {
  const userAgent = process.env.npm_config_user_agent ?? '';
  if (userAgent.startsWith('pnpm')) return 'pnpm';
  if (userAgent.startsWith('yarn')) return 'yarn';
  if (userAgent.startsWith('bun')) return 'bun';
  return 'npm';
}
