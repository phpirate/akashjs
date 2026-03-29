# Introduction

AkashJS is a TypeScript-first UI framework for the browser. It combines Angular's opinionated structure (built-in routing, DI, forms) with Svelte's simplicity (signals reactivity, compiler-based SFCs, tiny runtime).

## Why AkashJS?

Modern frameworks force a choice: **structure** or **simplicity**. Angular gives you everything but drowns you in boilerplate, RxJS complexity, and 130KB bundles. React and Vue give you freedom but leave critical decisions (routing, state management, data fetching) to the ecosystem.

AkashJS takes a different path:

- **Signals-first reactivity** — No virtual DOM, no RxJS, no Zones. Fine-grained updates that patch exactly the DOM nodes that changed.
- **Single-file components** — `.akash` files with `<script>`, `<template>`, and `<style scoped>` sections, compiled to optimized JS at build time.
- **Batteries included** — Router, forms, HTTP client, and CLI ship with the framework. Zero setup to go from idea to production.
- **TypeScript-native** — Every API is designed for TypeScript first. Full inference, no decorators, no `any` leaks.

## Core Principles

1. **Functions over classes** — Components are functions. Validators are functions. Guards are functions. No `@Component()` decorators or `implements CanActivate`.
2. **Signals over observables** — Reactive state with `signal()`, `computed()`, `effect()`. Reads are function calls, writes are `.set()`.
3. **Compile-time over runtime** — The `.akash` compiler transforms templates to direct DOM operations. No interpretation at runtime.
4. **Explicit over magic** — No zone.js change detection. No hidden injector trees. Dependencies are provided and injected explicitly.

## Packages

| Package | Description |
|---|---|
| `@akashjs/runtime` | Signals, components, DOM rendering, DI, test utilities |
| `@akashjs/compiler` | `.akash` SFC parser and code generator |
| `@akashjs/vite-plugin` | Vite integration for `.akash` files |
| `@akashjs/router` | File-based routing, guards, loaders |
| `@akashjs/forms` | Signal-based forms with declarative validation |
| `@akashjs/http` | Promise-based HTTP client with interceptors |
| `@akashjs/i18n` | Signal-based internationalization with lazy loading |
| `@akashjs/devtools` | Browser extension hook for inspecting components and signals |
| `@akashjs/cli` | Project scaffolding and dev tooling |
