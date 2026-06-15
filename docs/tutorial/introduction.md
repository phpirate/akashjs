# Tutorial: Build a Todo App

Welcome to the AkashJS tutorial. Over the next 10 steps, you will build a complete Todo application from scratch -- covering components, reactivity, routing, forms, data fetching, state management, styling, testing, and deployment.

By the end, you will have a working app that looks like this:

```
+--------------------------------------------------+
|  AkashJS Todos                    [Light/Dark]    |
+--------------------------------------------------+
|  [All]  [Active]  [Completed]                     |
+--------------------------------------------------+
|  [ Add a new todo...              ] [Add]         |
+--------------------------------------------------+
|  [x] Buy groceries                       [Edit]   |
|  [ ] Write AkashJS tutorial              [Edit]   |
|  [ ] Deploy to production                [Edit]   |
+--------------------------------------------------+
|  3 items total  |  1 completed  |  [Clear done]   |
+--------------------------------------------------+
```

## What You Will Build

> **Tip:** You can also try AkashJS instantly in the [Playground](https://play.akash.js.org) — no install needed. AkashJS is benchmarked in the official [js-framework-benchmark](https://krausest.github.io/js-framework-benchmark/).

This is not a toy example. The finished Todo app includes:

- **Component composition** -- reusable `TodoItem`, `TodoList`, `TodoForm`, and layout components
- **Signals reactivity** -- fine-grained state with `signal()`, `computed()`, and `effect()`
- **Client-side routing** -- separate pages for All, Active, and Completed todos with `createRouter`
- **Form handling** -- validated input with `defineForm`, inline editing, and two-way binding
- **Data fetching** -- a mock HTTP API with `createHttpClient`, `createResource`, and `createAction`
- **Global state** -- a `defineStore` for shared todo logic across components
- **Theming** -- dark mode toggle, conditional CSS classes with `cx()`, and transitions
- **Tests** -- component and store tests with `mount()`, `fireEvent`, and Vitest
- **Production deployment** -- optimized build, bundle analysis, and deploy

## Prerequisites

Before starting, make sure you have:

- **Node.js 20+** -- check with `node --version`
- **pnpm** (recommended) or npm -- check with `pnpm --version`
- **A code editor** -- VS Code with the AkashJS extension is recommended
- **Basic JavaScript/TypeScript knowledge** -- you should be comfortable with functions, arrow functions, `async`/`await`, and ES modules

::: tip No TypeScript expertise required
AkashJS is TypeScript-first, but the tutorial explains every type annotation as it appears. If you know JavaScript, you will be fine.
:::

## What You Will Learn

Each step of the tutorial introduces a core AkashJS concept:

| Step | Topic | What You Learn |
|------|-------|----------------|
| 1 | [Project Setup](./setup.md) | Scaffold a project, understand the file structure |
| 2 | [First Component](./first-component.md) | SFC structure, props, scoped styles |
| 3 | [Reactivity](./reactivity.md) | Signals, computed values, effects |
| 4 | [Routing](./routing.md) | Pages, router setup, navigation |
| 5 | [Forms](./forms.md) | Validated input, form submission |
| 6 | [Data Fetching](./data-fetching.md) | HTTP client, resources, actions |
| 7 | [State Management](./state.md) | Global stores, snapshots |
| 8 | [Styling](./styling.md) | Themes, conditional classes, transitions |
| 9 | [Testing](./testing.md) | Component tests, store tests |
| 10 | [Deployment](./deployment.md) | Production build, deploy, next steps |

::: info Estimated time
The full tutorial takes about 2-3 hours. Each step is self-contained and takes 10-20 minutes.
:::

## How to Follow Along

Each step includes complete, runnable code. You can either:

1. **Code along** -- type every example yourself (recommended for learning)
2. **Copy and paste** -- grab the code blocks and run them
3. **Clone the finished app** -- `npx @akashjs/cli clone todo-tutorial`

::: warning Start from step 1
Each step builds on the previous one. If you jump ahead, you may be missing files from earlier steps.
:::

## Need Help?

- **[Playground](https://play.akash.js.org)** — experiment with code without leaving the browser
- **[GitHub Issues](https://github.com/hish/akashjs/issues)** — bug reports and feature requests
- **[GitHub Discussions](https://github.com/hish/akashjs/discussions)** — questions and ideas

## Ready?

Let's set up your project.

---

**What's Next:** [Project Setup](./setup.md) -- scaffold your AkashJS project and start the dev server.
