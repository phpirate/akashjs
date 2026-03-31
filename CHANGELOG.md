# Changelog

All notable changes to AkashJS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.2] - 2026-03-31

### Fixed

**Runtime**
- `deepSignal` per-path tracking fully isolated — changing `user.name` no longer triggers effects reading `user.address.city` or `settings.theme` (each property change fires exactly once)
- `deepSignal` root `version` signal no longer bumped during `notifyPath` (only in set/delete traps for `$signal` users)

**UI Components — Reactive open/close**
- Drawer: `open` prop is now reactive via `effect()` + `readProp()` — scrim opacity, pointer-events, and drawer transform update when `open` changes
- Dialog: same reactive fix — scrim and dialog surface styles update reactively
- Menu: added `readProp()` for reactive prop unwrapping + deferred outside-click
- Combobox: `readProp()` for `open`, `options`, `value` props — works even when `__reactive` getter comes from a different runtime instance

**UI Components — Click handler fixes**
- Combobox, Menu, Drawer, Dialog: outside-click/scrim handlers now use `requestAnimationFrame` deferral to avoid closing on the same click that opened the overlay
- Combobox, Menu: `trigger.contains(e.target)` instead of `===` check to handle clicks on child elements inside the trigger

**UI Components — Portal rendering**
- Combobox: dropdown panel always appended to `document.body` with `position: fixed` (both standalone and custom trigger modes) — prevents clipping by `overflow: hidden` ancestors
- Menu: panel appended to `document.body` for same reason

**Router**
- Outlet: re-provides router context inside `runInScope` in the async `.then()` callback — ensures `inject(RouterContext)` works for lazy-loaded route components

**Compiler**
- Callback refs supported: `ref={(el) => { myVar = el; }}` generates `((el) => { ... })(element)` instead of `.current = element`
- Runtime check: if ref value is a function, call it; otherwise use `.current`

## [0.2.1] - 2026-03-31

### Fixed
- `deepSignal` array mutation methods (`push`, `splice`, `sort`, etc.) now batch notifications — single effect run per operation instead of multiple (`@akashjs/runtime`)
- `getDiagnostics` no longer produces false TypeScript errors for template JSX syntax (`@akashjs/compiler`)
- `createOfflineStore.online()` returns `true` in Node.js instead of `undefined` (`@akashjs/runtime`)
- `getCompletions` works inside template `{expressions}` — returns script-scope variables (`@akashjs/compiler`)
- `getCompletions`/`getHoverInfo` accept `(source, filename, position)` with `{ column }` alias (`@akashjs/compiler`)
- `extractPropDefs` resolves `interface Props extends Base` — inherited props included (`@akashjs/compiler`)
- Hover shows correct types for arrays (`number[]`), Maps, generics — TypeScript lib files loaded (`@akashjs/compiler`)
- `validateProps` accepts both `(defs, props)` and `(source, resolver)` call patterns with type mismatch detection (`@akashjs/compiler`)

## [0.2.0] - 2026-03-31

### Added

**New Features**
- `on()` helper for explicit effect dependencies — `effect(on(url, (cur, prev) => {...}))` (`@akashjs/runtime`)
- `class:name` directive — `<div class:active={isActive()}>` compiles to `classList.toggle` (`@akashjs/compiler`)
- Block template syntax — `{#if}`, `{:else if}`, `{:else}`, `{/if}`, `{#each list as item (key)}`, `{:empty}`, `{/each}` (`@akashjs/compiler`)
- Store plugins — `configureStores({ plugins })` with `init` and `onAction` hooks (`@akashjs/runtime`)
- `$patch()` on stores — merge partial state (`@akashjs/runtime`)
- DevTools — `installDevtools()` exposes `__AKASH_DEVTOOLS__` with store inspection, time-travel recording, signal/effect monitoring (`@akashjs/runtime`)
- Compile-time prop validation — `validateProps()`, `extractPropDefs()`, `validatePropsAgainst()` (`@akashjs/compiler`)
- TypeScript language service integration — `getDiagnostics`, `getCompletions`, `getHoverInfo` powered by TypeScript's type checker (`@akashjs/compiler`)
- ESLint plugin — `@akashjs/eslint-plugin` with 3 rules: `no-signal-write-in-computed`, `require-effect-cleanup`, `no-direct-signal-mutation`
- Project scaffolding — `@akashjs/create` (`npx @akashjs/create my-app`)
- Testing utilities — `waitFor()`, `waitForElement()`, `flush()`, `createTestSignal()` with history tracking (`@akashjs/runtime/test`)
- VS Code extension LSP server — diagnostics, completions, and hover for `.akash` files

