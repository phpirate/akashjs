# Quick Start

## Create a Project

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

### Options

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
└── src/
    ├── main.ts              # Entry point
    ├── App.akash             # Root component
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
