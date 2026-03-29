import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false,
  sourcemap: true,
  clean: true,
  minify: true,
  target: 'es2022',
  banner: { js: '#!/usr/bin/env node' },
  external: ['commander', 'picocolors'],
});