**Runtime Improvements**
- Glitch-free diamond dependency resolution — `signal.set()` wraps notifications in `batch()`, `recompute()` defers flush via `enterBatch()`/`exitBatch()`
- Circular dependency detection for both effects (run count limit per flush) and computeds (re-entry detection via `computingSet`)
- Effect error recovery — effects re-subscribe to previous sources on throw, retry on next change
- Effect cleanup errors caught and logged instead of crashing
- `signal.set()` inside `computed()` warns in dev mode
- Profiler hooks — `startProfiling()`/`stopProfiling()` now captures signal updates, effect runs, computed evaluations
- `Show`/`For` programmatic API — plain functions accepted as `when`/`each` (not just `__reactive`-marked)
- `watchOnce` defers by default (fires on first change, not initial value)
- `createMachine` `send(event, payload)` passes payload to action callbacks
- `createSlots(props)` works without explicit slot names
- `hasSlot(slots, 'name')` supports named lookup
- `tweened()` falls back to `setTimeout` in Node.js
- `calculateRange()` accepts options object
- `createDataTable.filter()` searches all columns when none marked filterable
- `ssrElement()` accepts rest args for multiple children
- `renderToString` calls component functions and serializes SSR nodes
- `__getStoreInstances()` returns plain object (JSON-serializable)
- Store getters support `this` for cross-getter access
- `inspect()` returns object with `{ dispose, value, values, label }`

**Compiler Improvements**
- SVG elements use `createElementNS` with namespace propagation; `foreignObject` children revert to HTML
- CSS: `:global()` unwrapped, `@keyframes` names scoped, CSS nesting (`&`) scoped, `:is()`/`:where()` handled correctly, `body`/`html`/`*` left unscoped, multiple `<style>` blocks merged, duplicate `class` attributes merged
- Boolean/IDL properties use DOM property assignment: `checked`, `disabled`, `muted`, `autoplay`, `controls`, `tabIndex`, `contentEditable`, `id`, `name`, `type`, `placeholder`, `src`, `href`, etc.
- `style={css()}` uses `style.cssText` in reactive effect
- `innerHTML` uses property assignment
- Spread props (`{...obj}`) on elements and components
- `ref` attribute wires via `.current`
- Inline conditional JSX compiled to `renderConditional`
- Event modifiers (`onClick|preventDefault|stopPropagation|once|capture|passive|self`)
- `<script>` tags stripped from templates with warning
- Unclosed HTML tag warnings
- `export` statements in scripts hoisted correctly
- `<select>` onChange guarded during render
- Whitespace between expressions preserved
- `bind:checked` uses `change` event; `bind:value` on number inputs converts to `Number()`
- `readonly` property uses correct `readOnly` casing

**Package Fixes**
- `@akashjs/i18n`: HTML-escaped interpolation, pluralization fallback with `n` param, nested vs flat key conflict warning
- `@akashjs/http`: `createResource` race condition fix (request counter), `createAction` `onError` called without re-throw
- `@akashjs/forms`: Zod subpath export (`@akashjs/forms/zod`), `createFormFromSchema` re-exported
- `@akashjs/router`: Outlet depth incremented for nested layouts

