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

// --- Shared AI context files ---

const CLAUDE_MD = `# AkashJS Project

## Tech Stack
- AkashJS (signal-based reactive UI framework)
- TypeScript, Vite

## Commands
- \`npm run dev\` — start dev server
- \`npm run build\` — production build
- \`npm run test\` — run tests

## .akash Component Format
\`\`\`akash
<script lang="ts">
import { signal, computed } from '@akashjs/runtime';
const count = signal(0);
const doubled = computed(() => count() * 2);
</script>

<template>
  <div>
    <p>{count()} × 2 = {doubled()}</p>
    <button onClick={() => count.update(c => c + 1)}>+</button>
  </div>
</template>

<style scoped>
div { padding: 1rem; }
</style>
\`\`\`

## Reactivity
- \`signal(value)\` — reactive state. Read: \`count()\`, set: \`count.set(v)\`, update: \`count.update(fn)\`
- \`computed(() => expr)\` — derived state
- \`effect(() => { ... })\` — side effects
- NOT React hooks — no rules of hooks, can be used anywhere

## Template Syntax
- Expressions: \`{expression}\`
- Conditionals: \`<Show when={cond}>{() => <div>...</div>}</Show>\`
- Lists: \`<For each={arr()} key={i => i.id}>{(item) => <div>{item.name}</div>}</For>\`
- Events: \`onClick={handler}\`, \`onSubmit|preventDefault={handler}\`
- Bindings: \`bind:value={signal}\`, \`class:active={isActive()}\`
- Fragments: \`<>...</>\`

## Stores
\`\`\`ts
export const useCounter = defineStore('counter', {
  state: () => ({ count: 0 }),
  getters: { doubled: (s) => s.count() * 2 },
  actions: { increment() { this.count.update(c => c + 1); } },
  persist: true,
  sync: { enabled: true },
});
\`\`\`

## Routing
File-based: \`src/routes/[path]/page.akash\`
- \`page.akash\` — page component
- \`layout.akash\` — wraps children
- \`guard.ts\` — route guard
- \`loader.ts\` — data loader
- \`[param]/\` — dynamic params
- \`[...rest]/\` — catch-all

## Data Fetching
\`\`\`ts
const posts = useCachedQuery(qc, ['posts'], () => http.get('/api/posts'));
posts();         // data
posts.loading(); // boolean
posts.refetch(); // manual refetch
\`\`\`

## Rules
- Use signal() for reactive state, not let/const
- Use <Show> for conditionals, <For> for lists
- Use defineStore for shared state
- Use useCachedQuery for API data
- Always use TypeScript
- Component files: .akash extension
- Store files: .store.ts suffix
`;

const CURSOR_RULES = `---
description: Rules for writing AkashJS .akash components
globs: ["**/*.akash"]
---

- AkashJS uses single-file components with <script lang="ts">, <template>, and <style scoped> blocks
- Reactivity uses signals: signal(), computed(), effect() from @akashjs/runtime
- Read signal values by calling them: count(), not count
- Set signals with .set(value) or .update(fn)
- Template uses JSX-like syntax with {expression} for interpolation
- Use <Show when={...}> for conditionals, <For each={...}> for lists
- Event handlers: onClick={fn}, onSubmit|preventDefault={fn}
- Class bindings: class:active={isActive()}, class={cx('base', { active: isActive() })}
- The compiler auto-imports signal, Show, For — no need to import in script
- Props typed via interface Props { ... } in script block
- Fragments: <>...</> compile to DocumentFragment
- Stores use defineStore with state/getters/actions/persist/sync
- File-based routing: src/routes/[path]/page.akash
`;

const COPILOT_INSTRUCTIONS = `# AkashJS

This project uses AkashJS, a signal-based reactive UI framework.

## Key patterns
- Components are .akash single-file components (script/template/style)
- Reactivity: signal(), computed(), effect() — NOT React hooks
- Read signals by calling: count(), set with count.set(value)
- Templates: <Show> for conditionals, <For> for lists, {expr} for interpolation
- State: defineStore() with state/getters/actions
- Routing: file-based (src/routes/), guard.ts, loader.ts
- Data: useCachedQuery() with query cache
`;

