# AkashJS

A TypeScript-first UI framework with Angular's structure and Svelte's simplicity.

**Fine-grained reactivity. Direct DOM rendering. Zero boilerplate.**

[Documentation](https://akash.js.org) | [GitHub](https://github.com/phpirate/akashjs) | [Getting Started](https://akash.js.org/guide/getting-started)

## Install

```bash
npm install @akashjs/akashjs
```

Or install individual packages:

```bash
npm install @akashjs/runtime @akashjs/ui
```

## What's Included

This umbrella package bundles the full AkashJS ecosystem:

| Package | Description |
|---------|-------------|
| `@akashjs/runtime` | Signals, components, DOM rendering, Show/For, deepSignal, state management |
| `@akashjs/compiler` | `.akash` SFC parsing, code generation, TypeScript language service |
| `@akashjs/vite-plugin` | Vite integration, HMR, error overlay, .d.ts generation |
| `@akashjs/router` | File-based routing with guards, loaders, middleware, SSR |
| `@akashjs/forms` | Signal-based form management with validation and Zod integration |
| `@akashjs/http` | HTTP client with interceptors, createResource, createAction, WebSocket |
| `@akashjs/i18n` | Signal-based internationalization with pluralization and lazy loading |
| `@akashjs/ui` | 34 Material Design 3 components |

## Features

- **Signals reactivity** — `signal()`, `computed()`, `effect()` with automatic dependency tracking
- **Direct DOM rendering** — No virtual DOM, compiler generates optimal DOM operations
- **Single-file components** — `.akash` files with `<script>`, `<template>`, `<style>` blocks
- **TypeScript-first** — Full type safety, IDE completions, prop validation
- **Material Design 3 UI** — Button, TextField, DataTable, Dialog, Drawer, Tabs, Select, Chips, and more
- **State management** — `defineStore()` with plugins, `deepSignal()` for nested reactivity
- **SSR** — `renderToString()`, `hydrate()`, progressive hydration
- **Animations** — `animate()`, springs, stagger, FLIP, view transitions
- **Security** — CSP, CSRF, sanitization, rate limiting
- **SEO** — `useHead()`, `useSEO()`, OpenGraph, structured data
- **DevTools** — `inspect()`, profiling, leak detection

## Quick Start

```bash
npx @akashjs/cli create my-app
cd my-app
npm install
npm run dev
```

## Example

```ts
import { signal, effect } from '@akashjs/runtime';

const count = signal(0);

effect(() => {
  console.log(`Count: ${count()}`);
});

count.set(1);  // logs: "Count: 1"
count.set(2);  // logs: "Count: 2"
```

## UI Components

```ts
import { Button, DataTable, EnhancedSelect, Accordion, ExpansionPanel } from '@akashjs/ui';

Button({ label: 'Click me', variant: 'filled', onClick: () => alert('Hello!') });

DataTable({
  columns: [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email', sortable: true },
  ],
  data: () => users(),
  selectable: true,
  resizable: true,
  pageSize: 25,
});
```

## License

MIT
