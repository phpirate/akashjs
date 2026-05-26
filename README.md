# AkashJS

A TypeScript-first UI framework with signals reactivity, direct DOM rendering, and batteries included.

[![CI](https://github.com/phpirate/akashjs/actions/workflows/ci.yml/badge.svg)](https://github.com/phpirate/akashjs/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@akashjs/runtime)](https://www.npmjs.com/package/@akashjs/runtime)
[![License](https://img.shields.io/github/license/phpirate/akashjs)](https://github.com/phpirate/akashjs/blob/main/LICENSE)

> **Note on naming:** This project is unrelated to [akash-network/akashjs](https://github.com/akash-network/akashjs) (the Akash Network blockchain SDK). We are a UI framework.

---

## Try it now

**[Playground](https://play.akash.js.org)** — Write `.akash` components in your browser with live preview. No install needed.

**[Documentation](https://akash.js.org)** — Full guide, tutorial, API reference, and cookbook.

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
npm install @akashjs/akashjs
```

Or scaffold a new project:

```bash
npx @akashjs/cli new my-app
cd my-app
npm install
npx akash dev
```

## Packages

All published on npm under `@akashjs/`:

| Package | Description | Version |
|---|---|---|
| [@akashjs/runtime](https://www.npmjs.com/package/@akashjs/runtime) | Signals, components, DOM rendering | 0.2.8 |
| [@akashjs/compiler](https://www.npmjs.com/package/@akashjs/compiler) | `.akash` SFC parser and code generator | 0.1.60 |
| [@akashjs/vite-plugin](https://www.npmjs.com/package/@akashjs/vite-plugin) | Vite integration with HMR | 0.2.4 |
| [@akashjs/router](https://www.npmjs.com/package/@akashjs/router) | File-based routing, guards, loaders | 0.1.11 |
| [@akashjs/forms](https://www.npmjs.com/package/@akashjs/forms) | Signal-based forms with validation | 0.1.7 |
| [@akashjs/http](https://www.npmjs.com/package/@akashjs/http) | HTTP client, resources, WebSocket | 0.2.7 |
| [@akashjs/i18n](https://www.npmjs.com/package/@akashjs/i18n) | Internationalization | 0.1.11 |
| [@akashjs/ui](https://www.npmjs.com/package/@akashjs/ui) | 34 Material Design 3 components | 0.2.4 |
| [@akashjs/cli](https://www.npmjs.com/package/@akashjs/cli) | Project scaffolding and tooling | 0.1.6 |
| [@akashjs/devtools](https://www.npmjs.com/package/@akashjs/devtools) | Component inspector | 0.1.5 |
| [@akashjs/eslint-plugin](https://www.npmjs.com/package/@akashjs/eslint-plugin) | Linting rules for `.akash` files | 0.1.2 |

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

**UI** — 34 Material Design 3 components: Button, TextField, Card, Dialog, Tabs, Drawer, etc. (Note: these components use semantic HTML but have not undergone a formal WCAG accessibility audit.)

## What's different

A few things AkashJS ships that other frameworks don't:

- **`createSync()`** — Collaborative signals with CRDT conflict resolution
- **`defineAPI()`** — Type-safe API layer (define once, typed on client and server)
- **`createOfflineStore()`** — IndexedDB persistence with background sync
- **`sanitize()`** — Built-in HTML sanitizer, CSP headers, CSRF protection
- **`akash audit`** — CLI security scanner for your codebase
- **`akash deploy`** — Zero-config deploy to Vercel/Cloudflare/Netlify/Deno

## Performance

### js-framework-benchmark

AkashJS is included in the official [js-framework-benchmark](https://krausest.github.io/js-framework-benchmark/) (keyed implementation). The benchmark uses AkashJS's own primitives: `<For>` for keyed list rendering, `class:` directives, per-row event handlers, and `signal()` state.

Performance-focused optimizations in recent releases:

- **LIS-based list reconciler** — Swap/remove operations produce minimal DOM moves instead of O(n) iteration
- **Template cloning** — Compiler generates `cloneNode` from hoisted `<template>` elements instead of individual `createElement` chains
- **class: directive caching** — Prev-value check skips `classList.toggle` when the boolean result hasn't changed
- **Inline signal batching** — `signal.set()` uses inline `enterBatch/exitBatch` instead of closure allocation per call
- **54 subpath exports** — Tree-shakeable; only import what you use

### Bundle size

| Import | Gzipped |
|---|---|
| `@akashjs/runtime` (core only) | ~2.7KB |
| + router | +2.6KB |
| + forms | +1.8KB |
| + http | +4.1KB |
| Full runtime (everything) | ~23KB |

### Signal microbenchmarks

(Node.js, not DOM — run `npx tsx benchmark/run.ts`)

| Operation | Time |
|---|---|
| Create 10,000 signals | 8.6ms |
| Create+dispose 10,000 effects | 14ms |
| Batch update 1000 signals x 100 | 10ms |
| Diamond deps (depth 50) x 1000 | 45ms |
| signal.set() | ~115ns |

## SSR / SSG

AkashJS has APIs for server-side rendering, static site generation, and client hydration.

The reference app (TaskFlow) has a working SSR server (`apps/taskflow/server/`) that renders the login page, dashboard, and Kanban board entirely on the server using `ssrElement`/`nodeToHtml` — no DOM APIs, pure string output. Run it with:

```bash
npx tsx apps/taskflow/server/index.ts
# Routes: /login, /dashboard, /project/p1
```

**What works:** `ssrElement()`, `ssrText()`, `nodeToHtml()`, `escapeHtml()`, server-mode compiler, security headers on responses, `__SSR_DATA__` for client hydration bootstrap.

**What's still experimental:** `hydrate()` and `progressiveHydrate()` for client-side signal attachment, `renderToStream()` for streaming SSR, and `prerender()` for build-time SSG. These have unit tests but haven't been used in a full hydration round-trip yet.

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

## Editor Support

A TextMate grammar for `.akash` syntax highlighting is in `extensions/vscode-akash/`. It provides basic highlighting for script/template/style blocks with embedded TypeScript, HTML, and CSS.

**This is not a full language server** — there's no auto-completion or diagnostics in templates yet. A `createLanguageService()` API exists in the compiler package but hasn't been integrated into a VS Code LSP extension.

To use the grammar locally: copy `extensions/vscode-akash/` into your `~/.vscode/extensions/` folder.

## Documentation

- **[Guide](https://akash.js.org/guide/introduction)** — Feature documentation
- **[Tutorial](https://akash.js.org/tutorial/introduction)** — Build a todo app step by step
- **[API Reference](https://akash.js.org/api/runtime)** — Function signatures
- **[Cookbook](https://akash.js.org/cookbook/)** — Practical recipes
- **[Best Practices](https://akash.js.org/best-practices/)** — Architecture and patterns
- **[Migration](https://akash.js.org/migration/)** — From Angular, React, Vue, Svelte
- **[UI Components](https://akash.js.org/ui/getting-started)** — Material Design component docs
- **[FAQ](https://akash.js.org/faq/)** — Common questions
- **[Playground](https://play.akash.js.org)** — Try AkashJS in your browser

## Status

AkashJS is in active development (v0.2.x). Here's what exists:

- 11 npm packages, all published
- 1050+ unit tests passing
- 265 documentation pages
- Automated CI/CD (test on push, publish on tag)
- Included in [js-framework-benchmark](https://krausest.github.io/js-framework-benchmark/) (keyed)
- Interactive [playground](https://play.akash.js.org) with live preview
- A reference app (TaskFlow — project management with Kanban)

What's still needed before 1.0:

- Real-world usage and feedback
- Cross-browser testing (currently tested in happy-dom/Node.js; no automated Playwright/Selenium suite for real browsers yet)
- WCAG accessibility audit for UI components
- API stabilization

### Requirements

- **Node.js** >= 18.0.0
- **Browser**: Targets ES2022. Should work in modern browsers (Chrome/Edge 90+, Firefox 90+, Safari 15+) but this is based on the APIs used, not automated cross-browser test results.

## Versioning

AkashJS follows [Semantic Versioning](https://semver.org/). During 0.x, minor versions may contain breaking changes. After 1.0, the usual semver guarantees apply.

- **`akash update`** — updates packages and runs codemods automatically
- **`akash codemod`** — applies code transformations for API changes
- **Deprecation warnings** — old APIs warn in console with migration hints before removal

See [CHANGELOG.md](CHANGELOG.md) and the [Upgrading Guide](https://akash.js.org/guide/upgrading).

## Community

- [GitHub Issues](https://github.com/phpirate/akashjs/issues) — bug reports and feature requests
- [GitHub Discussions](https://github.com/phpirate/akashjs/discussions) — questions and ideas

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, code style, and PR guidelines.

## Security

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities. AkashJS includes built-in security features (`sanitize()`, CSP, CSRF, `akash audit`).

## License

[MIT](LICENSE)

---

Created by [Ma'moon Al-Akash](https://github.com/phpirate)
