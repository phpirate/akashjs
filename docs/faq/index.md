# Frequently Asked Questions

## General

### What is AkashJS?

AkashJS is a TypeScript-first UI framework for building web applications. It combines Angular's opinionated structure (built-in routing, forms, DI, HTTP client) with Svelte's simplicity (signals reactivity, compiler-based SFCs, tiny runtime). See the [Introduction](/guide/introduction) for more details.

### How is AkashJS different from React/Vue/Angular/Svelte?

AkashJS is **batteries-included** like Angular but **simple** like Svelte. Unlike React, it has no virtual DOM — signal changes directly patch the DOM. Unlike Angular, there's no RxJS, Zones, or decorators. Unlike Vue, the reactivity is compile-time optimized. Unlike Svelte, it has built-in routing, forms, HTTP, i18n, and a Material Design component library. Plus unique features no other framework has: collaborative signals, type-safe end-to-end APIs, and offline-first primitives.

### Is AkashJS production-ready?

AkashJS is functional with 1050+ tests passing. The API is stabilizing. It's suitable for personal projects, prototypes, and production apps.

### What's the bundle size?

The core runtime entry is **2.8KB gzipped**. With tree-shaking, a minimal app (signals + components) ships **~3KB gzipped** — smaller than Preact and competitive with Solid. As you use more features (stores, router, HTTP), the bundle grows incrementally — only what you import is shipped. A full-featured app with routing, query cache, and stores is typically ~15-20KB gzipped, which includes what React needs 80KB+ of separate libraries to achieve.

### What license is AkashJS under?

MIT — use it for anything, commercial or personal.

---

## Technical

### How does reactivity work without a virtual DOM?

Signals track which DOM nodes depend on them. When a signal changes, it directly updates only the specific text node, attribute, or element that reads it — no tree diffing needed. Each signal write takes ~110ns and each signal uses only ~373 bytes of memory. The compiler generates these fine-grained bindings at build time. See [Reactivity](/guide/reactivity) for details.

### Do I need TypeScript?

TypeScript is strongly recommended and the framework is designed for it, but plain JavaScript works too. The .akash SFC compiler handles TypeScript in `<script lang="ts">` blocks automatically.

### Can I use JSX instead of .akash files?

Yes — `defineComponent()` works with any render function, including JSX. The .akash SFC format is the recommended approach because it enables compiler optimizations (static hoisting, scoped styles), but programmatic components work fine.

### How does the .akash compiler work?

The compiler parses `.akash` files into three blocks (script, template, style), analyzes static vs dynamic nodes, hoists static subtrees into `<template>` elements that are cloned per instance, generates fine-grained effects for dynamic expressions, scopes the CSS, and outputs standard JavaScript. This means a component with 8 static elements creates them with a single `cloneNode(true)` call instead of 8 `createElement` chains. The Vite plugin handles this transparently during development and builds. See the [Compiler API](/api/compiler) for details.

### Can I use server-side rendering?

Yes — `renderToString()` and `renderToStream()` generate HTML on the server. The client then hydrates the pre-rendered HTML with `hydrate()`. Progressive hydration with IntersectionObserver is also supported. See [SSG / Prerendering](/guide/ssg).

---

## Ecosystem

### Can I use npm packages with AkashJS?

Absolutely. AkashJS runs in standard browser environments — any npm package that works in the browser works with AkashJS. Use `npm install` as usual.

### Can I use Tailwind CSS?

Yes. Tailwind works with AkashJS the same way it works with any Vite-based project. Install Tailwind, configure it, and use classes in your templates. The `cx()` utility from `@akashjs/runtime` makes conditional classes easy.

### What testing libraries can I use?

AkashJS ships with built-in test utilities (`mount()`, `fireEvent`) that work with Vitest. You can also use any testing library — Jest, Playwright for E2E, Testing Library patterns, etc.

### Can I use AkashJS with Express/Fastify/Hono?

Yes — the `defineAPI()` and `createAPIHandler()` utilities generate server handlers that work with any Node.js framework. For SSR, `renderToString()` works in any server environment.

---

## Migration

### Can I adopt AkashJS incrementally in an existing app?

Yes — `defineCustomElement()` lets you compile AkashJS components into Web Components (Custom Elements) that can be used in any framework or plain HTML. This is the recommended approach for incremental adoption.

### I'm coming from Angular. What's the learning curve?

If you know Angular, you'll be productive in AkashJS within hours. The concepts map directly: services→stores, pipes→pipes, guards→guards, HttpClient→createHttpClient, DI→provide/inject. The main difference is everything is functions instead of classes. See the [Angular Migration Guide](/migration/angular).

### I'm coming from React. What should I know?

The biggest shift: no re-renders. Components run their setup once, and signals handle all updates. No dependency arrays, no hooks rules, no `useCallback`/`useMemo` for performance. See the [React Migration Guide](/migration/react).

---

## Troubleshooting

### My signals aren't updating the DOM

Make sure you're calling the signal (e.g., `count()`) inside a reactive context — a template expression, `computed()`, or `effect()`. Reading a signal outside these contexts won't track dependencies.

::: tip
```ts
// Wrong — reads once, doesn't track
const value = count();
el.textContent = value;

// Right — tracks and auto-updates
effect(() => { el.textContent = String(count()); });
```
:::

### I get "called outside of component setup"

Functions like `onMount()`, `provide()`, and `inject()` must be called inside `defineComponent()`'s setup function, not in event handlers or async callbacks. See [Error AK0020](/errors/AK0020).

### My build is larger than expected

Run `akash size --budget` to identify which packages are large. Use `defineAsyncComponent()` for code splitting, and ensure tree-shaking is working (avoid barrel re-exports of unused code). See [Performance Best Practices](/best-practices/performance).

### Effects are running too often

Use `computed()` instead of `effect()` + `signal()` when deriving values. Use `batch()` when setting multiple signals at once. Use `untrack()` to read signals without subscribing. See [Performance](/guide/performance).

---

::: info Still have questions?
Open an issue on [GitHub](https://github.com/phpirate/akashjs/issues) — we're happy to help.
:::
