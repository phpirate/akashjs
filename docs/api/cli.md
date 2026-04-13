# @akashjs/cli API

Binary name: `akash`

## akash new \<project-name\>

Create a new AkashJS project.

```sh
akash new my-app
akash new my-app --router      # Include @akashjs/router
akash new my-app --forms       # Include @akashjs/forms
akash new my-app --no-git      # Skip git init
akash new my-app --no-install  # Skip npm install
```

Scaffolds: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/App.akash`, `src/env.d.ts`, plus AI context files (`CLAUDE.md`, `GEMINI.md`, `.cursor/rules/`, `.github/copilot-instructions.md`, `.windsurfrules`).

### create-akash (standalone scaffolder)

```sh
npx create-akash my-app                         # basic template
npx create-akash my-app --template=full          # routing, stores, i18n, HTTP
npx create-akash my-app --template=local-first   # offline + sync + service worker
```

## akash dev

Start the Vite dev server.

```sh
akash dev
akash dev --port 3000    # Custom port
akash dev --host         # Expose to network
akash dev --no-open      # Don't open browser
```

## akash build

Build for production.

```sh
akash build
akash build --outDir dist  # Custom output directory
```

## akash test

Run tests with Vitest.

```sh
akash test              # Single run
akash test --watch      # Watch mode
akash test --coverage   # Coverage report
akash test --ui         # Vitest UI
```

## akash generate component \<name\>

Generate a component file. Alias: `akash g c`.

```sh
akash g c my-button          # src/components/MyButton.akash
akash g c sidebar --tsx      # src/components/Sidebar.tsx
akash g c user-profile-card  # src/components/UserProfileCard.akash
```

Converts kebab-case to PascalCase automatically.

## akash generate route \<path\>

Generate route files. Alias: `akash g r`.

```sh
akash g r about               # src/routes/about/page.akash
akash g r blog --loader       # + loader.ts
akash g r dashboard --guard   # + guard.ts
akash g r blog/[slug]         # Nested dynamic route
```

## akash size

Analyze production bundle size. Reports per-chunk and total sizes (raw and gzipped).

```sh
akash size                    # Show bundle size breakdown
akash size --budget 50        # Fail if total gzipped size exceeds 50 KB
```

The `--budget` flag sets a maximum gzipped size in KB. Exits with code 1 if the budget is exceeded, useful for CI pipelines.

## akash update

Update AkashJS packages to the latest version and run any necessary migrations.

```sh
akash update                  # Update all @akashjs/* packages
akash update --check          # Check for updates without installing
akash update --target next    # Update to a specific dist-tag (latest, next, rc)
akash update --no-migrate     # Skip automatic migration scripts
```

### Options

| Flag | Description |
|---|---|
| `--check` | Print available updates without modifying `package.json` or `node_modules` |
| `--target <tag>` | Target a specific npm dist-tag: `latest` (default), `next`, or `rc` |
| `--no-migrate` | Skip running migration schematics after updating |

When run without flags, `akash update` updates every `@akashjs/*` dependency in your project to the latest stable version, installs the new packages, and runs any migration scripts that ship with the update (e.g., renaming deprecated APIs, updating config files).

## akash codemod \[id\]

Run a codemod transformation on your source code. Codemods are automatic rewrites that migrate deprecated patterns to their modern equivalents.

```sh
akash codemod rename-createHttpClient          # Run a specific codemod
akash codemod --list                           # List available codemods
akash codemod --dry-run rename-createHttpClient # Preview without writing
akash codemod --from 0.1.0 --to 0.2.0         # Run all for version range
```

### Options

| Flag | Description |
|---|---|
| `[id]` | Run a specific codemod by its unique ID |
| `--list` | List all available codemods with descriptions |
| `--dry-run` | Preview changes without modifying any files |
| `--from <version>` | Source version (used with `--to` to select a range) |
| `--to <version>` | Target version (used with `--from` to select a range) |

When called with `--from` and `--to`, all codemods whose version range falls within the given span are executed in order. When called with a specific `[id]`, only that single codemod runs.

## akash deploy

Zero-config deployment to any platform. Auto-detects the target from project files and environment, generates platform-specific adapters, and deploys.

```sh
akash deploy                          # Auto-detect platform and deploy
akash deploy --target vercel          # Explicit platform
akash deploy --ssr                    # Enable server-side rendering
akash deploy --no-build               # Skip the build step
akash deploy --dry-run                # Generate config files without deploying
```

### Options

| Flag | Description |
|---|---|
| `--target <platform>` | Deploy target: `vercel`, `cloudflare`, `netlify`, `deno`, `static`, `node` |
| `--ssr` | Enable server-side rendering (generates a platform adapter) |
| `--no-build` | Skip running `vite build` before deploying |
| `--dry-run` | Generate platform config and adapter files without executing the deploy |

### Supported platforms

| Platform | Detection | Adapter |
|---|---|---|
| **Vercel** | `vercel.json` or `VERCEL` env | Edge runtime serverless function |
| **Cloudflare** | `wrangler.toml` or `wrangler.jsonc` | Cloudflare Workers `fetch` handler |
| **Netlify** | `netlify.toml` | Netlify Functions handler |
| **Deno Deploy** | `deno.json` or `deno.jsonc` | `Deno.serve` entry point |
| **Node** | Explicit `--target node` | Node.js HTTP server |
| **Static** | Default fallback | No adapter — static files in `dist/` |

When no `--target` is provided, the platform is auto-detected from config files in the project root. If none match, it falls back to `static`.

## akash audit

Scan your project for common security vulnerabilities.

```sh
akash audit                # Run full audit, print report
akash audit --fix          # Auto-fix issues where possible
akash audit --json         # Output results as JSON (for CI)
```

### What it scans for

- Unsanitized `innerHTML` assignments
- Missing CSP headers in SSR entry points
- Hardcoded secrets or API keys in source files
- Missing CSRF protection on HTTP clients
- Prototype-pollutable merge patterns (e.g., recursive `Object.assign` on user input)
- Unsafe URL usage (`javascript:` hrefs, unvalidated redirects)
- Missing security headers in server middleware
- Outdated dependencies with known CVEs

### Options

| Flag | Description |
|---|---|
| `--fix` | Automatically apply safe fixes (e.g., wrap `innerHTML` with `sanitize()`, add missing headers) |
| `--json` | Output structured JSON for programmatic consumption and CI integration |

Exit code is `1` when critical issues are found, making it suitable for CI gates.

## akash doctor

Diagnose project setup issues. Checks package versions, config files, and compatibility.

```sh
akash doctor
```

Runs checks for: `package.json`, `@akashjs/*` packages installed, vite config with akash plugin, TypeScript config, source directory, and version compatibility.
