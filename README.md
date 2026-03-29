# AkashJS

**Angular's structure. Svelte's simplicity. Features neither has.**

A TypeScript-first UI framework with signals reactivity, direct DOM rendering, and zero boilerplate. Built-in routing, forms, HTTP client, i18n, state management, Material Design components, and more — no decision fatigue, just start building.

[![Tests](https://img.shields.io/badge/tests-929%20passing-brightgreen)]()
[![Packages](https://img.shields.io/badge/packages-12-blue)]()
[![Docs](https://img.shields.io/badge/docs-76%20pages-purple)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

---

## Why AkashJS?

| Problem | AkashJS Solution |
|---|---|
| Angular is powerful but drowns you in boilerplate, RxJS, and 130KB bundles | Signals reactivity, functional components, < 8KB runtime |
| React gives freedom but no opinions — routing, state, forms are all separate decisions | Everything built-in: router, forms, HTTP, i18n, UI components |
| Svelte is simple but lacks enterprise features | Full DI, state machines, auth, offline-first, Material Design |
| No framework has real-time collaboration, type-safe APIs, or offline-first built in | AkashJS does |

## Quick Start

```bash
npx @akashjs/cli new my-app
cd my-app
npm install
npx akash dev
```

```html
<!-- src/components/Counter.akash -->
<script lang="ts">
import { signal } from '@akashjs/runtime';

const count = signal(0);
</script>

<template>
  <button onClick={() => count.update(c => c + 1)}>
    Count: {count()}
  </button>
</template>

<style scoped>
button {
  font-size: 1.5rem;
  padding: 0.5rem 1rem;
}
</style>
```

## Packages

| Package | Description | Size |
|---|---|---|
| `@akashjs/runtime` | Signals, components, DOM rendering, composables, a11y | Core |
| `@akashjs/compiler` | `.akash` SFC parser, template compiler, optimizer | Build |
| `@akashjs/vite-plugin` | Vite integration, HMR, route generation, env validation | Build |
| `@akashjs/router` | File-based routing, guards, loaders, middleware, transitions | Runtime |
| `@akashjs/forms` | Signal-based forms, validation, Zod adapter, schema-driven | Runtime |
| `@akashjs/http` | HTTP client, interceptors, resources, actions, WebSocket, auth | Runtime |
| `@akashjs/i18n` | Internationalization, lazy loading, pluralization | Runtime |
| `@akashjs/ui` | 24 Material Design 3 components | Runtime |
| `@akashjs/cli` | Scaffolding, dev server, build, generate, deploy, update | Tooling |
| `@akashjs/devtools` | Component inspector, signal tracking, performance timeline | Dev |

## Core Features

### Signals Reactivity

Fine-grained reactivity with no virtual DOM. Signal reads inside templates become direct DOM updates.

```ts
import { signal, computed, effect } from '@akashjs/runtime';

const count = signal(0);
const doubled = computed(() => count() * 2);

effect(() => console.log(`Count: ${count()}, Doubled: ${doubled()}`));

count.set(5); // logs: Count: 5, Doubled: 10
```

### Single-File Components

`.akash` files with `<script>`, `<template>`, and `<style scoped>` — compiled to optimized DOM operations at build time.

### Routing

File-based routing with guards, data loaders, middleware, and animated transitions.

```ts
// src/routes/blog/[slug]/page.akash → /blog/:slug
import { useRoute, useLoaderData } from '@akashjs/router';

const route = useRoute();
const data = useLoaderData<{ post: Post }>();
```

### Forms

Signal-based forms with declarative validation and Zod integration.

```ts
import { defineForm, required, email } from '@akashjs/forms';

const form = defineForm({
  email: { initial: '', validators: [required(), email()] },
  password: { initial: '', validators: [required()] },
});

await form.submit(async (values) => {
  await api.login(values.email, values.password);
});
```

### State Management

9 state management patterns — all signal-based, all composable:

```ts
// Global store
const useAuth = defineStore('auth', {
  state: () => ({ user: null, token: null }),
  getters: { isLoggedIn: (s) => s.token() !== null },
  actions: { logout() { this.user.set(null); this.token.set(null); } },
});

// URL-synced state
const search = useQueryState('q', '');

// Persistent state
const theme = useStorage('theme', 'light');

// Deep reactive objects
const state = deepSignal({ user: { name: 'Alice' } });
state.user.name = 'Bob'; // reactive!
```

### Material Design Components

24 MD3 components with design tokens, ripple effects, and theme support.

```ts
import { Button, TextField, Card, Dialog } from '@akashjs/ui';
import { generateTokenCSS } from '@akashjs/ui';

// Inject design tokens
document.head.innerHTML += `<style>${generateTokenCSS()}</style>`;
```

**Components:** Button, TextField, Checkbox, Radio, Switch, Select, Slider, AppBar, Tabs, Drawer, Breadcrumb, Card, List, Badge, Chip, Avatar, Tooltip, Dialog, Snackbar, ProgressBar, ProgressCircular, Skeleton, Divider, Grid, Stack

## What Makes AkashJS Unique

### Collaborative Signals

Make any state multiplayer with one line. Built-in CRDT conflict resolution.

```ts
const doc = createSync('room-1', { title: '', content: '' }, {
  transport: createWebSocketTransport({ url: 'wss://sync.example.com', room: 'room-1' }),
});

doc.state.title.set('Hello'); // syncs to all connected peers
```

### Type-Safe End-to-End API

Define your API once, get typed server handlers and client calls. No code generation.

```ts
const api = defineAPI({
  getUser: {
    input: z.object({ id: z.string() }),
    resolve: async ({ input }) => db.users.find(input.id),
  },
});

const client = createAPIClient<typeof api>({ baseUrl: '/api' });
const user = await client.getUser({ id: '123' }); // fully typed
```

### Offline-First

IndexedDB persistence with background sync and conflict resolution.

```ts
const todos = createOfflineStore('todos', {
  sync: { url: '/api/todos', strategy: 'last-write-wins' },
});

todos.add({ id: '1', text: 'Buy milk', done: false });
// Works offline, syncs when connection returns
```

### Zero-Config Deployment

```bash
akash deploy                # auto-detects Vercel/Cloudflare/Netlify/Deno
akash deploy --target cloudflare --ssr
akash deploy --static       # pure static export
```

### Visual Component Inspector

Press `Alt+Shift+I` in dev mode to click any component and inspect its props, signals, styles, and performance.

## Full Feature List

### Reactivity & State
`signal` · `computed` · `effect` · `batch` · `untrack` · `watch` · `watchOnce` · `deepSignal` · `tweened` · `defineStore` · `useStorage` · `useQueryState` · `createSync` · `createOfflineStore`

### Components & Rendering
`defineComponent` · `defineAsyncComponent` · `defer` · `Show` · `For` · `Switch` · `Portal` · `Transition` · `ErrorBoundary` · `Suspense` · `Await` · `VirtualFor` · `Image`

### Routing
`createRouter` · `useRoute` · `useParams` · `useNavigate` · `Link` · `Outlet` · `defineMiddleware` · `canDeactivate` · Route transitions

### Forms
`defineForm` · `defineFormGroup` · `createFormFromSchema` · 8 built-in validators · Zod adapter · Async validation · Debounce

### HTTP & Data
`createHttpClient` · `createResource` · `createAction` · `createSocket` · `createAuth` · `createPagination` · `retry` · `createQueue` · `dedup` · `defineAPI`

### Animations
`animate` · `animateStagger` · `animateSequence` · `animateGroup` · `animateSpring` · `keyframes` · `defineStates` · `tweened` · `createFlip` · `Transition` · View Transitions API

### Composables
`useInterval` · `useTimeout` · `useDebounce` · `useThrottle` · `useCounter` · `useToggle` · `usePrevious` · `useMediaQuery` · `useBreakpoint` · `useStorage` · `useClipboard` · `useOnline` · `useGeolocation` · `useWindowSize` · `useInfiniteScroll`

### Accessibility
`useFocusTrap` · `useAnnounce` · `useKeyboard`

### DX & Tooling
`pipe` (13 built-in pipes) · `defineDirective` (5 built-in) · `cx` · `css` · `inspect` · `createDataTable` · `createMachine` · `createEventBus` · Leak detection · Performance profiling · Bundle size budgets

### SEO & Head
`useHead` · `useSEO` · `useStructuredData` · `useOpenGraph` · `useTwitterCard` · `generateSitemap`

### SSR & SSG
`renderToString` · `renderToStream` · `hydrate` · `progressiveHydrate` · `prerender` · Server-mode compiler

### Platform
`defineCustomElement` · `registerServiceWorker` · `generateSWScript` · `subscribePush` · `definePlugin` · `createApp` · `enableSnapshots`

## CLI Commands

```bash
akash new <name>           # Create new project (--router, --forms)
akash dev                  # Start dev server
akash build                # Production build (--analyze)
akash test                 # Run tests (--watch, --coverage)
akash generate component   # Generate component (alias: g c)
akash generate route       # Generate route (alias: g r)
akash deploy               # Deploy to any platform
akash update               # Update and run migrations
akash size                 # Bundle size analysis (--budget)
```

## Documentation

**76 pages** of comprehensive documentation:

- **[Guide](docs/guide/)** — 33 pages covering every feature with examples
- **[API Reference](docs/api/)** — 8 pages with complete function signatures
- **[UI Components](docs/ui/)** — 16 pages for Material Design components
- **[Error Reference](docs/errors/)** — 18 pages with fix instructions

## Project Stats

| Metric | Count |
|---|---|
| Packages | 12 |
| Tests | 929 passing |
| Test files | 97 |
| Source files | 143 |
| Documentation pages | 76 |
| Material Design components | 24 |
| Runtime API exports | 240+ |
| Lines of code | 51,000+ |

## Browser Support

- Chrome/Edge 90+
- Firefox 90+
- Safari 15+

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting a PR.

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Run tests (`npx vitest run`)
4. Commit your changes
5. Push to the branch
6. Open a Pull Request

## License

MIT

---

**AkashJS** — Angular's structure, Svelte's simplicity, and features neither has.