### Stats
- **91 bugs found and fixed** across 8 packages
- **6 feature gaps filled** (on(), class:name, store plugins, block syntax, devtools, prop validation)
- **4 new packages**: `@akashjs/eslint-plugin`, `@akashjs/create`, VS Code extension (LSP), testing utilities

## [0.1.5] - 2026-03-30

### Fixed

**Runtime (`@akashjs/runtime` 0.1.13)**
- Fixed infinite loop regression in `signal.set()` — snapshot subscribers before iterating to prevent re-entrant Set traversal (BUG-026)
- `Show` children render-prop now receives the correct value in nested `For` contexts (BUG-022)

**Compiler (`@akashjs/compiler` 0.1.25)**
- Inline conditional JSX (`{cond && <Tag>}`, `{cond ? <A> : <B>}`) now compiles to `renderConditional` with proper DOM creation (BUG-034)
- `export default`, `export { ... }` in `<script>` blocks handled correctly (BUG-014)
- `<select>` onChange no longer fires during render when inside `<Show>` or with async props (BUG-016)
- Event modifiers (`onClick|preventDefault|stopPropagation|once|capture|passive|self`) now parsed and applied (BUG-035)

**Router (`@akashjs/router` 0.1.7)**
- Nested `<Outlet>` depth incremented correctly for layout routes (BUG-013)

## [0.1.4] - 2026-03-30

### Fixed

**Runtime (`@akashjs/runtime` 0.1.11)**
- Effects now re-run synchronously on `signal.set()` outside `batch()` (BUG-026)
- `$subscribe` callbacks no longer fire on initial subscription — only on actual state changes (BUG-025)
- `$subscribe` disposes its internal effect when all subscribers unsubscribe

**Compiler (`@akashjs/compiler` 0.1.24)**
- SVG elements (`<svg>`, `<circle>`, `<path>`, etc.) now use `createElementNS` with the correct SVG namespace (BUG-031)
- SVG context propagates to all descendant elements inside `<svg>`
- `:global()` pseudo-selector in scoped CSS is now properly unwrapped (BUG-032)
- Boolean HTML attributes (`checked`, `disabled`, `hidden`, etc.) use DOM property assignment instead of `setAttribute` (BUG-023/033)
- `innerHTML` binding uses property assignment instead of `setAttribute` (BUG-027)
- Spread props (`{...obj}`) now parsed and applied to both elements and components (BUG-028)
- `ref` attribute wires DOM element to ref via `.current` assignment (BUG-029)
- Inline conditional JSX (`{show() && <span>…</span>}`) is now reactive with DOM insertion (BUG-034)
- HTML comments in templates are stripped during compilation (BUG-018)
- `export` statements in `<script>` blocks are handled correctly (BUG-014)
- Nested route `<Outlet>` increments depth correctly, fixing infinite recursion (BUG-013)

**i18n (`@akashjs/i18n` 0.1.4)**
- Pluralization fallback now works when a key is missing in the current locale (BUG-030)
- Pluralization accepts both `count` and `n` as the plural parameter

## [0.1.3] - 2026-03-29

### Performance
- Enabled minification across all packages (25-33% size reduction)
- Added code splitting for runtime — heavy features are separate chunks
- Added `@akashjs/runtime/core` subpath (3.4KB gzipped — signals + components + DOM only)
- Added subpath exports: `/store`, `/ssr`, `/sync`, `/offline`, `/animate`, `/machine`, `/pwa`

## [0.1.2] - 2026-03-29

### Added
- README.md for all 10 npm packages (visible on npmjs.com)
- E2E test scaffold with Playwright (14 integration tests)
- Benchmark runner script (`npx tsx benchmark/run.ts`)

## [0.1.1] - 2026-03-29

### Added
- `useClickOutside()` composable for dropdowns, modals, popovers
- Automated CI/CD pipeline (tests on push, publish on tag)

### Fixed
- `batch` import in `deep-signal.ts`

## [0.1.0] - 2026-03-29

### Added — Initial Release