// Shared AI config files — all tools get the same guide content
const AI_FILES: Record<string, () => string> = {
  'CLAUDE.md': () => CLAUDE_MD,
  'GEMINI.md': () => CLAUDE_MD,
  '.cursor/rules/akash.mdc': () => CURSOR_RULES,
  '.github/copilot-instructions.md': () => COPILOT_INSTRUCTIONS,
  '.windsurfrules': () => CLAUDE_MD,
};

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
          '@akashjs/runtime': '^0.2.0',
          '@akashjs/compiler': '^0.1.50',
          '@akashjs/vite-plugin': '^0.2.0',
        },
        devDependencies: {
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
  initial?: number;
}

const count = signal(props.initial ?? 0);
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

      'src/env.d.ts': () => `/// <reference types="vite/client" />

declare module '*.akash' {
  const component: (props?: Record<string, unknown>) => Node;
  export default component;
}
`,

      ...AI_FILES,

      '.gitignore': () => `node_modules
dist
.vite
*.local
`,
    },
  },

  full: {
    name: 'Full',
    description: 'Multi-page app with routing, stores, i18n, and HTTP',
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
          '@akashjs/runtime': '^0.2.0',
          '@akashjs/compiler': '^0.1.50',
          '@akashjs/vite-plugin': '^0.2.0',
          '@akashjs/router': '^0.1.10',
          '@akashjs/http': '^0.2.0',
          '@akashjs/forms': '^0.1.6',
          '@akashjs/i18n': '^0.1.9',
        },
        devDependencies: {
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
  plugins: [
    akash({
      routes: { dir: 'src/routes' },
    }),
  ],
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
import { installDevtools } from '@akashjs/runtime';

if (import.meta.env.DEV) {
  installDevtools({ overlay: true });
}

const app = App({});
document.getElementById('app')!.appendChild(app);
`,

      'src/App.akash': () => `<script lang="ts">
import { createRouter, Outlet } from '@akashjs/router';
import { routes } from 'virtual:akash-routes';

const router = createRouter(routes);
</script>

<template>
  <Outlet />
</template>
`,

      'src/lib/http.ts': () => `import { createHttpClient } from '@akashjs/http';

export const http = createHttpClient({
  baseUrl: '/api',
});
`,

      'src/stores/counter.store.ts': () => `import { defineStore } from '@akashjs/runtime';

export const useCounter = defineStore('counter', {
  state: () => ({ count: 0 }),
  getters: {
    doubled: (state) => state.count() * 2,
  },
  actions: {
    increment() { this.count.update(c => c + 1); },
    decrement() { this.count.update(c => c - 1); },
    reset() { this.count.set(0); },
  },
  persist: true,
});
`,

      'src/routes/layout.akash': () => `<script lang="ts">
import { Link, Outlet } from '@akashjs/router';
</script>

<template>
  <div class="layout">
    <nav>
      <Link to="/">Home</Link>
      <Link to="/about">About</Link>
    </nav>
    <main>
      <Outlet />
    </main>
  </div>
</template>

<style scoped>
.layout { max-width: 800px; margin: 0 auto; padding: 1rem; font-family: system-ui, sans-serif; }
nav { display: flex; gap: 1rem; padding: 1rem 0; border-bottom: 1px solid #e5e7eb; margin-bottom: 1rem; }
nav a { color: #7c3aed; text-decoration: none; font-weight: 500; }
nav a:hover { text-decoration: underline; }
</style>
`,

      'src/routes/page.akash': () => `<script lang="ts">
import { useCounter } from '@/stores/counter.store';

const counter = useCounter();
</script>

<template>
  <div>
    <h1>Welcome to AkashJS</h1>
    <p>Count: {counter.count()} (doubled: {counter.doubled()})</p>
    <button onClick={counter.increment}>+</button>
    <button onClick={counter.decrement}>-</button>
    <button onClick={counter.reset}>Reset</button>
  </div>
</template>
`,

      'src/routes/about/page.akash': () => `<template>
  <div>
    <h1>About</h1>
    <p>Built with AkashJS — Angular structure, Svelte simplicity.</p>
  </div>
</template>
`,

      'src/routes/[...rest]/page.akash': () => `<template>
  <div>
    <h1>404</h1>
    <p>Page not found.</p>
  </div>
</template>
`,

      'src/env.d.ts': () => `/// <reference types="vite/client" />

declare module '*.akash' {
  const component: (props?: Record<string, unknown>) => Node;
  export default component;
}

declare module 'virtual:akash-routes' {
  import type { RouteConfig } from '@akashjs/router';
  export const routes: RouteConfig[];
}
`,

      ...AI_FILES,

      '.gitignore': () => `node_modules
dist
.vite
*.local
virtual-akash-routes.d.ts
akash-route-params.d.ts
`,
    },
  },

  'local-first': {
    name: 'Local-First',
    description: 'Offline-capable app with sync, service worker, and IndexedDB cache',
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
          '@akashjs/runtime': '^0.2.0',
          '@akashjs/compiler': '^0.1.50',
          '@akashjs/vite-plugin': '^0.2.0',
          '@akashjs/router': '^0.1.10',
          '@akashjs/http': '^0.2.0',
        },
        devDependencies: {
          typescript: '^5.5.0',
          vite: '^5.4.0',
          vitest: '^1.6.0',
        },
      }, null, 2),

      'tsconfig.json': () => JSON.stringify({
        compilerOptions: {
          target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler',
          strict: true, jsx: 'preserve', esModuleInterop: true, skipLibCheck: true,
          paths: { '@/*': ['./src/*'] },
        },
        include: ['src'],
      }, null, 2),

      'vite.config.ts': () => `import { defineConfig } from 'vite';
import akash from '@akashjs/vite-plugin';

export default defineConfig({
  plugins: [
    akash({ routes: { dir: 'src/routes' } }),
  ],
  resolve: { alias: { '@': '/src' } },
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
import { installDevtools } from '@akashjs/runtime';
import { registerServiceWorker } from '@akashjs/runtime';

if (import.meta.env.DEV) {
  installDevtools({ overlay: true });
}

// Register service worker for offline caching
if (import.meta.env.PROD) {
  registerServiceWorker('/sw.js');
}

const app = App({});
document.getElementById('app')!.appendChild(app);
`,

      'src/App.akash': () => `<script lang="ts">
import { createRouter, Outlet } from '@akashjs/router';
import { routes } from 'virtual:akash-routes';

const router = createRouter(routes);
</script>

<template>
  <Outlet />
</template>
`,

      'src/lib/http.ts': () => `import { createHttpClient, createQueryClient } from '@akashjs/http';

export const http = createHttpClient({ baseUrl: '/api' });

export const queryClient = createQueryClient({
  defaultStaleTime: 30_000,
  offline: {
    storage: 'indexeddb',
    queueMutations: true,
    syncOnReconnect: true,
  },
});
`,

      'src/stores/todos.store.ts': () => `import { defineStore } from '@akashjs/runtime';

export const useTodos = defineStore('todos', {
  state: () => ({
    items: [] as Array<{ id: number; text: string; done: boolean }>,
  }),
  actions: {
    add(text: string) {
      this.items.update(arr => [...arr, { id: Date.now(), text, done: false }]);
    },
    toggle(id: number) {
      this.items.update(arr =>
        arr.map(t => t.id === id ? { ...t, done: !t.done } : t)
      );
    },
    remove(id: number) {
      this.items.update(arr => arr.filter(t => t.id !== id));
    },
  },
  persist: true,
  sync: { enabled: true },
});
`,

      'src/components/OfflineBanner.akash': () => `<script lang="ts">
import { useOnline } from '@akashjs/runtime';
const online = useOnline();
</script>

<template>
  <Show when={!online()}>
    {() => <div class="offline-banner">
      You're offline. Changes will sync when reconnected.
    </div>}
  </Show>
</template>

<style scoped>
.offline-banner {
  position: fixed; bottom: 0; left: 0; right: 0;
  background: #f59e0b; color: #1e1e2e;
  padding: 8px 16px; text-align: center;
  font-size: 14px; font-weight: 500; z-index: 9999;
}
</style>
`,

      'src/routes/layout.akash': () => `<script lang="ts">
import { Link, Outlet } from '@akashjs/router';
import OfflineBanner from '@/components/OfflineBanner.akash';
</script>

<template>
  <div class="layout">
    <nav>
      <Link to="/">Todos</Link>
      <Link to="/about">About</Link>
    </nav>
    <main><Outlet /></main>
    <OfflineBanner />
  </div>
</template>

<style scoped>
.layout { max-width: 600px; margin: 0 auto; padding: 1rem; font-family: system-ui, sans-serif; }
nav { display: flex; gap: 1rem; padding: 1rem 0; border-bottom: 1px solid #e5e7eb; margin-bottom: 1rem; }
nav a { color: #7c3aed; text-decoration: none; font-weight: 500; }
</style>
`,

      'src/routes/page.akash': () => `<script lang="ts">
import { useTodos } from '@/stores/todos.store';

const todos = useTodos();
let input = signal('');

function addTodo() {
  const text = input().trim();
  if (!text) return;
  todos.add(text);
  input.set('');
}
</script>

<template>
  <div>
    <h1>Local-First Todos</h1>
    <p>Works offline. Syncs automatically. Data persists in localStorage.</p>
    <form onSubmit|preventDefault={addTodo}>
      <input bind:value={input} placeholder="Add a todo..." />
      <button type="submit">Add</button>
    </form>
    <ul>
      <For each={todos.items()} key={(t) => t.id}>
        {(todo) => <li>
          <label>
            <input type="checkbox" checked={todo.done} onClick={() => todos.toggle(todo.id)} />
            <span class:done={todo.done}>{todo.text}</span>
          </label>
          <button onClick={() => todos.remove(todo.id)}>x</button>
        </li>}
      </For>
    </ul>
  </div>
</template>

<style scoped>
form { display: flex; gap: 8px; margin: 1rem 0; }
input[type="text"], input:not([type]) { flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
button { padding: 8px 16px; background: #7c3aed; color: white; border: none; border-radius: 4px; cursor: pointer; }
ul { list-style: none; padding: 0; }
li { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
li label { flex: 1; display: flex; align-items: center; gap: 8px; cursor: pointer; }
li button { background: none; color: #aaa; border: none; cursor: pointer; font-size: 16px; }
.done { text-decoration: line-through; color: #aaa; }
</style>
`,

      'src/routes/about/page.akash': () => `<template>
  <div>
    <h1>About</h1>
    <p>This app is built with AkashJS and works completely offline.</p>
    <ul>
      <li>Data persists in localStorage (survives refresh)</li>
      <li>Sync enabled via CRDT (real-time collaboration ready)</li>
      <li>Service worker caches assets for offline use</li>
      <li>IndexedDB-backed query cache for API data</li>
    </ul>
  </div>
</template>
`,

      'src/routes/[...rest]/page.akash': () => `<template>
  <div><h1>404</h1><p>Page not found.</p></div>
</template>
`,

      'src/env.d.ts': () => `/// <reference types="vite/client" />

declare module '*.akash' {
  const component: (props?: Record<string, unknown>) => Node;
  export default component;
}

declare module 'virtual:akash-routes' {
  import type { RouteConfig } from '@akashjs/router';
  export const routes: RouteConfig[];
}
`,

      'public/sw.js': () => `// Service worker — auto-generated by AkashJS local-first template
const CACHE_NAME = 'app-cache-v1';
const PRECACHE = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
`,

      ...AI_FILES,

      '.gitignore': () => `node_modules
dist
.vite
*.local
virtual-akash-routes.d.ts
akash-route-params.d.ts
`,
    },
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
