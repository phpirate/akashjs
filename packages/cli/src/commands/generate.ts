/**
 * `akash generate` command.
 *
 * Generates components and routes with skeleton files.
 * Aliases: `akash g c <name>`, `akash g r <path>`
 */

import { Command } from 'commander';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import pc from 'picocolors';
import {
  componentTemplate,
  routePageTemplate,
  routeLoaderTemplate,
  routeGuardTemplate,
} from '../templates/index.js';

export function registerGenerateCommand(program: Command): void {
  const generate = program
    .command('generate')
    .alias('g')
    .description('Generate components and routes');

  // --- generate component ---

  generate
    .command('component <name>')
    .alias('c')
    .description('Generate a new component')
    .option('--tsx', 'Generate a .tsx file instead of .akash')
    .action((name: string, options: { tsx?: boolean }) => {
      const pascalName = toPascalCase(name);
      const ext = options.tsx ? '.tsx' : '.akash';
      const dir = resolve(process.cwd(), 'src', 'components');
      const filePath = join(dir, `${pascalName}${ext}`);

      if (existsSync(filePath)) {
        console.error(pc.red(`Error: ${pascalName}${ext} already exists.`));
        process.exit(1);
      }

      mkdirSync(dir, { recursive: true });

      const content = options.tsx
        ? tsxComponentTemplate(pascalName)
        : componentTemplate(pascalName);

      writeFileSync(filePath, content, 'utf-8');
      console.log(pc.green('  +') + ` src/components/${pascalName}${ext}`);
    });

  // --- generate route ---

  generate
    .command('route <path>')
    .alias('r')
    .description('Generate a new route')
    .option('--loader', 'Include a data loader')
    .option('--guard', 'Include a route guard')
    .action((routePath: string, options: { loader?: boolean; guard?: boolean }) => {
      // Normalize: /about -> about, about -> about
      const normalized = routePath.replace(/^\//, '');
      const routeDir = resolve(process.cwd(), 'src', 'routes', normalized);

      mkdirSync(routeDir, { recursive: true });

      const files: [string, string][] = [
        ['page.akash', routePageTemplate(normalized)],
      ];

      if (options.loader) {
        files.push(['loader.ts', routeLoaderTemplate(normalized)]);
      }

      if (options.guard) {
        files.push(['guard.ts', routeGuardTemplate(normalized)]);
      }

      for (const [fileName, content] of files) {
        const filePath = join(routeDir, fileName);
        if (existsSync(filePath)) {
          console.log(pc.yellow('  ~') + ` src/routes/${normalized}/${fileName} (exists, skipped)`);
          continue;
        }
        writeFileSync(filePath, content, 'utf-8');
        console.log(pc.green('  +') + ` src/routes/${normalized}/${fileName}`);
      }
    });
}

// --- Helpers ---

function toPascalCase(str: string): string {
  return str
    .replace(/[-_](\w)/g, (_, c) => c.toUpperCase())
    .replace(/^\w/, (c) => c.toUpperCase());
}

function tsxComponentTemplate(name: string): string {
  return `import { defineComponent } from '@akashjs/runtime';

export const ${name} = defineComponent(() => {
  return () => (
    <div class="${name.toLowerCase()}">
      <p>${name} works!</p>
    </div>
  );
});
`;
}
