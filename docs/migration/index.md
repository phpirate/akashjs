# Migration Guides

Moving to AkashJS from another framework? These guides map the concepts you already know to their AkashJS equivalents, with side-by-side code examples and step-by-step migration plans.

## Pick Your Guide

| Coming From | Guide | Similarity |
|---|---|---|
| Angular | [Angular to AkashJS](./angular) | Structure is familiar, reactivity is different |
| React | [React to AkashJS](./react) | JSX-like templates, no re-renders or hook rules |
| Vue | [Vue to AkashJS](./vue) | Very similar APIs — SFCs, reactivity, provide/inject |
| Svelte | [Svelte to AkashJS](./svelte) | Closest match — signals, compiler, SFCs |

## General Migration Strategy

### Incremental vs Big Bang

::: tip Incremental migration (recommended)
Migrate one route or feature at a time. Run AkashJS alongside your existing framework during the transition. This reduces risk and lets you ship continuously.
:::

::: warning Big-bang rewrite
Rewriting everything at once is tempting but risky. It delays shipping, introduces bugs in bulk, and blocks your team from delivering features during migration. Only choose this for small apps (under 20 components).
:::

### Incremental Migration Steps

1. **Set up AkashJS alongside your existing framework.** Add `@akashjs/runtime`, `@akashjs/vite-plugin`, and other packages to your project. Configure Vite to handle `.akash` files.

2. **Migrate shared utilities first.** Validators, formatters, API clients, and types can be shared between frameworks. Move them into a `shared/` folder.

3. **Migrate leaf components.** Start with small, self-contained components (buttons, cards, inputs) that have no framework-specific dependencies. Convert them to `.akash` files.

4. **Migrate stores and state.** Replace your existing state management (Redux, NgRx, Pinia, Svelte stores) with `defineStore()`. Stores are framework-agnostic and can be used from both old and new code.

5. **Migrate pages one at a time.** Pick a low-traffic page, rewrite it in AkashJS, and deploy. Once stable, move on to the next page.

6. **Migrate routing last.** Once most pages are migrated, switch from your old router to `@akashjs/router`.

7. **Remove the old framework.** When all pages are migrated, remove the old framework's dependencies.

### What Stays the Same

Regardless of which framework you are coming from, these things carry over:

- **TypeScript** -- AkashJS is TypeScript-first. Your types, interfaces, and utility types work as-is.
- **CSS / Tailwind / PostCSS** -- Styling tools work the same way. AkashJS supports scoped styles, CSS modules, and any CSS-in-JS solution.
- **npm packages** -- Any non-framework-specific npm package works with AkashJS. Date libraries, validation libraries, HTTP clients, etc.
- **Testing patterns** -- Unit tests for business logic are framework-agnostic. Only component tests need updating (use `mount()` from `@akashjs/runtime/test`).
- **Build tooling** -- AkashJS uses Vite. If you already use Vite, add `@akashjs/vite-plugin` to your config. If not, the CLI generates a working Vite config.
