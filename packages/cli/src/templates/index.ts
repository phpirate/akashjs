/**
 * Project scaffolding templates.
 *
 * Each template function returns file content as a string.
 * The `new` command writes these into the target directory.
 */

export interface ProjectOptions {
  name: string;
  includeRouter: boolean;
  includeForms: boolean;
}

// --- package.json ---

export function packageJson(opts: ProjectOptions): string {
  const deps: Record<string, string> = {
    '@akashjs/runtime': '^0.1.0',
    '@akashjs/compiler': '^0.1.0',
  };
  const devDeps: Record<string, string> = {
    '@akashjs/vite-plugin': '^0.1.0',
    vite: '^5.4.0',
    typescript: '^5.5.0',
    vitest: '^1.6.0',
  };

  if (opts.includeRouter) {
    deps['@akashjs/router'] = '^0.1.0';
  }
  if (opts.includeForms) {
    deps['@akashjs/forms'] = '^0.1.0';
  }

  return JSON.stringify(
    {
      name: opts.name,
      version: '0.0.1',
      private: true,
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
        test: 'vitest',
      },
      dependencies: deps,
      devDependencies: devDeps,
    },
    null,
    2,
  );
}

// --- tsconfig.json ---

export function tsconfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        strict: true,
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'bundler',
        declaration: true,
        sourceMap: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        isolatedModules: true,
        verbatimModuleSyntax: true,
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
      },
      include: ['src'],
    },
    null,
    2,
  );
}

// --- vite.config.ts ---

export function viteConfig(): string {
  return `import { defineConfig } from 'vite';
import akash from '@akashjs/vite-plugin';

export default defineConfig({
  plugins: [akash()],
});
`;
}

// --- vitest.config.ts ---

export function vitestConfig(): string {
  return `import { defineConfig } from 'vitest/config';
import akash from '@akashjs/vite-plugin';

export default defineConfig({
  plugins: [akash()],
  test: {
    environment: 'happy-dom',
  },
});
`;
}

// --- index.html ---

export function indexHtml(opts: ProjectOptions): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${opts.name}</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
`;
}

// --- src/main.ts ---

export function mainTs(): string {
  return `import App from './App.akash';

const app = App({});
document.getElementById('app')!.appendChild(app);
`;
}

// --- src/App.akash ---

export function appAkash(opts: ProjectOptions): string {
  const imports = opts.includeRouter
    ? `import Counter from './components/Counter.akash';
import { Outlet } from '@akashjs/router';`
    : `import Counter from './components/Counter.akash';`;

  const template = opts.includeRouter
    ? `  <div class="app">
    <h1>Welcome to {name}</h1>
    <Counter initial={0} />
    <Outlet />
  </div>`
    : `  <div class="app">
    <h1>Welcome to {name}</h1>
    <Counter initial={0} />
  </div>`;

  return `<script lang="ts">
${imports}

const name = '${opts.name}';
</script>

<template>
${template}
</template>

<style scoped>
.app {
  max-width: 640px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
  font-family: system-ui, -apple-system, sans-serif;
}

h1 {
  color: #2563eb;
}
</style>
`;
}

// --- src/components/Counter.akash ---

export function counterAkash(): string {
  return `<script lang="ts">
import { signal } from '@akashjs/runtime';

interface Props {
  initial: number;
}

const count = signal(ctx.props.initial);
const increment = () => count.update((c) => c + 1);
const decrement = () => count.update((c) => c - 1);
</script>

<template>
  <div class="counter">
    <button onClick={decrement}>-</button>
    <span class="count">{count()}</span>
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

.count {
  font-size: 2rem;
  font-weight: bold;
  min-width: 3rem;
  text-align: center;
}

button {
  font-size: 1.5rem;
  padding: 0.25rem 1rem;
  border: 2px solid #2563eb;
  border-radius: 0.5rem;
  background: white;
  color: #2563eb;
  cursor: pointer;
  transition: all 0.15s;
}

button:hover {
  background: #2563eb;
  color: white;
}
</style>
`;
}

// --- .gitignore ---

export function gitignore(): string {
  return `node_modules
dist
.vite
*.local
`;
}

// --- Component generator template ---

export function componentTemplate(name: string): string {
  return `<script lang="ts">
// ${name} component
</script>

<template>
  <div class="${name.toLowerCase()}">
    <p>${name} works!</p>
  </div>
</template>

<style scoped>
.${name.toLowerCase()} {
  /* styles */
}
</style>
`;
}

// --- Route page template ---

export function routePageTemplate(path: string): string {
  const name = path.split('/').filter(Boolean).pop() || 'page';
  const capitalName = name.charAt(0).toUpperCase() + name.slice(1);
  return `<script lang="ts">
// ${capitalName} page
</script>

<template>
  <div class="${name}-page">
    <h2>${capitalName}</h2>
  </div>
</template>

<style scoped>
.${name}-page {
  padding: 1rem;
}
</style>
`;
}

// --- Route loader template ---

export function routeLoaderTemplate(path: string): string {
  return `import type { RouteLoader } from '@akashjs/router';

export const loader: RouteLoader = async ({ params, fetch }) => {
  // Load data for ${path}
  return {};
};
`;
}

// --- Route guard template ---

export function routeGuardTemplate(path: string): string {
  return `import type { RouteGuard } from '@akashjs/router';

export const guard: RouteGuard = async ({ params, redirect }) => {
  // Guard for ${path}
  // Return redirect('/login') to block, or void to allow
};
`;
}
