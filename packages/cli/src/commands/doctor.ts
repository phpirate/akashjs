/**
 * akash doctor — diagnose project setup issues.
 *
 * Checks:
 * - Package versions are compatible
 * - Vite plugin is configured
 * - TypeScript is set up
 * - Common misconfigurations
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

interface Check {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
}

export async function doctor(): Promise<void> {
  const cwd = process.cwd();
  const checks: Check[] = [];

  // 1. package.json exists
  const pkgPath = resolve(cwd, 'package.json');
  if (!existsSync(pkgPath)) {
    console.log('\n  No package.json found. Run this command from your project root.\n');
    return;
  }
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  checks.push({ name: 'package.json', status: 'pass', message: 'Found' });

  // 2. @akashjs/runtime installed
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (allDeps['@akashjs/runtime']) {
    checks.push({ name: '@akashjs/runtime', status: 'pass', message: `v${allDeps['@akashjs/runtime']}` });
  } else {
    checks.push({ name: '@akashjs/runtime', status: 'fail', message: 'Not installed. Run: npm install @akashjs/runtime' });
  }

  // 3. @akashjs/compiler installed
  if (allDeps['@akashjs/compiler']) {
    checks.push({ name: '@akashjs/compiler', status: 'pass', message: `v${allDeps['@akashjs/compiler']}` });
  } else {
    checks.push({ name: '@akashjs/compiler', status: 'fail', message: 'Not installed. Run: npm install -D @akashjs/compiler' });
  }

  // 4. Vite plugin installed
  if (allDeps['@akashjs/vite-plugin']) {
    checks.push({ name: '@akashjs/vite-plugin', status: 'pass', message: `v${allDeps['@akashjs/vite-plugin']}` });
  } else {
    checks.push({ name: '@akashjs/vite-plugin', status: 'fail', message: 'Not installed. Run: npm install -D @akashjs/vite-plugin' });
  }

  // 5. vite.config exists and has akash plugin
  const viteConfigPaths = ['vite.config.ts', 'vite.config.js', 'vite.config.mjs'];
  const viteConfig = viteConfigPaths.find(p => existsSync(resolve(cwd, p)));
  if (viteConfig) {
    const content = readFileSync(resolve(cwd, viteConfig), 'utf-8');
    if (content.includes('akash') || content.includes('@akashjs/vite-plugin')) {
      checks.push({ name: 'Vite config', status: 'pass', message: `${viteConfig} — AkashJS plugin configured` });
    } else {
      checks.push({ name: 'Vite config', status: 'warn', message: `${viteConfig} found but AkashJS plugin not detected. Add: import akash from '@akashjs/vite-plugin'` });
    }
  } else {
    checks.push({ name: 'Vite config', status: 'fail', message: 'No vite.config found. Create one with the AkashJS plugin.' });
  }

  // 6. TypeScript config
  if (existsSync(resolve(cwd, 'tsconfig.json'))) {
    checks.push({ name: 'TypeScript', status: 'pass', message: 'tsconfig.json found' });
  } else {
    checks.push({ name: 'TypeScript', status: 'warn', message: 'No tsconfig.json — TypeScript is recommended for .akash files' });
  }

  // 7. Check for .akash files
  const srcDir = resolve(cwd, 'src');
  if (existsSync(srcDir)) {
    checks.push({ name: 'Source dir', status: 'pass', message: 'src/ exists' });
  } else {
    checks.push({ name: 'Source dir', status: 'warn', message: 'No src/ directory found' });
  }

  // 8. Version compatibility
  const runtimeVer = allDeps['@akashjs/runtime']?.replace('^', '').replace('~', '') ?? '';
  const compilerVer = allDeps['@akashjs/compiler']?.replace('^', '').replace('~', '') ?? '';
  if (runtimeVer && compilerVer) {
    const rMajMin = runtimeVer.split('.').slice(0, 2).join('.');
    const cMajMin = compilerVer.split('.').slice(0, 2).join('.');
    if (rMajMin === cMajMin) {
      checks.push({ name: 'Version compat', status: 'pass', message: `runtime ${runtimeVer} + compiler ${compilerVer}` });
    } else {
      checks.push({ name: 'Version compat', status: 'warn', message: `runtime ${runtimeVer} and compiler ${compilerVer} may be incompatible` });
    }
  }

  // Print results
  console.log('\n  AkashJS Doctor\n');
  const icons = { pass: '✅', warn: '⚠️ ', fail: '❌' };
  for (const check of checks) {
    console.log(`  ${icons[check.status]} ${check.name}: ${check.message}`);
  }

  const fails = checks.filter(c => c.status === 'fail');
  const warns = checks.filter(c => c.status === 'warn');
  console.log(`\n  ${checks.length} checks — ${fails.length} errors, ${warns.length} warnings\n`);
}
