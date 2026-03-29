# AkashJS

A TypeScript-first UI framework with signals reactivity, direct DOM rendering, and batteries included.

[![CI](https://github.com/phpirate/akashjs/actions/workflows/ci.yml/badge.svg)](https://github.com/phpirate/akashjs/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@akashjs/runtime)](https://www.npmjs.com/package/@akashjs/runtime)
[![License](https://img.shields.io/github/license/phpirate/akashjs)](https://github.com/phpirate/akashjs/blob/main/LICENSE)

> **Early stage** — AkashJS is at v0.1.x. The APIs work and tests pass, but the framework is new and hasn't been battle-tested in production yet. Feedback and contributions welcome.

---

## What is this?

AkashJS is an opinionated framework that ships with everything you need: routing, forms, HTTP client, i18n, state management, and a Material Design component library. No separate packages to choose.

The core idea: **signals reactivity** with **direct DOM updates** (no virtual DOM), compiled from `.akash` single-file components.

```html
<!-- Counter.akash -->
<script lang="ts">
import { signal } from '@akashjs/runtime';

const count = signal(0);
</script>

<template>
  <button onClick={() => count.update(c => c + 1)}>
    Count: {count()}
  </button>
</template>

<style scoped>
button { font-size: 1.5rem; padding: 0.5rem 1rem; }
</style>
```

## Install

```bash
npx @akashjs/cli new my-app
cd my-app
npm install
npx akash dev
```

## Packages

All published on npm under `@akashjs/`:

| Package | Description | Gzipped |
|---|---|---|
| [@akashjs/runtime](https://www.npmjs.com/package/@akashjs/runtime) | Signals, components, DOM rendering | 3.4KB core / 28KB full |
| [@akashjs/compiler](https://www.npmjs.com/package/@akashjs/compiler) | `.akash` SFC parser and code generator | 7.3KB |
| [@akashjs/vite-plugin](https://www.npmjs.com/package/@akashjs/vite-plugin) | Vite integration with HMR | 0.9KB |
| [@akashjs/router](https://www.npmjs.com/package/@akashjs/router) | File-based routing, guards, loaders | 2.6KB |
| [@akashjs/forms](https://www.npmjs.com/package/@akashjs/forms) | Signal-based forms with validation | 1.8KB |
| [@akashjs/http](https://www.npmjs.com/package/@akashjs/http) | HTTP client, resources, WebSocket | 4.1KB |
| [@akashjs/i18n](https://www.npmjs.com/package/@akashjs/i18n) | Internationalization | 0.6KB |
| [@akashjs/ui](https://www.npmjs.com/package/@akashjs/ui) | 24 Material Design 3 components | 11.9KB |
| [@akashjs/cli](https://www.npmjs.com/package/@akashjs/cli) | Project scaffolding and tooling | 7.1KB |
| [@akashjs/devtools](https://www.npmjs.com/package/@akashjs/devtools) | Component inspector | 2.3KB |

## Core Features

**Reactivity** — `signal()`, `computed()`, `effect()` with fine-grained DOM updates. No virtual DOM.

```ts
const count = signal(0);
const doubled = computed(() => count() * 2);
effect(() => console.log(doubled())); // re-runs only when count changes
```

**Routing** — File-based with guards, loaders, and middleware.

**Forms** — `defineForm()` with 8 built-in validators and Zod integration.

**State** — `defineStore()` for global state, `useQueryState()` for URL sync, `useStorage()` for persistence.

**HTTP** — `createHttpClient()` with interceptors, `createResource()` for async data, `createAction()` for mutations.

**UI** — 24 Material Design 3 components: Button, TextField, Card, Dialog, Tabs, Drawer, etc.

## What's different

A few things AkashJS ships that other frameworks don't:

- **`createSync()`** — Collaborative signals with CRDT conflict resolution
- **`defineAPI()`** — Type-safe API layer (define once, typed on client and server)
- **`createOfflineStore()`** — IndexedDB persistence with background sync
- **`sanitize()`** — Built-in HTML sanitizer, CSP headers, CSRF protection
- **`akash audit`** — CLI security scanner for your codebase
- **`akash deploy`** — Zero-config deploy to Vercel/Cloudflare/Netlify/Deno

## Bundle Size

The core runtime (signals + components + DOM) is **3.4KB gzipped**. Features you don't import aren't shipped.

| Import | Gzipped |
|---|---|
| `@akashjs/runtime/core` | 3.4KB |
| + router | +2.6KB |
| + forms | +1.8KB |
| + http | +4.1KB |
| Full runtime (everything) | 28KB |

## CLI

```bash
akash new <name>       # Scaffold a project
akash dev              # Dev server
akash build            # Production build
akash test             # Run tests
akash g c <name>       # Generate component
akash g r <path>       # Generate route
akash deploy           # Deploy
akash size             # Bundle analysis
akash audit            # Security scan
akash update           # Update + run codemods
```

## Documentation

- **[Guide](docs/guide/)** — Feature documentation
- **[Tutorial](docs/tutorial/)** — Build a todo app step by step
- **[API Reference](docs/api/)** — Function signatures
- **[Cookbook](docs/cookbook/)** — Practical recipes
- **[Best Practices](docs/best-practices/)** — Architecture and patterns
- **[Migration](docs/migration/)** — From Angular, React, Vue, Svelte
- **[UI Components](docs/ui/)** — Material Design component docs
- **[FAQ](docs/faq/)** — Common questions

## Status

AkashJS is in early development (v0.1.x). Here's what exists:

- 10 npm packages, all published
- 974 unit tests passing
- 114 documentation pages
- Automated CI/CD (test on push, publish on tag)
- A reference app (TaskFlow — project management with Kanban)

What's still needed before 1.0:

- Real-world usage and feedback
- End-to-end browser tests
- Performance benchmarks against other frameworks
- API stabilization

## Contributing

Contributions, bug reports, and feedback are welcome.

1. Fork the repo
2. Create a branch (`git checkout -b feature/my-feature`)
3. Run tests (`npx vitest run`)
4. Open a Pull Request

## License

MIT

---

Created by [Ma'moon Al-Akash](https://github.com/phpirate)
