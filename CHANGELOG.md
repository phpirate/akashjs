# Changelog

All notable changes to AkashJS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
