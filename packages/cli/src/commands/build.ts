/**
 * `akash build` command.
 *
 * Runs `vite build` for production output with bundle size reporting.
 * Supports --analyze flag for per-chunk size analysis.
 */

import { Command } from 'commander';
import { execSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import pc from 'picocolors';

export function registerBuildCommand(program: Command): void {
  program
    .command('build')
    .description('Build for production')
    .option('--outDir <dir>', 'Output directory', 'dist')
    .option('--analyze', 'Show bundle size analysis')
    .action((options: { outDir: string; analyze?: boolean }) => {
      console.log(pc.cyan('\n  Building for production...\n'));

      try {
        execSync(`npx vite build --outDir ${options.outDir}`, {
          cwd: process.cwd(),
          stdio: 'inherit',
        });
        console.log(pc.green(pc.bold('\n  Build complete!\n')));

        if (options.analyze) {
          analyzeBuild(options.outDir);
        }
      } catch {
        console.error(pc.red('\n  Build failed.'));
        process.exit(1);
      }
    });
}

// --- Bundle analyzer ---

interface FileInfo {
  path: string;
  size: number;
}

function analyzeBuild(outDir: string): void {
  const dir = join(process.cwd(), outDir);
  const files = collectFiles(dir);

  if (files.length === 0) {
    console.log(pc.yellow('  No output files found.'));
    return;
  }

  // Sort by size (largest first)
  files.sort((a, b) => b.size - a.size);

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  console.log(pc.bold('  Bundle Analysis\n'));
  console.log(pc.dim('  ' + '─'.repeat(60)));

  // Group by type
  const jsFiles = files.filter((f) => f.path.endsWith('.js') || f.path.endsWith('.mjs'));
  const cssFiles = files.filter((f) => f.path.endsWith('.css'));
  const otherFiles = files.filter((f) =>
    !f.path.endsWith('.js') && !f.path.endsWith('.mjs') && !f.path.endsWith('.css'),
  );

  if (jsFiles.length > 0) {
    console.log(pc.cyan('\n  JavaScript:'));
    for (const file of jsFiles) {
      printFileSize(file, dir);
    }
  }

  if (cssFiles.length > 0) {
    console.log(pc.magenta('\n  CSS:'));
    for (const file of cssFiles) {
      printFileSize(file, dir);
    }
  }

  if (otherFiles.length > 0) {
    console.log(pc.yellow('\n  Other:'));
    for (const file of otherFiles) {
      printFileSize(file, dir);
    }
  }

  console.log(pc.dim('\n  ' + '─'.repeat(60)));
  console.log(
    `  ${pc.bold('Total:')} ${formatSize(totalSize)} (${files.length} files)`,
  );
  console.log();
}

function printFileSize(file: FileInfo, baseDir: string): void {
  const relPath = relative(baseDir, file.path);
  const size = formatSize(file.size);
  const bar = sizeBar(file.size);
  console.log(`    ${pc.dim(relPath.padEnd(40))} ${size.padStart(10)} ${bar}`);
}

function collectFiles(dir: string): FileInfo[] {
  const results: FileInfo[] = [];

  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        results.push(...collectFiles(fullPath));
      } else {
        results.push({ path: fullPath, size: stat.size });
      }
    }
  } catch {
    // Directory doesn't exist
  }

  return results;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function sizeBar(bytes: number): string {
  const kb = bytes / 1024;
  const blocks = Math.min(Math.ceil(kb / 10), 20);
  if (kb > 100) return pc.red('█'.repeat(blocks));
  if (kb > 50) return pc.yellow('█'.repeat(blocks));
  return pc.green('█'.repeat(blocks));
}
