import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/zod.ts'],
  format: ['esm', 'cjs'],
  dts: { compilerOptions: { composite: false } },
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: true,
  minify: true,
  target: 'es2022',
  external: ['@akashjs/runtime', '@akashjs/compiler'],
});
