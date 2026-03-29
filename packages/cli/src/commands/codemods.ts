/**
 * Codemod system — automatic code transformations on upgrade.
 *
 * Each codemod transforms source files to match the new API.
 * Runs as part of `akash update` or standalone with `akash codemod`.
 */

import { Command } from 'commander';
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import pc from 'picocolors';

// =========================================================================
// Types
// =========================================================================

export interface Codemod {
  /** Unique ID */
  id: string;
  /** Version range this applies to (from → to) */
  from: string;
  to: string;
  /** Description */
  description: string;
  /** File extensions to process */
  extensions: string[];
  /** Transform function — returns modified content or null if no changes */
  transform: (content: string, filePath: string) => string | null;
}

export interface CodemodResult {
  codemod: string;
  filesChanged: number;
  filesScanned: number;
  changes: Array<{ file: string; description: string }>;
}

// =========================================================================
// Codemod registry
// =========================================================================

const codemods: Codemod[] = [
  // Example: if we rename createHttpClient → createClient in 0.2.0
  {
    id: 'rename-createHttpClient',
    from: '0.1.0',
    to: '0.2.0',
    description: 'No API changes in this version — this is a placeholder',
    extensions: ['.ts', '.js', '.tsx', '.jsx'],
    transform: () => null, // No-op for now
  },
];

/**
 * Register a custom codemod.
 */
export function registerCodemod(codemod: Codemod): void {
  codemods.push(codemod);
}

/**
 * Get all codemods for a version range.
 */
export function getCodemodsFor(from: string, to: string): Codemod[] {
  return codemods.filter((c) => {
    return compareVersions(c.from, from) >= 0 && compareVersions(c.to, to) <= 0;
  });
}

// =========================================================================
// Codemod runner
// =========================================================================

/**
 * Run a codemod on a directory.
 */
export function runCodemod(
  codemod: Codemod,
  dir: string,
  options: { dryRun?: boolean } = {},
): CodemodResult {
  const result: CodemodResult = {
    codemod: codemod.id,
    filesChanged: 0,
    filesScanned: 0,
    changes: [],
  };

  const files = collectFiles(dir, codemod.extensions);

  for (const filePath of files) {
    result.filesScanned++;
    const content = readFileSync(filePath, 'utf-8');
    const transformed = codemod.transform(content, filePath);

    if (transformed !== null && transformed !== content) {
      result.filesChanged++;
      result.changes.push({
        file: relative(dir, filePath),
        description: codemod.description,
      });

      if (!options.dryRun) {
        writeFileSync(filePath, transformed, 'utf-8');
      }
    }
  }

  return result;
}

/**
 * Run all codemods for a version range.
 */
export function runAllCodemods(
  dir: string,
  from: string,
  to: string,
  options: { dryRun?: boolean } = {},
): CodemodResult[] {
  const applicable = getCodemodsFor(from, to);
  return applicable.map((codemod) => runCodemod(codemod, dir, options));
}

// =========================================================================
// Common transform helpers (for building codemods)
// =========================================================================

/**
 * Rename an import specifier.
 *
 * ```ts
 * renameImport(code, '@akashjs/runtime', 'oldName', 'newName');
 * // import { oldName } from '@akashjs/runtime'
 * // → import { newName } from '@akashjs/runtime'
 * ```
 */
export function renameImport(
  content: string,
  packageName: string,
  oldName: string,
  newName: string,
): string {
  const importRegex = new RegExp(
    `(import\\s*\\{[^}]*?)\\b${oldName}\\b([^}]*\\}\\s*from\\s*['"]${escapeRegex(packageName)}['"])`,
    'g',
  );
  let result = content.replace(importRegex, `$1${newName}$2`);

  // Also rename usage in the file
  const usageRegex = new RegExp(`\\b${oldName}\\b(?!['":])`, 'g');
  result = result.replace(usageRegex, newName);

  return result;
}

/**
 * Rename a function call.
 */
export function renameCall(
  content: string,
  oldName: string,
  newName: string,
): string {
  const regex = new RegExp(`\\b${oldName}\\s*\\(`, 'g');
  return content.replace(regex, `${newName}(`);
}

/**
 * Add an import to a file if not already present.
 */
