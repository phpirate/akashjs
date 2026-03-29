import { resolve } from 'path';

// Plain config object (no 'vite' import needed for Node to resolve)
export default {
  root: '.',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@akashjs/runtime': resolve(__dirname, '../../packages/runtime/src/index.ts'),
      '@akashjs/router': resolve(__dirname, '../../packages/router/src/index.ts'),
      '@akashjs/forms': resolve(__dirname, '../../packages/forms/src/index.ts'),
      '@akashjs/http': resolve(__dirname, '../../packages/http/src/index.ts'),
      '@akashjs/i18n': resolve(__dirname, '../../packages/i18n/src/index.ts'),
      '@akashjs/ui': resolve(__dirname, '../../packages/ui/src/index.ts'),
    },
  },
};
