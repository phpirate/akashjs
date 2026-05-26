# Quick Start

## Install

Add to an existing project:

```sh
npm install @akashjs/akashjs
```

## Create a Project

Or scaffold a new project:

```sh
npx @akashjs/cli new my-app
cd my-app
npm install
npx akash dev
```

This scaffolds a project with:
- `vite.config.ts` with `@akashjs/vite-plugin`
- `src/App.akash` — root component
- `src/components/Counter.akash` — example counter

> **Want to try without installing?** Use the [Playground](https://play.akash.js.org) to write `.akash` components with live preview directly in your browser.

### Options

Or use `create-akash` with a template:

```sh
npx create-akash my-app                         # basic — counter example
npx create-akash my-app --template=full          # routing, stores, i18n, HTTP
npx create-akash my-app --template=local-first   # offline + sync + service worker
```

### Templates

| Template | Includes |
|---|---|
| `basic` | Runtime, compiler, vite-plugin, counter example |
| `full` | + Router (file-based), stores (with persist), HTTP, i18n, devtools |
| `local-first` | + Offline query cache, synced store, service worker, online indicator |

All templates include AI context files (`CLAUDE.md`, `GEMINI.md`, `.cursor/rules/`, `.github/copilot-instructions.md`, `.windsurfrules`) so Claude Code, Cursor, Copilot, Gemini, and Windsurf understand your project from the first prompt.

### CLI Options

```sh
npx @akashjs/cli new my-app --router    # Include @akashjs/router
npx @akashjs/cli new my-app --forms     # Include @akashjs/forms
npx @akashjs/cli new my-app --no-git    # Skip git init
```

## Your First Component

Create `src/components/Hello.akash`:

```html
<script lang="ts">
import { signal } from '@akashjs/runtime';

const name = signal('World');
</script>

<template>
  <div>
    <h1>Hello, {name()}!</h1>
    <input
      value={name()}
      onInput={(e) => name.set(e.currentTarget.value)}
    />
  </div>
</template>

<style scoped>
h1 {
  color: #2563eb;
}
</style>
```

This is a single-file component with three sections:
- **`<script lang="ts">`** — Component logic with TypeScript
- **`<template>`** — HTML with reactive expressions in `{}`
- **`<style scoped>`** — CSS scoped to this component

## Project Structure

```
my-app/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── CLAUDE.md                 # AI context (Claude, Gemini, Copilot, Cursor, Windsurf)
└── src/
    ├── main.ts              # Entry point
    ├── App.akash             # Root component
    ├── env.d.ts             # Type declarations for .akash files and virtual modules
    ├── components/           # Shared components
    │   └── Counter.akash
    └── routes/               # File-based routes (with --router)
        └── page.akash
```

## CLI Commands

| Command | Description |
|---|---|
| `akash dev` | Start dev server |
| `akash build` | Production build |
| `akash test` | Run tests |
| `akash g c <name>` | Generate a component |
| `akash g r <path>` | Generate a route |
