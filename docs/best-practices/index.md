# Best Practices

AkashJS is built on a few core principles. Following them will keep your codebase fast, maintainable, and easy to reason about.

## Philosophy

1. **Functions over classes** -- Components, validators, guards, and stores are all functions. No decorators, no `extends`, no `implements`. If you find yourself reaching for a class, there is almost always a simpler function-based alternative.

2. **Signals over observables** -- Reactive state is a signal. Derived state is a computed signal. Side effects are effects. There is no RxJS, no `subscribe()` chains, no `pipe(map(), switchMap())`. Just call the signal.

3. **Compile-time over runtime** -- The `.akash` compiler transforms templates to direct DOM operations at build time. Static subtrees are hoisted. There is no virtual DOM, no runtime template interpreter, and no diffing overhead.

4. **Explicit over magic** -- No zone.js auto-detection, no hidden dependency injection, no implicit re-renders. When something changes, you can trace exactly why.

## What These Guides Cover

| Guide | Focus |
|---|---|
| [Project Structure](./project-structure) | Folder layout, naming, monorepos |
| [Components](./components) | Design patterns, composition, sizing |
| [State Management](./state) | Signal vs store vs context decision tree |
| [Performance](./performance) | Virtual lists, code splitting, profiling |
| [Testing](./testing) | Testing pyramid, mount patterns, mocking |
| [Accessibility](./accessibility) | Focus traps, announcements, keyboard nav |
| [Security](./security) | XSS, CSRF, secrets, CSP |
| [TypeScript](./typescript) | Inference, generics, strict mode |

## Quick Rules

::: tip Golden rules
- Keep components small and focused -- under 100 lines of template is a good target.
- Prefer `computed()` over `effect()` + `signal()` for derived state.
- Never destructure a signal call in a reactive context -- you lose reactivity.
- Use `batch()` when updating multiple signals that feed the same UI.
- Split state into domain-specific stores -- one giant store is a code smell.
- Test behavior, not implementation details.
:::

::: warning Avoid these
- Do not use `innerHTML` -- it opens XSS holes. Use template expressions instead.
- Do not put secrets in client-side code -- environment variables prefixed with `VITE_` are bundled into the client.
- Do not skip TypeScript strict mode -- it catches real bugs.
:::
