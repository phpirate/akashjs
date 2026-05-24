import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      '@akashjs/compiler': new URL('../packages/compiler/dist/index.js', import.meta.url).pathname,
      '@akashjs/runtime': new URL('../packages/runtime/dist/index.js', import.meta.url).pathname,
    },
  },
  worker: {
    format: 'es',
  },
  build: {
    outDir: 'dist',
    target: 'es2022',
    chunkSizeWarningLimit: 4000,
  },
});
