/**
 * create-akash — Scaffold a new AkashJS project.
 *
 * Usage:
 *   npm create akash
 *   npm create akash my-app
 *   npm create akash my-app --template dashboard
 */

import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

// --- Templates ---

interface Template {
  name: string;
  description: string;
  files: Record<string, string>;
}

const TEMPLATES: Record<string, Template> = {
  basic: {
    name: 'Basic',
    description: 'Minimal app with counter component',
    files: {
      'package.json': (name: string) => JSON.stringify({
        name,
        version: '0.0.1',
        private: true,
        type: 'module',
        scripts: {
          dev: 'vite',
          build: 'vite build',
          preview: 'vite preview',
          test: 'vitest',
        },
        dependencies: {
          '@akashjs/runtime': '^0.1.0',
        },
        devDependencies: {
          '@akashjs/compiler': '^0.1.0',
          '@akashjs/vite-plugin': '^0.1.0',
          typescript: '^5.5.0',
          vite: '^5.4.0',
          vitest: '^1.6.0',
        },
      }, null, 2),

      'tsconfig.json': () => JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'bundler',
          strict: true,
          jsx: 'preserve',
          esModuleInterop: true,
          skipLibCheck: true,
          paths: { '@/*': ['./src/*'] },
        },
        include: ['src'],
      }, null, 2),

      'vite.config.ts': () => `import { defineConfig } from 'vite';
import akash from '@akashjs/vite-plugin';

export default defineConfig({
  plugins: [akash()],
  resolve: {
    alias: { '@': '/src' },
  },
});
`,

      'index.html': (name: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${name}</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
`,

      'src/main.ts': () => `import App from './App.akash';

const app = App({});
document.getElementById('app')!.appendChild(app);
`,

      'src/App.akash': () => `<script lang="ts">
import Counter from './Counter.akash';
</script>

<template>
  <div class="app">
    <h1>Welcome to AkashJS</h1>
    <Counter initial={0} />
  </div>
</template>

<style scoped>
.app {
  max-width: 640px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
  font-family: system-ui, sans-serif;
}

h1 {
  color: #7c3aed;
}
</style>
`,

      'src/Counter.akash': () => `<script lang="ts">
interface Props {
  initial: number;
}

const count = signal(ctx.props.initial);
const increment = () => count.update(c => c + 1);
const decrement = () => count.update(c => c - 1);
</script>

<template>
  <div class="counter">
    <button onClick={decrement}>-</button>
    <span>{count()}</span>
    <button onClick={increment}>+</button>
  </div>
</template>

<style scoped>
.counter {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin: 2rem 0;
}

button {
  padding: 0.5rem 1rem;
  font-size: 1.25rem;
  border: 2px solid #7c3aed;
  border-radius: 8px;
  background: white;
  color: #7c3aed;
  cursor: pointer;
  transition: all 0.15s;
}

button:hover {
  background: #7c3aed;
  color: white;
}

span {
  font-size: 2rem;
  font-weight: bold;
  min-width: 3rem;
  text-align: center;
}
</style>
`,

      '.gitignore': () => `node_modules
dist
.vite
*.local
`,
    },
  },

  'with-router': {
    name: 'With Router',
    description: 'Multi-page app with file-based routing',
    files: {}, // extends basic
  },

  dashboard: {
    name: 'Dashboard',
    description: 'Data table, forms, and charts',
    files: {}, // extends basic
  },
};

// --- CLI ---

function main(): void {
  const args = process.argv.slice(2);
  let projectName = args.find(a => !a.startsWith('--')) ?? '';
  const templateFlag = args.find(a => a.startsWith('--template='))?.split('=')[1] ?? 'basic';

  if (!projectName) {
    projectName = 'my-akash-app';
  }

  const templateName = templateFlag;
  const template = TEMPLATES[templateName];

  if (!template) {
    console.error(`Unknown template: ${templateName}`);
    console.error(`Available: ${Object.keys(TEMPLATES).join(', ')}`);
    process.exit(1);
  }

  const projectDir = resolve(process.cwd(), projectName);

  if (existsSync(projectDir)) {
    console.error(`Directory "${projectName}" already exists.`);
    process.exit(1);
  }

  console.log();
  console.log(`  Creating AkashJS project in ${projectDir}`);
  console.log();

  // Create project directory and files
  mkdirSync(projectDir, { recursive: true });

  for (const [filePath, contentFn] of Object.entries(template.files)) {
    const fullPath = join(projectDir, filePath);
    const dir = join(fullPath, '..');
    mkdirSync(dir, { recursive: true });

    const content = typeof contentFn === 'function'
      ? (contentFn as Function)(projectName)
      : contentFn;
    writeFileSync(fullPath, content);
    console.log(`  ${filePath}`);
  }

  console.log();
  console.log('  Done! Next steps:');
  console.log();
  console.log(`  cd ${projectName}`);
  console.log('  npm install');
  console.log('  npm run dev');
  console.log();
}

main();
