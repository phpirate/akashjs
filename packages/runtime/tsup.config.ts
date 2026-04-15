import { defineConfig } from 'tsup';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));

export default defineConfig({
  entry: {
    // Tier 0 — Core reactivity
    core: 'src/core.ts',
    // Tier 1 — Full runtime (backward compat, re-exports everything)
    index: 'src/index.ts',
    // Tier 2 — Feature entry points (individually tree-shakeable)
    store: 'src/store.ts',
    ssr: 'src/ssr.ts',
    sync: 'src/sync.ts',
    offline: 'src/offline.ts',
    animate: 'src/animate.ts',
    machine: 'src/machine.ts',
    pwa: 'src/pwa.ts',
    test: 'src/test.ts',
    // SEO & Head
    head: 'src/head.ts',
    seo: 'src/seo.ts',
    // Components & rendering
    transition: 'src/transition.ts',
    portal: 'src/portal.ts',
    'error-boundary': 'src/error-boundary.ts',
    suspense: 'src/suspense.ts',
    'virtual-list': 'src/virtual-list.ts',
    'async-component': 'src/async-component.ts',
    'await-block': 'src/await-block.ts',
    switch: 'src/switch.ts',
    image: 'src/image.ts',
    // State & reactivity extensions
    watch: 'src/watch.ts',
    'deep-signal': 'src/deep-signal.ts',
    'query-state': 'src/query-state.ts',
    tweened: 'src/tweened.ts',
    flip: 'src/flip.ts',
    // Composables & browser
    composables: 'src/composables.ts',
    browser: 'src/browser.ts',
    // DI & plugins
    di: 'src/di.ts',
    plugin: 'src/plugin.ts',
    // UI utilities
    toast: 'src/toast.ts',
    theme: 'src/theme.ts',
    css: 'src/css.ts',
    'data-table': 'src/data-table.ts',
    pipes: 'src/pipes.ts',
    directive: 'src/directive.ts',
    'event-modifiers': 'src/event-modifiers.ts',
    snippets: 'src/snippets.ts',
    // Infrastructure
    'event-bus': 'src/event-bus.ts',
    security: 'src/security.ts',
    'leak-detector': 'src/leak-detector.ts',
    perf: 'src/perf.ts',
    a11y: 'src/a11y.ts',
    devtools: 'src/devtools.ts',
    'error-hints': 'src/error-hints.ts',
    deprecation: 'src/deprecation.ts',
    errors: 'src/errors.ts',
    // Advanced
    defer: 'src/defer.ts',
    'view-transition': 'src/view-transition.ts',
    'web-component': 'src/web-component.ts',
    ssg: 'src/ssg.ts',
    hydration: 'src/hydration.ts',
    'infinite-scroll': 'src/infinite-scroll.ts',
    reconcile: 'src/reconcile.ts',
  },
  format: ['esm', 'cjs'],
  dts: { compilerOptions: { composite: false } },
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: true,
  minify: true,
  target: 'es2022',
  define: {
    '__RUNTIME_VERSION__': JSON.stringify(pkg.version),
  },
});
