# Upgrading

AkashJS follows [semantic versioning](https://semver.org/) (semver). During the `0.x` era the API is pre-stable, so minor bumps may include breaking changes. Once `1.0.0` ships, the public API is locked: breaking changes only land in major versions.

Every release comes with deprecation warnings, codemods, and migration hints so you can upgrade incrementally.

## Release Notes

### 0.1.5

**Bug fixes:**

- **Compiler:** component children and JSX in dynamic props (e.g., `fallback={<div>...</div>}`) are now compiled into real render functions. Previously, children were stubbed as `() => null` and JSX in props was not compiled, breaking patterns like nested `<Show>` with `fallback`.
- **Runtime:** added `runInScope()` and exported `getCurrentScope()` so async code (like the router's lazy-loaded routes) can create components within the correct provide/inject scope.
- **Router:** `<Outlet>` now correctly propagates router context to lazy-loaded route components. Previously, `useNavigate()`, `useRoute()`, etc. would fail inside route pages because the component was created outside the provide/inject scope chain.

### 0.1.4

**Bug fixes:**

- **Compiler:** import statements in `.akash` `<script>` blocks are now correctly hoisted to the module top level. Previously they were placed inside the `defineComponent()` body, causing runtime errors when importing third-party libraries.
- **Router:** `createRouter()` now automatically provides router context to the component tree. Previously, `<Outlet>`, `useRoute()`, `useParams()`, and `useNavigate()` would fail because the context was never provided.
- **Vite plugin:** added Vite 6 support (`peerDependencies` now accepts `^5.0.0 || ^6.0.0`).

---

## `akash update`

The fastest way to upgrade is the built-in update command:

```sh
akash update
```

This will:

1. Detect all `@akashjs/*` packages in your project.
2. Update them to the latest stable versions.
3. Run any migration scripts that ship with the new version (renaming APIs, updating config files, etc.).

### Options

| Flag | Description |
|---|---|
| `--check` | Print available updates without modifying anything |
| `--target <tag>` | Target a dist-tag: `latest` (default), `next`, or `rc` |
| `--no-migrate` | Skip automatic migration scripts |

::: tip
Run `akash update --check` in CI to get notified when new versions are available without changing your lockfile.
:::

## `akash codemod`

Codemods are automatic source-code transformations that rewrite deprecated patterns to their modern equivalents. They run as part of `akash update`, but you can also invoke them manually:

```sh
# List available codemods
akash codemod --list

# Run a specific codemod
akash codemod rename-createHttpClient

# Preview changes without writing files
akash codemod rename-createHttpClient --dry-run

# Run all codemods for a version range
akash codemod --from 0.1.0 --to 0.2.0
```

### Flags

| Flag | Description |
|---|---|
| `[id]` | Run a specific codemod by ID |
| `--list` | List all available codemods |
| `--dry-run` | Preview changes without modifying files |
| `--from <version>` | Source version |
| `--to <version>` | Target version |

::: tip
Always run with `--dry-run` first to review what will change before committing to it.
:::

## Deprecation warnings

When you use a deprecated API, AkashJS prints a warning to the console on first invocation:

```
[AkashJS] DEPRECATED: createStore() is deprecated since v0.2.0 and will be removed in v1.0.0.
  Migrate to: defineStore()
  See: https://akash.js.org/migration
```

Each deprecated API only warns once per process to avoid flooding your console.

### Suppressing warnings

During testing you may want to silence deprecation noise:

```ts
import { setDeprecationWarnings } from '@akashjs/runtime';

// In your test setup file:
setDeprecationWarnings(false);
```

Call `resetDeprecationWarnings()` if you need to re-enable them later in the same process.

::: tip
Suppressing warnings is useful in test suites, but keep them on during development so you spot deprecated usage early.
:::

## `deprecated()` — mark your own APIs

If you are a library author building on top of AkashJS, you can use the same deprecation system for your own APIs:

```ts
import { deprecated } from '@akashjs/runtime';

function newImplementation(x: number) {
  return x * 2;
}

// Old API that still works but warns:
export const oldApi = deprecated(newImplementation, {
  name: 'oldApi',
  replacement: 'newImplementation',
  since: '2.0.0',
  removeIn: '3.0.0',
  message: 'Use newImplementation() for better performance.',
});
```

You can also redirect warnings to a custom handler (for example, to send them to your logging service):

```ts
import { setWarningHandler } from '@akashjs/runtime';

setWarningHandler((msg) => {
  myLogger.warn(msg);
});
```

## `checkCompatibility()` — verify package versions

If your project uses multiple `@akashjs/*` packages, you can verify they are on compatible versions:

```ts
import { checkCompatibility } from '@akashjs/runtime';

const result = checkCompatibility({
  '@akashjs/runtime': '0.2.0',
  '@akashjs/router': '0.2.0',
  '@akashjs/forms': '0.1.0',
});

if (!result.compatible) {
  console.error(result.errors);
}
// result.warnings contains non-critical issues (e.g., minor mismatches)
```

A major version mismatch returns `compatible: false` with an error. A minor mismatch returns a warning suggesting you run `akash update`.

## API stability markers

Every public API in AkashJS is tagged with a stability level:

| Marker | Meaning |
|---|---|
| **stable** | Safe for production. Will not change without a major version bump. |
| **experimental** | Usable but the API may change in minor releases. |
| **deprecated** | Still works but will be removed in a future major version. |
| **internal** | Implementation detail. Do not depend on it. |

You can query the registry at runtime:

```ts
import { getAPIsByStability } from '@akashjs/runtime';

const experimental = getAPIsByStability('experimental');
console.log('Experimental APIs:', experimental.map((a) => a.name));
```

## Reading the CHANGELOG

Every release includes a `CHANGELOG.md` entry at the repository root. Each entry lists:

- **Breaking changes** (if any) with migration steps
- **Deprecations** with the replacement API
- **New features** and enhancements
- **Bug fixes**

::: tip
Subscribe to the GitHub repository's releases to get notified of new versions. The changelog is the single source of truth for what changed and why.
:::
