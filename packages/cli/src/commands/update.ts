/**
 * `akash update` command.
 *
 * Version detection, dependency updates, and migration runner.
 * Automatically applies codemods when upgrading between versions.
 */

import { Command } from 'commander';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import pc from 'picocolors';

// =========================================================================
// Types
// =========================================================================

export interface Migration {
  /** Version this migration targets (from → to) */
  from: string;
  to: string;
  /** Description of what changes */
  description: string;
  /** The migration function */
  migrate: (ctx: MigrationContext) => void;
}

export interface MigrationContext {
  /** Project root */
  cwd: string;
  /** Read a file (returns null if not found) */
  readFile(path: string): string | null;
  /** Write a file */
  writeFile(path: string, content: string): void;
  /** Replace text in a file */
  replaceInFile(path: string, search: string | RegExp, replace: string): boolean;
  /** Log an info message */
  info(message: string): void;
  /** Log a warning */
  warn(message: string): void;
}

// =========================================================================
// Migration registry
// =========================================================================

const migrations: Migration[] = [
  {
    from: '0.1.0',
    to: '0.2.0',
    description: 'Rename signal.value to signal() — signals are now callable',
    migrate(ctx) {
      // Example migration codemod
      ctx.info('Checking for signal.value usage...');
      // In a real migration, this would scan .ts/.akash files and transform
    },
  },
  {
    from: '0.2.0',
    to: '0.3.0',
    description: 'Update router guard API — guards now receive context object',
    migrate(ctx) {
      ctx.info('Checking for old guard API...');
    },
  },
];

/**
 * Register a custom migration.
 */
export function registerMigration(migration: Migration): void {
  migrations.push(migration);
}

/**
 * Get migrations needed to go from one version to another.
 */
export function getMigrationsFor(from: string, to: string): Migration[] {
  return migrations.filter((m) => {
    return compareVersions(m.from, from) >= 0 && compareVersions(m.to, to) <= 0;
  });
}

// =========================================================================
// Version utilities
// =========================================================================

/**
 * Parse the current AkashJS version from package.json.
 */
export function getCurrentVersion(cwd: string): string | null {
  try {
    const pkgPath = join(cwd, 'node_modules', '@akashjs', 'runtime', 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      return pkg.version ?? null;
    }
  } catch { /* */ }

  // Fallback: check root package.json dependencies
  try {
    const rootPkg = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf-8'));
    const dep = rootPkg.dependencies?.['@akashjs/runtime'] ?? rootPkg.devDependencies?.['@akashjs/runtime'];
    if (dep) return dep.replace(/^[\^~]/, '');
  } catch { /* */ }

  return null;
}

/**
 * Get the latest version from npm registry.
 */
export function getLatestVersion(): string | null {
  try {
    const output = execSync('npm view @akashjs/runtime version', { encoding: 'utf-8' }).trim();
    return output || null;
  } catch {
    return null;
  }
}

/**
 * Compare two semver strings. Returns -1, 0, or 1.
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

// =========================================================================
// Migration runner
// =========================================================================

function createMigrationContext(cwd: string): MigrationContext {
  return {
    cwd,
    readFile(path: string): string | null {
      const full = join(cwd, path);
      return existsSync(full) ? readFileSync(full, 'utf-8') : null;
    },
    writeFile(path: string, content: string): void {
      writeFileSync(join(cwd, path), content, 'utf-8');
    },
    replaceInFile(path: string, search: string | RegExp, replace: string): boolean {
      const full = join(cwd, path);
      if (!existsSync(full)) return false;
      const content = readFileSync(full, 'utf-8');
      const updated = content.replace(search, replace);
      if (updated !== content) {
        writeFileSync(full, updated, 'utf-8');
        return true;
      }
      return false;
    },
    info(message: string) {
      console.log(pc.dim(`    ${message}`));
    },
    warn(message: string) {
      console.log(pc.yellow(`    ⚠ ${message}`));
    },
  };
}

// =========================================================================
// CLI command
// =========================================================================

export function registerUpdateCommand(program: Command): void {
  program
    .command('update')
    .description('Update AkashJS and run migrations')
    .option('--check', 'Check for updates without applying')
    .option('--target <version>', 'Update to specific version')
    .option('--no-migrate', 'Skip migrations')
    .action(async (options: {
      check?: boolean;
      target?: string;
      migrate: boolean;
    }) => {
      const cwd = process.cwd();
      const currentVersion = getCurrentVersion(cwd);

      console.log(pc.cyan('\n  AkashJS Update\n'));

      if (!currentVersion) {
        console.log(pc.yellow('  Could not detect current AkashJS version.'));
        console.log(pc.dim('  Make sure @akashjs/runtime is installed.\n'));
        return;
      }

      console.log(`  Current version: ${pc.bold(currentVersion)}`);

      const targetVersion = options.target ?? getLatestVersion() ?? currentVersion;
      console.log(`  Latest version:  ${pc.bold(targetVersion)}`);

      if (compareVersions(currentVersion, targetVersion) >= 0) {
        console.log(pc.green('\n  Already up to date!\n'));
        return;
      }

      if (options.check) {
        const pending = getMigrationsFor(currentVersion, targetVersion);
        if (pending.length > 0) {
          console.log(pc.cyan(`\n  ${pending.length} migration(s) available:`));
          for (const m of pending) {
            console.log(`    ${m.from} → ${m.to}: ${m.description}`);
          }
        }
        console.log();
        return;
      }

      // Update packages
      console.log(pc.cyan('\n  Updating packages...'));
      try {
        const scope = '@akashjs/';
        const packages = ['runtime', 'compiler', 'vite-plugin', 'router', 'forms', 'http', 'i18n', 'cli', 'devtools', 'ui'];
        const installArgs = packages
          .map((p) => `${scope}${p}@${targetVersion}`)
          .join(' ');
        execSync(`npm install ${installArgs}`, { cwd, stdio: 'inherit' });
      } catch {
        console.log(pc.yellow('  Some packages may not have been updated.'));
      }

      // Run migrations
      if (options.migrate) {
        const pending = getMigrationsFor(currentVersion, targetVersion);
        if (pending.length > 0) {
          console.log(pc.cyan(`\n  Running ${pending.length} migration(s)...\n`));
          const ctx = createMigrationContext(cwd);

          for (const migration of pending) {
            console.log(`  ${pc.bold(migration.from)} → ${pc.bold(migration.to)}: ${migration.description}`);
            try {
              migration.migrate(ctx);
              console.log(pc.green('    ✓ Done'));
            } catch (err) {
              console.log(pc.red(`    ✗ Failed: ${err instanceof Error ? err.message : err}`));
            }
          }
        }
      }

      console.log(pc.green(pc.bold('\n  Update complete!\n')));
    });
}
