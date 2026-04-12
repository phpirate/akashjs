import { defineConfig } from 'tsup';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));

export default defineConfig({
  entry: {
    core: 'src/core.ts',
    index: 'src/index.ts',
    test: 'src/test.ts',
    store: 'src/store.ts',
    ssr: 'src/ssr.ts',
    sync: 'src/sync.ts',
    offline: 'src/offline.ts',
    animate: 'src/animate.ts',
    machine: 'src/machine.ts',
    pwa: 'src/pwa.ts',
  },
  format: ['esm', 'cjs'],
  dts: { compilerOptions: { composite: false } },
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: true,
  minify: true,
  target: 'es2022',
  define: {
    '__RUNTIME_VERSION__': JSON.stringify(pkg.version),
  },
});
