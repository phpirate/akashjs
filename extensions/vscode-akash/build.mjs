import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

const shared = {
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  sourcemap: true,
  external: ['vscode'],
};

// Build extension client
const clientBuild = esbuild.build({
  ...shared,
  entryPoints: ['src/extension.ts'],
  outfile: 'dist/extension.js',
});

// Build language server
const serverBuild = esbuild.build({
  ...shared,
  entryPoints: ['src/server.ts'],
  outfile: 'dist/server.js',
});

await Promise.all([clientBuild, serverBuild]);
console.log('Build complete.');

if (watch) {
  const ctx1 = await esbuild.context({ ...shared, entryPoints: ['src/extension.ts'], outfile: 'dist/extension.js' });
  const ctx2 = await esbuild.context({ ...shared, entryPoints: ['src/server.ts'], outfile: 'dist/server.js' });
  await Promise.all([ctx1.watch(), ctx2.watch()]);
  console.log('Watching...');
}
