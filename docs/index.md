---
layout: home
hero:
  name: AkashJS
  text: Angular structure, Svelte simplicity
  tagline: A TypeScript-first UI framework with signals reactivity, direct DOM rendering, and zero boilerplate. 950+ tests. 12 packages. Everything you need.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Tutorial
      link: /tutorial/introduction
    - theme: alt
      text: API Reference
      link: /api/runtime

features:
  - icon: ⚡
    title: Signals Reactivity
    details: Fine-grained reactivity with signal(), computed(), and effect(). No virtual DOM diffing — changes patch the exact DOM node that changed.
    link: /guide/reactivity
    linkText: Learn more
  - icon: 📦
    title: Single-File Components
    details: Write components in .akash files with script, template, and scoped styles — compiled to optimized DOM operations at build time.
    link: /guide/components
    linkText: Learn more
  - icon: 🔋
    title: Batteries Included
    details: Router, forms, HTTP client, i18n, state management, auth, and CLI. No decision fatigue — everything works together out of the box.
    link: /guide/introduction
    linkText: See all features
  - icon: 🎨
    title: Material Design UI
    details: 24 Material Design 3 components with design tokens, dark mode, and ripple effects. Ready for production.
    link: /ui/getting-started
    linkText: Browse components
  - icon: 🌐
    title: Unique Features
    details: Collaborative signals (CRDT), type-safe end-to-end APIs, offline-first with IndexedDB, visual inspector, and zero-config deployment.
    link: /guide/collaborative
    linkText: Explore
  - icon: 🚀
    title: Production Ready
    details: SSR, hydration, code splitting, bundle size budgets, leak detection, performance profiling, PWA support, and Web Components output.
    link: /guide/performance
    linkText: Learn more
---

<div class="vp-doc" style="padding: 2rem 1.5rem; max-width: 800px; margin: 0 auto;">

## Start Learning

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-top: 16px;">

<a href="/tutorial/introduction" style="text-decoration: none; display: block; padding: 20px; border-radius: 12px; border: 1px solid var(--vp-c-divider); transition: border-color 0.2s;">
  <strong>📖 Tutorial</strong><br>
  <span style="color: var(--vp-c-text-2); font-size: 14px;">Build a complete Todo app step by step. Best way to learn AkashJS from scratch.</span>
</a>

<a href="/cookbook/" style="text-decoration: none; display: block; padding: 20px; border-radius: 12px; border: 1px solid var(--vp-c-divider); transition: border-color 0.2s;">
  <strong>🍳 Cookbook</strong><br>
  <span style="color: var(--vp-c-text-2); font-size: 14px;">Copy-pasteable recipes for auth, dark mode, modals, infinite scroll, drag-and-drop, and more.</span>
</a>

<a href="/best-practices/" style="text-decoration: none; display: block; padding: 20px; border-radius: 12px; border: 1px solid var(--vp-c-divider); transition: border-color 0.2s;">
  <strong>✅ Best Practices</strong><br>
  <span style="color: var(--vp-c-text-2); font-size: 14px;">Architecture, performance, testing, security, and TypeScript patterns for production apps.</span>
</a>

<a href="/migration/" style="text-decoration: none; display: block; padding: 20px; border-radius: 12px; border: 1px solid var(--vp-c-divider); transition: border-color 0.2s;">
  <strong>🔄 Migration Guides</strong><br>
  <span style="color: var(--vp-c-text-2); font-size: 14px;">Coming from Angular, React, Vue, or Svelte? Side-by-side comparisons and step-by-step migration.</span>
</a>

</div>

## Quick Example

```ts
import { signal, computed } from '@akashjs/runtime';

// Reactive state — no useState, no Zones, no RxJS
const count = signal(0);
const doubled = computed(() => count() * 2);

// Direct DOM update — no virtual DOM diffing
count.set(5);
console.log(doubled()); // 10
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

</div>

