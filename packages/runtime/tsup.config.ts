import { defineConfig } from 'tsup';

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
  dts: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: true,
  minify: true,
  target: 'es2022',
});
