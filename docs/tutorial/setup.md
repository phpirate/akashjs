# Step 1: Project Setup

In this step, you will scaffold a new AkashJS project, explore the generated file structure, and start the development server.

## Create the Project

Open your terminal and run:

```bash
npx @akashjs/cli create todo-app
```

The CLI will ask a few questions. Choose these options:

```
? Project name: todo-app
? Template: Minimal (recommended for tutorials)
? Package manager: pnpm
? Enable TypeScript: Yes
? Enable router: Yes
? Enable testing: Yes
```

Once scaffolding completes, enter the project directory and install dependencies:

```bash
cd todo-app
pnpm install
```

## Project Structure

The generated project looks like this:

```
todo-app/
  src/
    components/
      App.akash          # Root component
    pages/
      Home.akash         # Home page component
    main.ts              # Application entry point
    styles.css           # Global styles
  public/
    favicon.svg
  index.html             # HTML shell
  package.json
  tsconfig.json
  vite.config.ts
```

Let's understand each key file.

### `package.json`

```json
{
  "name": "todo-app",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest"
  },
  "dependencies": {
    "@akashjs/runtime": "^0.1.0",
    "@akashjs/router": "^0.1.0",
    "@akashjs/forms": "^0.1.0",
    "@akashjs/http": "^0.1.0"
  },
  "devDependencies": {
    "@akashjs/compiler": "^0.1.0",
    "@akashjs/vite-plugin": "^0.1.0",
    "typescript": "^5.4.0",
    "vite": "^5.0.0",
    "vitest": "^2.0.0"
  }
}
```

::: info All batteries included
Notice there is no React, no Vue, no extra routing library. AkashJS ships router, forms, and HTTP client as first-party packages.
:::

### `vite.config.ts`

```ts
import { defineConfig } from 'vite';
import akash from '@akashjs/vite-plugin';

export default defineConfig({
  plugins: [akash()],
});
```

The `@akashjs/vite-plugin` handles `.akash` single-file component compilation. It transforms `<script>`, `<template>`, and `<style>` blocks into optimized JavaScript at build time.

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "preserve",
    "types": ["@akashjs/runtime/globals"],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*", "src/**/*.akash"]
}
```

::: tip IDE Setup
For the best experience in VS Code, install the **AkashJS** extension from the marketplace. It provides syntax highlighting for `.akash` files, auto-completion for template directives, and inline error reporting.
:::

### `main.ts` -- the entry point

```ts
import { createApp } from '@akashjs/runtime';
import { createRouter } from '@akashjs/router';
import App from './components/App.akash';

const router = createRouter([
  {
    path: '/',
    component: () => import('./pages/Home.akash'),
  },
]);

const app = createApp(App, {
  plugins: [router],
});

app.mount('#app');
```

This is where everything starts. `createApp` initializes the runtime, registers plugins (like the router), and mounts the root component into the DOM.

### `App.akash` -- the root component

```html
<script>
  import { RouterOutlet } from '@akashjs/router';
</script>

<template>
  <div class="app">
    <h1>Todo App</h1>
    <RouterOutlet />
  </div>
</template>

<style scoped>
  .app {
    max-width: 640px;
    margin: 0 auto;
    padding: 2rem;
  }
</style>
```

This is your first `.akash` single-file component. It has three sections:

- **`<script>`** -- imports and component logic (runs once on creation)
- **`<template>`** -- HTML markup with reactive expressions
- **`<style scoped>`** -- CSS scoped to this component only

`<RouterOutlet />` is where page components render based on the current URL.

## Start the Dev Server

```bash
pnpm dev
```

You should see:

```
  VITE v5.x.x  ready in 200ms

  > Local:   http://localhost:5173/
  > Network: http://192.168.x.x:5173/
```

Open `http://localhost:5173` in your browser. You should see the heading "Todo App" rendered on the page.

::: tip Hot Module Replacement
The dev server supports HMR for `.akash` files. Edit a template or style and see the change instantly without a full page reload.
:::

## Try It

Try making a small change to verify everything works:

1. Open `src/components/App.akash`
2. Change the `<h1>` text to `<h1>My Todos</h1>`
3. Save the file and watch the browser update instantly

## Summary

You now have a working AkashJS project with:

- A Vite-powered dev server with HMR
- TypeScript configured and ready
- Router installed with a single page
- A root component rendering into the DOM

---

**What's Next:** [First Component](./first-component.md) -- build your first custom component and learn the SFC structure.