**Core Runtime**
- Signals reactivity: `signal()`, `computed()`, `effect()`, `batch()`, `untrack()`
- Direct DOM rendering (no virtual DOM)
- `defineComponent()` with lifecycle hooks (`onMount`, `onUnmount`, `onError`)
- Context API: `createContext()`, `provide()`, `inject()`
- Control flow: `Show`, `For`, `Switch`, `Portal`, `ErrorBoundary`, `Suspense`
- Slots: `renderSlot()`, `hasSlot()`, `createSlots()`

**Compiler**
- `.akash` SFC parser (script, template, style blocks)
- Template AST parser with directives (`:if`, `:for`, `:show`, `bind:value`)
- Scoped CSS processing
- Source map generation
- Static analysis and hoisting optimization
- Server-mode output (string concatenation)
- Language service (completions, diagnostics, hover)

**Router (`@akashjs/router`)**
- File-based routing with guards, loaders, middleware
- `<Link>`, `<Outlet>` components
- `useRoute()`, `useParams()`, `useNavigate()`, `useLoaderData()`
- `canDeactivate` guard, route transitions
- History API wrapper

**Forms (`@akashjs/forms`)**
- `defineForm()` with signal-based fields
- 8 built-in validators (required, minLength, email, pattern, etc.)
- Async validation with debounce
- `defineFormGroup()` for nested forms
- Zod adapter (`zodFieldValidator`, `zodValidator`)
- Schema-driven forms (`createFormFromSchema`)

**HTTP (`@akashjs/http`)**
- `createHttpClient()` with typed methods
- Interceptor middleware chain
- `createResource()` for async data signals
- `createAction()` for mutations with optimistic updates
- `createSocket()` WebSocket client with auto-reconnect
- `createAuth()` for token management
- `createPagination()` and `createCursorPagination()`
- `defineAPI()` / `createAPIClient()` for type-safe E2E APIs
- `retry()`, `createQueue()`, `dedup()`

**i18n (`@akashjs/i18n`)**
- Signal-based locale switching
- Interpolation, nested messages, pluralization
- Lazy-loaded translations, fallback locale

**UI (`@akashjs/ui`)**
- 24 Material Design 3 components
- Design tokens (colors, typography, spacing, elevation, shape, motion)
- Light/dark theme support

**CLI (`@akashjs/cli`)**
- `akash new`, `dev`, `build`, `test`, `generate`, `deploy`, `update`, `size`, `audit`

**DevTools (`@akashjs/devtools`)**
- Component tree tracking, signal inspector
- Visual component inspector (Alt+Shift+I)
- Performance event timeline

**Advanced Features**
- `createSync()` — collaborative signals with CRDT
- `createOfflineStore()` — IndexedDB persistence with sync
- SSR: `renderToString()`, `renderToStream()`, hydration
- SSG: `prerender()` with route discovery
- PWA: service worker registration, caching strategies
- Web Components: `defineCustomElement()`
- 40+ composables (useStorage, useMediaQuery, useTheme, etc.)
- Accessibility: `useFocusTrap()`, `useAnnounce()`, `useKeyboard()`
- Animations: `animate()`, `animateSpring()`, `tweened()`, FLIP
- State machines: `createMachine()`
- Event bus: `createEventBus()`
- Deep signals: `deepSignal()`
- Watch: `watch()`, `watchOnce()`, `watchDebounced()`
- Pipes: 13 built-in (date, currency, uppercase, etc.)
- Directives: 5 built-in (autoFocus, clickOutside, longPress, etc.)
- Security: `sanitize()`, CSP, CSRF, security headers, `akash audit`
- Performance: profiling, leak detection, bundle budgets
- URL state: `useQueryState()`, `useQueryStates()`

**Documentation**
- 114 pages (guide, tutorial, cookbook, best practices, migration, API, UI, errors, FAQ)
- VitePress site with custom theme

**Testing**
- 956 unit tests across 99 files
- E2E test scaffold with Playwright

**Reference App**
- TaskFlow — project management with Kanban board, drag-and-drop, auth, dark mode
