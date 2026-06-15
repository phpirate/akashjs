# Contributing to AkashJS

Thanks for your interest in contributing! AkashJS is an open-source project and we welcome contributions of all kinds.

## Getting Started

1. **Fork** the repo and clone it locally
2. **Install** dependencies: `pnpm install`
3. **Run tests**: `npx vitest run`
4. **Start dev server** (for the reference app): `cd apps/taskflow && npx vite --port 3000`

## Project Structure

```
packages/
  runtime/     — Core framework (signals, components, DOM)
  compiler/    — .akash SFC compiler
  vite-plugin/ — Vite integration
  router/      — File-based routing
  forms/       — Form management and validation
  http/        — HTTP client, resources, WebSocket
  i18n/        — Internationalization
  ui/          — Material Design components
  cli/         — Command-line tools
  devtools/    — Developer tools
apps/
  taskflow/    — Reference application
docs/          — VitePress documentation
e2e/           — End-to-end tests (Playwright)
benchmark/     — Performance benchmarks
extensions/    — VS Code extension
```

## How to Contribute

### Bug Reports

Open an [issue](https://github.com/hish/akashjs/issues) with:
- Steps to reproduce
- Expected vs actual behavior
- Browser/Node version
- Minimal code example if possible

### Feature Requests

Open an [issue](https://github.com/hish/akashjs/issues) with:
- The problem you're trying to solve
- Your proposed solution
- Alternatives you considered

### Pull Requests

1. Create a branch from `main`: `git checkout -b fix/my-fix`
2. Make your changes
3. Add tests for new functionality
4. Run the full test suite: `npx vitest run`
5. Commit with a descriptive message (see below)
6. Push and open a PR

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add useClickOutside composable
fix: prevent memory leak in useDebounce cleanup
docs: update routing guide with middleware examples
chore: update dependencies
test: add tests for form validation edge cases
perf: optimize signal propagation for diamond deps
```

## Development

### Running Tests

```bash
# All tests
npx vitest run

# Watch mode
npx vitest

# Specific package
npx vitest run --project @akashjs/runtime

# Specific test file
npx vitest run packages/runtime/__tests__/signals.test.ts
```

### Building Packages

```bash
# Build a specific package
cd packages/runtime && npx tsup

# Build all packages
for pkg in runtime compiler vite-plugin router forms http i18n cli devtools ui; do
  (cd packages/$pkg && npx tsup)
done
```

### Documentation

Docs are in `docs/` using VitePress:

```bash
cd docs
npm install
npm run dev    # local preview
npm run build  # production build
```

## Code Style

- TypeScript strict mode
- No `any` unless absolutely necessary
- Prefer functions over classes
- Export types separately from values
- Add JSDoc comments to public APIs

## Release Process

Releases are automated via GitHub Actions:

1. Code is merged to `main`
2. CI runs tests automatically
3. To release: `git tag v0.2.0 && git push origin v0.2.0`
4. GitHub Actions builds, publishes to npm, and creates a GitHub Release

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
