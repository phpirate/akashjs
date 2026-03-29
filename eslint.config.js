import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    files: ['packages/*/src/**/*.ts'],
    extends: [
      ...tseslint.configs.recommended,
    ],
    rules: {
      // Relaxed for now — tighten as codebase matures
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-empty-function': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/*.test.ts',
      '**/__tests__/**',
      'apps/**',
      'playground/**',
      'benchmark/**',
      'docs/**',
      'e2e/**',
    ],
  },
);