export function addImport(
  content: string,
  packageName: string,
  importName: string,
): string {
  // Check if already imported
  if (new RegExp(`import.*\\b${importName}\\b.*from\\s*['"]${escapeRegex(packageName)}['"]`).test(content)) {
    return content; // Already imported
  }

  // Check if there's an existing import from this package
  const existingImport = new RegExp(
    `(import\\s*\\{)([^}]*)(\\}\\s*from\\s*['"]${escapeRegex(packageName)}['"])`,
  );
  const match = existingImport.exec(content);

  if (match) {
    // Add to existing import
    return content.replace(existingImport, `$1$2, ${importName}$3`);
  }

  // Add new import at the top
  return `import { ${importName} } from '${packageName}';\n${content}`;
}

/**
 * Remove an import from a file.
 */
export function removeImport(
  content: string,
  packageName: string,
  importName: string,
): string {
  // Remove from multi-import
  const multiRegex = new RegExp(
    `(import\\s*\\{[^}]*?)\\b${importName}\\b\\s*,?\\s*([^}]*\\}\\s*from\\s*['"]${escapeRegex(packageName)}['"])`,
    'g',
  );
  let result = content.replace(multiRegex, '$1$2');

  // Clean up empty imports
  result = result.replace(/import\s*\{\s*\}\s*from\s*['"][^'"]*['"];?\n?/g, '');

  // Clean up dangling commas
  result = result.replace(/\{,\s*/g, '{ ');
  result = result.replace(/,\s*\}/g, ' }');

  return result;
}

// =========================================================================
// CLI command
// =========================================================================

export function registerCodemodCommand(program: Command): void {
  program
    .command('codemod [id]')
    .description('Run a codemod transformation on your source code')
    .option('--list', 'List available codemods')
    .option('--dry-run', 'Preview changes without modifying files')
    .option('--from <version>', 'Source version')
    .option('--to <version>', 'Target version')
    .action((id: string | undefined, options: {
      list?: boolean;
      dryRun?: boolean;
      from?: string;
      to?: string;
    }) => {
      if (options.list) {
        console.log(pc.cyan('\n  Available Codemods\n'));
        for (const cm of codemods) {
          console.log(`  ${pc.bold(cm.id)} (${cm.from} → ${cm.to})`);
          console.log(pc.dim(`    ${cm.description}\n`));
        }
        return;
      }

      const cwd = process.cwd();
      const srcDir = join(cwd, 'src');

      if (id) {
        // Run specific codemod
        const codemod = codemods.find((c) => c.id === id);
        if (!codemod) {
          console.error(pc.red(`\n  Codemod "${id}" not found. Run \`akash codemod --list\`.\n`));
          process.exit(1);
        }

        console.log(pc.cyan(`\n  Running codemod: ${codemod.id}\n`));
        const result = runCodemod(codemod, srcDir, { dryRun: options.dryRun });
        printResult(result, options.dryRun);
      } else if (options.from && options.to) {
        // Run all codemods for version range
        console.log(pc.cyan(`\n  Running codemods for ${options.from} → ${options.to}\n`));
        const results = runAllCodemods(srcDir, options.from, options.to, { dryRun: options.dryRun });

        if (results.length === 0) {
          console.log(pc.green('  No codemods needed for this version range.\n'));
          return;
        }

        for (const result of results) {
          printResult(result, options.dryRun);
        }
      } else {
        console.log(pc.yellow('\n  Specify a codemod ID or --from/--to versions.'));
        console.log(pc.dim('  Run `akash codemod --list` to see available codemods.\n'));
      }
    });
}

function printResult(result: CodemodResult, dryRun?: boolean): void {
  const prefix = dryRun ? pc.yellow('[DRY RUN] ') : '';
  console.log(`  ${prefix}${pc.bold(result.codemod)}: ${result.filesChanged}/${result.filesScanned} files changed`);
  for (const change of result.changes) {
    console.log(pc.dim(`    ${change.file}`));
  }
  console.log();
}

// =========================================================================
// Helpers
// =========================================================================

function collectFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];
  const SKIP = new Set(['node_modules', 'dist', '.git']);

  try {
    for (const entry of readdirSync(dir)) {
      if (SKIP.has(entry)) continue;
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        files.push(...collectFiles(full, extensions));
      } else if (extensions.some((ext) => entry.endsWith(ext))) {
        files.push(full);
      }
    }
  } catch { /* */ }

  return files;
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
