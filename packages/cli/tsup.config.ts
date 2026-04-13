import { defineConfig } from 'tsup';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  dts: false,
  sourcemap: true,
  clean: true,
  minify: true,
  target: 'es2022',
  banner: { js: '#!/usr/bin/env node' },
  noExternal: ['commander', 'picocolors'],
  define: { '__CLI_VERSION__': JSON.stringify(pkg.version) },
});
