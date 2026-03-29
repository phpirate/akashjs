/**
 * `akash size` command.
 *
 * Measures bundle size of each @akashjs package.
 * Reports raw and gzipped sizes with budget enforcement.
 */

import { Command } from 'commander';
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import pc from 'picocolors';

export interface SizeEntry {
  name: string;
  raw: number;
  gzip: number;
}

export interface SizeBudget {
  name: string;
  maxGzip: number; // bytes
}

const DEFAULT_BUDGETS: SizeBudget[] = [
  { name: '@akashjs/runtime', maxGzip: 8 * 1024 },  // 8KB
  { name: '@akashjs/router', maxGzip: 4 * 1024 },   // 4KB
  { name: '@akashjs/forms', maxGzip: 3 * 1024 },     // 3KB
  { name: '@akashjs/http', maxGzip: 3 * 1024 },      // 3KB
  { name: '@akashjs/compiler', maxGzip: 12 * 1024 }, // 12KB (Node-only)
];

export function registerSizeCommand(program: Command): void {
  program
    .command('size')
    .description('Measure package bundle sizes')
    .option('--budget', 'Enforce size budgets (exit 1 if exceeded)')
    .action((options: { budget?: boolean }) => {
      const packagesDir = join(process.cwd(), 'packages');
      const entries = measurePackages(packagesDir);

      if (entries.length === 0) {
        console.log(pc.yellow('\n  No built packages found. Run `akash build` first.\n'));
        return;
      }

      console.log(pc.bold('\n  Package Sizes\n'));
      console.log(pc.dim('  ' + '─'.repeat(55)));

      let totalRaw = 0;
      let totalGzip = 0;

      for (const entry of entries) {
        totalRaw += entry.raw;
        totalGzip += entry.gzip;

        const rawStr = formatBytes(entry.raw).padStart(10);
        const gzipStr = formatBytes(entry.gzip).padStart(10);
        console.log(`  ${entry.name.padEnd(25)} ${rawStr} ${pc.dim('→')} ${pc.cyan(gzipStr)} gzip`);
      }

      console.log(pc.dim('  ' + '─'.repeat(55)));
      console.log(
        `  ${pc.bold('Total'.padEnd(25))} ${formatBytes(totalRaw).padStart(10)} ${pc.dim('→')} ${pc.cyan(formatBytes(totalGzip).padStart(10))} gzip\n`,
      );

      // Budget enforcement
      if (options.budget) {
        const violations = checkBudgets(entries, DEFAULT_BUDGETS);
        if (violations.length > 0) {
          console.log(pc.red(pc.bold('  Budget violations:\n')));
          for (const v of violations) {
            console.log(pc.red(`    ${v.name}: ${formatBytes(v.actual)} > ${formatBytes(v.budget)} (${v.overBy}% over)`));
          }
          console.log();
          process.exit(1);
        } else {
          console.log(pc.green('  All packages within budget.\n'));
        }
      }
    });
}

function measurePackages(packagesDir: string): SizeEntry[] {
  const entries: SizeEntry[] = [];

  try {
    const packages = readdirSync(packagesDir);
    for (const pkg of packages) {
      const distDir = join(packagesDir, pkg, 'dist');
      try {
        const files = collectJsFiles(distDir);
        if (files.length === 0) continue;

        let rawTotal = 0;
        let gzipTotal = 0;

        for (const file of files) {
          const content = readFileSync(file);
          rawTotal += content.length;
          gzipTotal += gzipSync(content).length;
        }

        entries.push({
          name: `@akashjs/${pkg}`,
          raw: rawTotal,
          gzip: gzipTotal,
        });
      } catch {
        // dist doesn't exist yet
      }
    }
  } catch {
    // packages dir doesn't exist
  }

  return entries.sort((a, b) => b.gzip - a.gzip);
}

function collectJsFiles(dir: string): string[] {
  const files: string[] = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isFile() && (entry.endsWith('.js') || entry.endsWith('.mjs'))) {
        files.push(full);
      }
    }
  } catch { /* */ }
  return files;
}

export interface BudgetViolation {
  name: string;
  actual: number;
  budget: number;
  overBy: number; // percentage
}

export function checkBudgets(
  entries: SizeEntry[],
  budgets: SizeBudget[],
): BudgetViolation[] {
  const violations: BudgetViolation[] = [];
  const entryMap = new Map(entries.map((e) => [e.name, e]));

  for (const budget of budgets) {
    const entry = entryMap.get(budget.name);
    if (!entry) continue;

    if (entry.gzip > budget.maxGzip) {
      violations.push({
        name: budget.name,
        actual: entry.gzip,
        budget: budget.maxGzip,
        overBy: Math.round(((entry.gzip - budget.maxGzip) / budget.maxGzip) * 100),
      });
    }
  }

  return violations;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}
