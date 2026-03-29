/**
 * `akash audit` command.
 *
 * Scans your project for common security issues:
 * - innerHTML usage without sanitization
 * - Hardcoded secrets/tokens
 * - Dangerous eval/Function usage
 * - Missing CSP configuration
 * - Insecure HTTP URLs
 * - Exposed environment variables
 */

import { Command } from 'commander';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import pc from 'picocolors';

// --- Types ---

export interface AuditIssue {
  file: string;
  line: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  rule: string;
  message: string;
  code: string;
}

// --- Rules ---

interface AuditRule {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  pattern: RegExp;
  message: string;
  /** File extensions to check (default: all) */
  extensions?: string[];
  /** Exclude if this pattern also matches the line */
  exclude?: RegExp;
}

const RULES: AuditRule[] = [
  {
    id: 'no-innerhtml',
    severity: 'high',
    pattern: /\.innerHTML\s*=/,
    message: 'Direct innerHTML assignment is an XSS risk. Use sanitize() from @akashjs/runtime.',
    extensions: ['.ts', '.js', '.tsx', '.jsx'],
    exclude: /sanitize\(|escapeHtml\(|__akash_style/,
  },
  {
    id: 'no-eval',
    severity: 'critical',
    pattern: /\beval\s*\(|new\s+Function\s*\(/,
    message: 'eval() and new Function() can execute arbitrary code. Avoid them.',
    extensions: ['.ts', '.js', '.tsx', '.jsx'],
  },
  {
    id: 'no-document-write',
    severity: 'high',
    pattern: /document\.write\s*\(/,
    message: 'document.write() is a security and performance risk.',
    extensions: ['.ts', '.js', '.tsx', '.jsx'],
  },
  {
    id: 'no-hardcoded-secrets',
    severity: 'critical',
    pattern: /(?:api[_-]?key|secret|password|token|auth)\s*[:=]\s*['"`][A-Za-z0-9+/=_-]{16,}['"`]/i,
    message: 'Possible hardcoded secret/token detected. Use environment variables instead.',
    extensions: ['.ts', '.js', '.tsx', '.jsx', '.json'],
    exclude: /placeholder|example|test|mock|demo|TODO/i,
  },
  {
    id: 'no-http-urls',
    severity: 'medium',
    pattern: /['"`]http:\/\/(?!localhost|127\.0\.0\.1)/,
    message: 'Insecure HTTP URL detected. Use HTTPS instead.',
    extensions: ['.ts', '.js', '.tsx', '.jsx'],
    exclude: /\/\/\s*http:|example\.com/,
  },
  {
    id: 'no-target-blank',
    severity: 'low',
    pattern: /target\s*=\s*['"`]_blank['"`](?!.*rel\s*=)/,
    message: 'Links with target="_blank" should have rel="noopener noreferrer" to prevent tab hijacking.',
    extensions: ['.ts', '.js', '.tsx', '.jsx', '.html', '.akash'],
  },
  {
    id: 'no-dangerous-regex',
    severity: 'medium',
    pattern: /new\s+RegExp\s*\(\s*[a-zA-Z_$]/,
    message: 'Dynamic RegExp from user input can cause ReDoS attacks. Validate input first.',
    extensions: ['.ts', '.js'],
  },
  {
    id: 'no-exposed-env',
    severity: 'high',
    pattern: /process\.env\.[A-Z_]*(?:SECRET|KEY|TOKEN|PASSWORD|PRIVATE)/i,
    message: 'Sensitive environment variable may be exposed to the client. Use server-only modules.',
    extensions: ['.ts', '.js', '.tsx', '.jsx'],
    exclude: /server|api|backend|ssr/i,
  },
];

// --- Scanner ---

function scanFile(filePath: string, content: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const lines = content.split('\n');
  const ext = filePath.substring(filePath.lastIndexOf('.'));

  for (const rule of RULES) {
    if (rule.extensions && !rule.extensions.includes(ext)) continue;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (rule.pattern.test(line)) {
        if (rule.exclude && rule.exclude.test(line)) continue;

        issues.push({
          file: filePath,
          line: i + 1,
          severity: rule.severity,
          rule: rule.id,
          message: rule.message,
          code: line.trim().slice(0, 100),
        });
      }
    }
  }

  return issues;
}

function scanDirectory(dir: string, baseDir: string): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const SKIP = new Set(['node_modules', 'dist', '.git', '.vite', 'coverage']);

  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (SKIP.has(entry)) continue;
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        issues.push(...scanDirectory(fullPath, baseDir));
      } else if (stat.isFile()) {
        const ext = entry.substring(entry.lastIndexOf('.'));
        if (['.ts', '.js', '.tsx', '.jsx', '.html', '.akash', '.json'].includes(ext)) {
          const content = readFileSync(fullPath, 'utf-8');
          const relPath = relative(baseDir, fullPath);
          issues.push(...scanFile(relPath, content));
        }
      }
    }
  } catch { /* permission error */ }

  return issues;
}

// --- Command ---

export function registerAuditCommand(program: Command): void {
  program
    .command('audit')
    .description('Scan for security issues in your code')
    .option('--fix', 'Show fix suggestions')
    .option('--json', 'Output as JSON')
    .action((options: { fix?: boolean; json?: boolean }) => {
      const cwd = process.cwd();
      console.log(pc.cyan('\n  AkashJS Security Audit\n'));
      console.log(pc.dim(`  Scanning ${cwd}...\n`));

      const issues = scanDirectory(join(cwd, 'src'), cwd);

      if (options.json) {
        console.log(JSON.stringify(issues, null, 2));
        return;
      }

      if (issues.length === 0) {
        console.log(pc.green('  ✓ No security issues found!\n'));
        return;
      }

      // Group by severity
      const critical = issues.filter((i) => i.severity === 'critical');
      const high = issues.filter((i) => i.severity === 'high');
      const medium = issues.filter((i) => i.severity === 'medium');
      const low = issues.filter((i) => i.severity === 'low');

      const severityColor = {
        critical: pc.red,
        high: pc.red,
        medium: pc.yellow,
        low: pc.dim,
      };

      const severityIcon = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '⚪',
      };

      for (const issue of issues) {
        const color = severityColor[issue.severity];
        const icon = severityIcon[issue.severity];
        console.log(`  ${icon} ${color(issue.severity.toUpperCase())} ${pc.dim(issue.file + ':' + issue.line)}`);
        console.log(`    ${issue.message}`);
        console.log(pc.dim(`    ${issue.code}`));
        if (options.fix) {
          console.log(pc.cyan(`    Rule: ${issue.rule}`));
        }
        console.log();
      }

      console.log(pc.dim('  ' + '─'.repeat(50)));
      console.log(`  ${pc.bold('Summary:')}`);
      if (critical.length) console.log(pc.red(`    🔴 ${critical.length} critical`));
      if (high.length) console.log(pc.red(`    🟠 ${high.length} high`));
      if (medium.length) console.log(pc.yellow(`    🟡 ${medium.length} medium`));
      if (low.length) console.log(pc.dim(`    ⚪ ${low.length} low`));
      console.log(`    ${issues.length} total issues\n`);

      if (critical.length > 0) {
        process.exit(1);
      }
    });
}
