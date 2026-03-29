import { defineConfig } from 'vite';
import akash from '../packages/vite-plugin/dist/index.js';

export default defineConfig({
  plugins: [(akash as any)()],
  resolve: {
    alias: {
      '@akashjs/runtime': new URL('../packages/runtime/src/index.ts', import.meta.url).pathname,
    },
  },
});
