# @akashjs/runtime API

## Signals

### signal(initialValue, options?)

Create a reactive value.

```ts
function signal<T>(initialValue: T, options?: {
  equals?: (a: T, b: T) => boolean;
}): Signal<T>;
```

**Returns:** `Signal<T>` — a callable with `.set()`, `.update()`, `.peek()`.

### computed(fn, options?)

Create a derived reactive value.

```ts
function computed<T>(fn: () => T, options?: {
  equals?: (a: T, b: T) => boolean;
}): ReadonlySignal<T>;
```

### effect(fn, options?)

Run a side-effect when dependencies change.

```ts
function effect(
  fn: () => void | (() => void),
  options?: { render?: boolean },
): () => void; // dispose function
```

### batch(fn)

Batch signal updates to prevent intermediate effects.

```ts
function batch<T>(fn: () => T): T;
```

### flushSync()

Synchronously flush all pending effects.

```ts
function flushSync(): void;
```

### untrack(fn)

Read signals without tracking dependencies.

```ts
function untrack<T>(fn: () => T): T;
```

## Components

### defineComponent(setup)

Define a component from a setup function.

```ts
function defineComponent<P extends Record<string, unknown>>(
  setup: (ctx: ComponentContext<P>) => () => AkashNode,
): Component<P>;
```

### onMount(fn)

Register a mount callback. May return a cleanup function.

```ts
function onMount(fn: () => void | (() => void)): void;
```

### onUnmount(fn)

Register an unmount callback.

```ts
function onUnmount(fn: () => void): void;
```

### onError(fn)

Register an error boundary handler.

```ts
function onError(fn: (error: Error) => void): void;
```

### ref()

Create a DOM element reference.

```ts
function ref<T = HTMLElement>(): Ref<T>;
```

## Context

### createContext(defaultValue?)

Create a typed context key.

```ts
function createContext<T>(defaultValue?: T): InjectionKey<T>;
```

### provide(key, value)

Provide a value to descendant components.

```ts
function provide<T>(key: InjectionKey<T>, value: T): void;
```

### inject(key, fallback?)

Inject a value from an ancestor provider.

```ts
function inject<T>(key: InjectionKey<T>): T;
function inject<T>(key: InjectionKey<T>, fallback: T): T;
```

## DOM Helpers

### Show

Conditional rendering component.

```ts
function Show<T>(props: {
  when: T | null | undefined | false;
  fallback?: () => AkashNode;
  children: (value: T) => AkashNode;
}): Node;
```

### For

List rendering component with keyed reconciliation.

```ts
function For<T>(props: {
  each: T[];
  key: (item: T) => unknown;
  children: (item: T, index: number) => AkashNode;
}): Node;
```

## Error Catalog

### formatError(code, context?)

Format an error message with code, hint, and doc link.

### akashError(code, context?)

Create an Error with a formatted message.

### getErrorDef(code)

Look up an error definition by code.

### getAllErrorCodes()

Get all registered error codes.

## Store

### defineStore(id, config)

Create a reactive store.

```ts
function defineStore<S, G, A>(
  id: string,
  config: {
    state: () => S;
    getters?: G & Record<string, (state: S) => unknown>;
    actions?: A & Record<string, (...args: any[]) => unknown>;
  },
): () => Store<S, G, A>;
```

**Returns:** a composable that returns the store instance. The store provides:

- `$id` — the store identifier string.
- `$reset()` — reset state to initial values.
- `$snapshot()` — return a plain copy of current state.
- `$subscribe(callback)` — listen for state changes. Returns an unsubscribe function.

### clearStores()

Dispose all active stores. Useful for SSR or testing.

```ts
function clearStores(): void;
```

## Transitions

### Transition

Component that applies enter/exit CSS transitions to its child.

```ts
function Transition(props: {
  name?: string;
  enterFrom?: string;
  enterTo?: string;
  exitFrom?: string;
  exitTo?: string;
  duration?: number;
  children: () => AkashNode;
}): Node;
```

### getTransitionClasses(name, phase)

Return the class names for a transition phase.

```ts
function getTransitionClasses(name: string, phase: 'enter' | 'exit'): {
  from: string;
  active: string;
  to: string;
};
```

### enterTransition(el, classes, duration?)

Apply enter transition to an element. Returns a promise that resolves when complete.

```ts
function enterTransition(el: HTMLElement, classes: TransitionClasses, duration?: number): Promise<void>;
```

### exitTransition(el, classes, duration?)

Apply exit transition to an element. Returns a promise that resolves when complete.

```ts
function exitTransition(el: HTMLElement, classes: TransitionClasses, duration?: number): Promise<void>;
```

### generateTransitionCSS(name, options?)

Generate CSS keyframe rules for a named transition.

```ts
function generateTransitionCSS(name: string, options?: {
  duration?: number;
  easing?: string;
}): string;
```

## Head Management

### useHead(config)

Set document head tags reactively. Supports title, meta, link, and script tags.

```ts
function useHead(config: {
  title?: string | (() => string);
  meta?: Array<Record<string, string>>;
  link?: Array<Record<string, string>>;
  script?: Array<Record<string, string>>;
}): void;
```

### renderHeadToString()

Render collected head tags to an HTML string for SSR.

```ts
function renderHeadToString(): string;
```

### collectSSRHead()

Collect head configuration during server-side rendering. Returns raw tag objects.

```ts
function collectSSRHead(): HeadTag[];
```

## Plugins

### definePlugin(config)

Define a plugin that can extend the application.

```ts
function definePlugin(config: {
  name: string;
  setup: (app: App) => void;
}): Plugin;
```

### createApp(component)

Create an application instance. Chain `.use(plugin)` to install plugins, then `.mount(selector)` to render.

```ts
function createApp(component: Component): App;

interface App {
  use(plugin: Plugin): App;
  mount(selector: string | HTMLElement): void;
  unmount(): void;
}
```

## Composables

### useInterval(ms)

Run a callback on an interval. Auto-cleans up on unmount.

```ts
function useInterval(ms: number): {
  start(fn: () => void): void;
  stop(): void;
  isRunning: () => boolean;
};
```

### useTimeout(ms)

Schedule a callback after a delay. Auto-cleans up on unmount.

```ts
function useTimeout(ms: number): {
  start(fn: () => void): void;
  cancel(): void;
  isPending: () => boolean;
};
```

### useDebounce(source, delay)

Create a debounced signal that updates after `delay` ms of inactivity.

```ts
function useDebounce<T>(source: () => T, delay: number): () => T;
```

### useThrottle(source, interval)

Create a throttled signal that updates at most once per `interval` ms.

```ts
function useThrottle<T>(source: () => T, interval: number): () => T;
```

### useCounter(initial?)

Reactive counter with convenience methods.

```ts
function useCounter(initial?: number): {
  count: () => number;
  increment(): void;
  decrement(): void;
  set(value: number): void;
  reset(): void;
};
```

### useToggle(initial?)

Reactive boolean toggle.

```ts
function useToggle(initial?: boolean): {
  value: () => boolean;
  toggle(): void;
  setTrue(): void;
  setFalse(): void;
};
```

### usePrevious(source)

Track the previous value of a reactive source.

```ts
function usePrevious<T>(source: () => T): () => T | undefined;
```

## Browser APIs

### useMediaQuery(query)

Reactive media query match.

```ts
function useMediaQuery(query: string): () => boolean;
```

### useBreakpoint(breakpoints?)

Reactive viewport breakpoint. Uses sensible defaults if no breakpoints provided.

```ts
function useBreakpoint(breakpoints?: Record<string, number>): {
  current: () => string;
  matches: (bp: string) => boolean;
};
```

### useStorage(key, initial, storage?)

Two-way binding to `localStorage` or `sessionStorage`.

```ts
function useStorage<T>(
  key: string,
  initial: T,
  storage?: Storage,
): Signal<T>;
```

### useClipboard()

Read and write the system clipboard.

```ts
function useClipboard(): {
  text: () => string;
  copied: () => boolean;
  copy(value: string): Promise<void>;
};
```

### useOnline()

Reactive network status.

```ts
function useOnline(): () => boolean;
```

### useGeolocation()

Reactive geolocation.

```ts
function useGeolocation(): {
  coords: () => GeolocationCoordinates | null;
  error: () => GeolocationPositionError | null;
  loading: () => boolean;
};
```

### useWindowSize()

Reactive window dimensions.

```ts
function useWindowSize(): {
  width: () => number;
  height: () => number;
};
```

### useClickOutside(target, handler, options?)

Detect clicks outside an element. Returns a dispose function.

```ts
function useClickOutside(
  target: HTMLElement | (() => HTMLElement | null),
  handler: (event: Event) => void,
  options?: {
    events?: string[];           // default: ['pointerdown']
    ignore?: (string | HTMLElement)[];  // selectors/elements to ignore
    active?: boolean;            // default: true
  },
): () => void;
```

## Portal

### Portal

Render children into a different DOM target.

```ts
function Portal(props: {
  target: string | HTMLElement;
  children: () => AkashNode;
}): Node;
```

`target` can be a CSS selector string or an element reference.

## Toast

### createToaster(options?)

Create a toast notification system.

```ts
function createToaster(options?: {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  duration?: number;
  max?: number;
}): Toaster;

interface Toaster {
  success(message: string): string;
  error(message: string): string;
  info(message: string): string;
  warning(message: string): string;
  dismiss(id: string): void;
  dismissAll(): void;
}
```

Each method (except dismiss/dismissAll) returns a toast ID.

## Theme

### useTheme(config?)

Reactive theme management. Persists selection to storage.

```ts
function useTheme(config?: {
  themes?: string[];
  defaultTheme?: string;
  storageKey?: string;
}): {
  current: () => string;
  set(theme: string): void;
  toggle(): void;
  isDark: () => boolean;
  themes: string[];
};
```

## Virtual List

### VirtualFor

Virtualized list component for rendering large datasets efficiently.

```ts
function VirtualFor<T>(props: {
  each: T[];
  key: (item: T) => unknown;
  itemHeight: number;
  overscan?: number;
  children: (item: T, index: number) => AkashNode;
}): Node;
```

### calculateRange(scrollTop, viewportHeight, itemHeight, total, overscan?)

Calculate the visible index range for virtual scrolling.

```ts
function calculateRange(
  scrollTop: number,
  viewportHeight: number,
  itemHeight: number,
  total: number,
  overscan?: number,
): { start: number; end: number };
```

### useVirtualList(config)

Low-level composable for custom virtual list implementations.

```ts
function useVirtualList(config: {
  itemCount: () => number;
  itemHeight: number;
  overscan?: number;
}): {
  containerRef: Ref<HTMLElement>;
  visibleRange: () => { start: number; end: number };
  totalHeight: () => number;
  offsetY: () => number;
};
```

## Async Components

### defineAsyncComponent(loader | options)

Define a component that is loaded asynchronously.

```ts
function defineAsyncComponent<P>(
  loader: () => Promise<{ default: Component<P> }>,
): Component<P>;

function defineAsyncComponent<P>(options: {
  loader: () => Promise<{ default: Component<P> }>;
  loading?: Component;
  error?: Component<{ error: Error }>;
  delay?: number;
  timeout?: number;
}): Component<P>;
```

## Performance

### startProfiling() / stopProfiling()

Toggle runtime performance profiling.

```ts
function startProfiling(): void;
function stopProfiling(): ProfileData;
```

### measureSync(label, fn)

Measure synchronous execution time.

```ts
function measureSync<T>(label: string, fn: () => T): T;
```

### measureAsync(label, fn)

Measure asynchronous execution time.

```ts
function measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T>;
```

### createTimer()

Create a manual timer for custom measurements.

```ts
function createTimer(): {
  start(): void;
  stop(): number; // elapsed ms
  elapsed(): number;
};
```

### formatProfile(data)

Format profiling data into a human-readable string.

```ts
function formatProfile(data: ProfileData): string;
```

## Leak Detection

### enableLeakDetection()

Enable tracking of signal/effect allocations for leak detection.

```ts
function enableLeakDetection(): void;
```

### checkForLeaks()

Check for undisposed signals or effects. Returns detected leaks.

```ts
function checkForLeaks(): LeakReport;
```

### reportLeaks()

Print leak report to console. Returns the number of leaks found.

```ts
function reportLeaks(): number;
```

## Accessibility

### useFocusTrap(container, options?)

Trap keyboard focus within a container element. Useful for modals, dialogs, and drawers.

```ts
function useFocusTrap(
  container: Ref<HTMLElement> | HTMLElement,
  options?: FocusTrapOptions,
): { activate: () => void; deactivate: () => void; active: () => boolean };

interface FocusTrapOptions {
  initialFocus?: string | HTMLElement;
  returnFocus?: boolean;
  escapeDeactivates?: boolean;
  allowOutsideClick?: boolean;
  onDeactivate?: () => void;
}
```

### useAnnounce()

Create a live-region announcer for screen readers.

```ts
function useAnnounce(): (message: string, politeness?: AriaLive) => void;

type AriaLive = 'polite' | 'assertive' | 'off';
```

### useKeyboard()

Manage keyboard shortcuts with scoping and conflict resolution.

```ts
function useKeyboard(): KeyboardManager;

interface KeyboardManager {
  bind(key: string, handler: (e: KeyboardEvent) => void, options?: { scope?: string; preventDefault?: boolean }): () => void;
  enableScope(scope: string): void;
  disableScope(scope: string): void;
  getBindings(): Map<string, Function[]>;
  dispose(): void;
}
```

## Image

### Image

Optimized image component with lazy loading, placeholder support, and fallback handling.

```ts
function Image(props: ImageProps): Node;

interface ImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  srcset?: string;
  sizes?: string;
  placeholder?: 'blur' | 'empty';
  blurDataUrl?: string;
  class?: string;
  fallbackSrc?: string;
  onLoad?: () => void;
  onError?: (error: Event) => void;
}
```

## Infinite Scroll

### useInfiniteScroll(options)

Observe a sentinel element to trigger loading more items as the user scrolls.

```ts
function useInfiniteScroll(options: InfiniteScrollOptions): {
  sentinel: Ref<HTMLElement>;
  loading: () => boolean;
  done: () => boolean;
  reset: () => void;
  dispose: () => void;
};

interface InfiniteScrollOptions {
  onLoadMore: () => Promise<void>;
  hasMore: () => boolean;
  rootMargin?: string;
  threshold?: number;
}
```

## CSS Utilities

### cx(...inputs)

Merge class names, filtering out falsy values. Accepts strings, arrays, and objects.

```ts
function cx(...inputs: Array<string | false | null | undefined | Record<string, boolean>>): string;
```

### css(styles)

Convert a style object to a CSS string.

```ts
function css(styles: Record<string, string | number>): string;
```

### applyStyles(el, styles)

Apply a style object directly to an element.

```ts
function applyStyles(el: HTMLElement, styles: Record<string, string | number>): void;
```

## Dependency Injection

### defineProvider(config)

Define a provider with a factory and scope.

```ts
function defineProvider<T>(config: {
  factory: () => T;
  providedIn?: 'root' | 'component';
}): Provider<T>;
```

### createInjector(bindings, parent?)

Create an injector with explicit bindings. Optionally inherit from a parent injector.

```ts
function createInjector(
  bindings: Array<
    | { provide: Token<T>; useFactory: () => T }
    | { provide: Token<T>; useValue: T }
    | { provide: Token<T>; useExisting: Token<T> }
  >,
  parent?: Injector,
): Injector;
```

### injectProvider(token)

Resolve a provider from the nearest injector in the component tree.

```ts
function injectProvider<T>(token: Token<T>): T;
```

### clearProviders()

Clear all root-level provider instances. Useful for testing and SSR.

```ts
function clearProviders(): void;
```

## Animations

### animate(element, options)

Animate an element using the Web Animations API.

```ts
function animate(element: HTMLElement, options: {
  properties: Record<string, [string, string]> | Keyframe[];
  duration?: number;
  easing?: string;
  delay?: number;
  fill?: FillMode;
  iterations?: number;
  direction?: PlaybackDirection;
}): AnimationControl;
```

### animateStagger(elements, options)

Animate a list of elements with staggered delay.

```ts
function animateStagger(
  elements: NodeListOf<Element> | Element[],
  options: AnimateOptions & {
    stagger: number;
    from?: 'start' | 'center' | 'end';
  },
): Promise<void>;
```

### animateSequence(steps)

Run animations sequentially. Each step waits for the previous to finish.

```ts
function animateSequence(
  steps: Array<{ element: HTMLElement } & AnimateOptions>,
): Promise<void>;
```

### animateGroup(steps)

Run multiple animations in parallel, resolving when all complete.

```ts
function animateGroup(
  steps: Array<{ element: HTMLElement } & AnimateOptions>,
): Promise<void>;
```

### animateSpring(element, options)

Physics-based spring animation.

```ts
function animateSpring(element: HTMLElement, options: {
  properties: Record<string, [string, string]>;
  stiffness?: number;
  damping?: number;
  mass?: number;
}): AnimationControl;
```

### keyframes(frames)

Create a multi-step keyframe array for use with `animate()`.

```ts
function keyframes(
  frames: Array<{ offset: number } & Record<string, string | number>>,
): Keyframe[];
```

### defineStates(element, config)

Create a state-based animation machine.

```ts
function defineStates(element: HTMLElement, config: {
  states: Record<string, Record<string, string | number>>;
  transitions: {
    duration: number;
    easing?: string;
    overrides?: Record<string, { duration?: number; easing?: string }>;
  };
  initial: string;
}): {
  go(state: string): Promise<void>;
  current(): string;
  onTransition(cb: (from: string, to: string) => void): () => void;
};
```

## Defer

### defer(loader, options)

Defer loading of a component until a trigger condition is met.

```ts
function defer<T>(
  loader: () => Promise<{ default: T }>,
  options: DeferOptions,
): T;

interface DeferOptions {
  trigger: DeferTrigger;
  loading?: () => AkashNode;
  error?: (err: Error) => AkashNode;
  prefetch?: boolean;
  minimumLoadTime?: number;
}

type DeferTrigger =
  | 'viewport'
  | 'interaction'
  | 'idle'
  | 'hover'
  | { type: 'viewport'; rootMargin?: string; threshold?: number }
  | { type: 'interaction'; events?: string[] }
  | { type: 'timer'; delay: number }
  | { type: 'custom'; when: () => boolean };
```

## View Transitions

### startViewTransition(callback, options?)

Start a view transition. Falls back gracefully when the API is unsupported.

```ts
function startViewTransition(
  callback: () => void | Promise<void>,
  options?: {
    fallback?: 'none' | 'fade';
    duration?: number;
    onStart?: () => void;
    onFinish?: () => void;
  },
): Promise<void>;
```

### supportsViewTransitions()

Check whether the browser supports the View Transitions API.

```ts
function supportsViewTransitions(): boolean;
```

### viewTransitionCSS(config)

Generate CSS rules for view transition pseudo-elements.

```ts
function viewTransitionCSS(config: {
  name?: string;
  old: Record<string, string>;
  new: Record<string, string>;
}): string;
```

### assignTransitionName(element, name)

Assign a `view-transition-name` CSS property to an element.

```ts
function assignTransitionName(element: HTMLElement, name: string): void;
```

## Data Table

### createDataTable(options)

Create a reactive data table with sorting, filtering, column visibility, and pagination.

```ts
function createDataTable<T>(options: {
  data: () => T[];
  columns: ColumnDef<T>[];
  pageSize?: number;
}): {
  rows: () => T[];
  columns: () => ColumnDef<T>[];
  sortState: () => SortState;
  page: () => number;
  pageCount: () => number;
  sort(columnId: string): void;
  filter(columnId: string, value: string): void;
  toggleColumn(columnId: string): void;
  nextPage(): void;
  prevPage(): void;
  goToPage(page: number): void;
  reset(): void;
};

interface ColumnDef<T> {
  id: string;
  header: string;
  accessor: (row: T) => unknown;
  sortable?: boolean;
  filterable?: boolean;
  visible?: boolean;
}

interface SortState {
  columnId: string | null;
  direction: 'asc' | 'desc';
}
```

## SEO

### useSEO(config)

Set common SEO meta tags reactively (title, description, canonical, robots).

```ts
function useSEO(config: {
  title?: string | (() => string);
  description?: string | (() => string);
  canonical?: string;
  robots?: string;
}): void;
```

### useStructuredData(data)

Inject JSON-LD structured data into the document head.

```ts
function useStructuredData(data: Record<string, unknown>): void;
```

### useOpenGraph(data)

Set Open Graph meta tags.

```ts
function useOpenGraph(data: {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  siteName?: string;
}): void;
```

### useTwitterCard(data)

Set Twitter Card meta tags.

```ts
function useTwitterCard(data: {
  card?: 'summary' | 'summary_large_image' | 'app' | 'player';
  site?: string;
  creator?: string;
  title?: string;
  description?: string;
  image?: string;
}): void;
```

### generateSitemap(baseUrl, entries)

Generate a sitemap XML string from a list of URL entries.

```ts
function generateSitemap(
  baseUrl: string,
  entries: Array<{
    path: string;
    lastmod?: string;
    changefreq?: string;
    priority?: number;
  }>,
): string;
```

## Watchers

### watch(source, callback, options?)

Watch a reactive source and invoke a callback with the new and previous values whenever it changes.

```ts
function watch<T>(
  source: WatchSource<T>,
  callback: WatchCallback<T>,
  options?: WatchOptions,
): () => void;

// Multiple sources:
function watch<T extends unknown[]>(
  sources: { [K in keyof T]: WatchSource<T[K]> },
  callback: (newValues: T, oldValues: (T[number] | undefined)[]) => void,
  options?: WatchOptions,
): () => void;

type WatchSource<T> = () => T;
type WatchCallback<T> = (newValue: T, oldValue: T | undefined) => void;
```

**Returns:** a dispose function.

#### WatchOptions

| Option | Type | Default | Description |
|---|---|---|---|
| `immediate` | `boolean` | `false` | Run callback immediately with the current value |
| `once` | `boolean` | `false` | Fire once then auto-dispose |
| `debounce` | `number` | `undefined` | Debounce the callback in ms |
| `deep` | `boolean` | `false` | Deep comparison for objects |

### watchOnce(source, callback)

Convenience wrapper — watches a source once with `immediate: true`, then auto-disposes.

```ts
function watchOnce<T>(
  source: WatchSource<T>,
  callback: WatchCallback<T>,
): () => void;
```

### watchDebounced(source, callback, ms)

Convenience wrapper — watches with built-in debounce.

```ts
function watchDebounced<T>(
  source: WatchSource<T>,
  callback: WatchCallback<T>,
  ms: number,
): () => void;
```

## Deep Signals

### deepSignal(initialValue)

Create a deeply reactive signal. Nested property access is tracked, and setting any nested property triggers updates.

```ts
function deepSignal<T extends object>(initialValue: T): DeepSignal<T>;

type DeepSignal<T> = T extends object
  ? { [K in keyof T]: DeepSignal<T[K]> } & { readonly $raw: T; readonly $signal: () => T }
  : T;
```

The returned proxy supports reading, writing, and deleting nested properties — all reactive. Use `$raw` to get a plain snapshot and `$signal` to read the whole object as a tracked signal.

### toRaw(proxy)

Get the raw (unwrapped) value from a deep signal.

```ts
function toRaw<T>(proxy: DeepSignal<T>): T;
```

### isDeepSignal(value)

Check whether a value is a deep signal proxy.

```ts
function isDeepSignal(value: unknown): boolean;
```

## State Machine

### createMachine(config)

Create a finite state machine with typed states, events, guards, actions, and reactive current state.

```ts
function createMachine<
  TState extends string,
  TEvent extends string,
  TContext = unknown,
>(config: MachineConfig<TState, TEvent, TContext>): Machine<TState, TEvent, TContext>;
```

#### MachineConfig

```ts
interface MachineConfig<TState extends string, TEvent extends string, TContext = unknown> {
  initial: TState;
  context?: TContext;
  states: Record<TState, StateConfig<TState, TEvent, TContext>>;
}
```

#### StateConfig

```ts
interface StateConfig<TState extends string, TEvent extends string, TContext = unknown> {
  on?: Partial<Record<TEvent, TState | TransitionConfig<TState, TEvent, TContext>>>;
  entry?: (ctx: MachineContext<TContext>) => void;
  exit?: (ctx: MachineContext<TContext>) => void;
  type?: 'final';
}
```

#### TransitionConfig (guards and actions)

```ts
interface TransitionConfig<TState extends string, TEvent extends string, TContext = unknown> {
  target: TState;
  guard?: (ctx: MachineContext<TContext>) => boolean;
  action?: (ctx: MachineContext<TContext>) => void;
}
```

#### MachineContext

```ts
interface MachineContext<TContext> {
  data: TContext;
  event: string;
}
```

#### Machine

```ts
interface Machine<TState extends string, TEvent extends string, TContext = unknown> {
  state: ReadonlySignal<TState>;
  context: ReadonlySignal<TContext>;
  send(event: TEvent, payload?: Record<string, unknown>): void;
  matches(state: TState): boolean;
  done: ReadonlySignal<boolean>;
  reset(): void;
  history: ReadonlySignal<TState[]>;
  can(event: TEvent): boolean;
  nextEvents: ReadonlySignal<TEvent[]>;
}
```

## Event Bus

### createEventBus()

Create a typed event bus for cross-component pub/sub communication.

```ts
function createEventBus<T extends EventMap = Record<string, unknown>>(): EventBus<T>;

type EventMap = Record<string, unknown>;
type EventHandler<T = unknown> = (data: T) => void;

interface EventBus<T extends EventMap> {
  on<K extends keyof T & string>(event: K, handler: EventHandler<T[K]>): () => void;
  once<K extends keyof T & string>(event: K, handler: EventHandler<T[K]>): () => void;
  emit<K extends keyof T & string>(event: K, data: T[K]): void;
  off<K extends keyof T & string>(event: K, handler: EventHandler<T[K]>): void;
  clear(event?: keyof T & string): void;
  listenerCount(event: keyof T & string): number;
  hasListeners(event: keyof T & string): boolean;
}
```

### globalEventBus()

Get (or create) the global event bus singleton. Useful for app-wide events without passing a bus instance around.

```ts
function globalEventBus<T extends EventMap = Record<string, unknown>>(): EventBus<T>;
```

## Tweened Signals

### tweened(initialValue, options?)

Create a signal that smoothly animates between values over time.

```ts
function tweened<T>(initialValue: T, options?: TweenedOptions<T>): TweenedSignal<T>;

interface TweenedOptions<T> {
  duration?: number;       // ms, default 400
  easing?: EasingFn;       // default cubicOut
  interpolate?: Interpolator<T>;
  delay?: number;
}

interface TweenedSignal<T> {
  (): T;                                         // read current (animated) value
  set(value: T, opts?: Partial<TweenedOptions<T>>): Promise<void>;  // animate to new value
  setImmediate(value: T): void;                  // jump without animation
  target: () => T;                               // current target value
}

type EasingFn = (t: number) => number;
type Interpolator<T> = (from: T, to: T, t: number) => T;
```

### easings

Built-in easing functions: `linear`, `cubicIn`, `cubicOut`, `cubicInOut`, `quadIn`, `quadOut`, `quintOut`, `bounceOut`, `elasticOut`.

```ts
import { easings } from '@akashjs/runtime';

const x = tweened(0, { easing: easings.bounceOut });
```

## FLIP Animations

### createFlip(container, options?)

Create a FLIP animation controller for smooth list reordering.

```ts
function createFlip(container: HTMLElement, options?: FlipOptions): FlipController;

interface FlipOptions {
  duration?: number;        // default 300
  easing?: string;          // CSS easing, default 'cubic-bezier(0.2, 0, 0, 1)'
  delay?: number;
  selector?: string;        // only animate matching children
  keyAttribute?: string;    // default 'data-key'
  onComplete?: () => void;
}

interface FlipController {
  measure(): void;                       // call BEFORE DOM change
  animate(): Promise<void>;              // call AFTER DOM change
  flip(update: () => void): Promise<void>; // measure + update + animate in one step
}
```

### flip(container, update, options?)

One-shot helper that creates a controller, measures, runs the update, and animates.

```ts
function flip(
  container: HTMLElement,
  update: () => void,
  options?: FlipOptions,
): Promise<void>;
```

## Await

### Await

Component for declarative promise handling — renders different content for pending, resolved, and rejected states.

```ts
function Await<T>(props: AwaitProps<T>): Node;

interface AwaitProps<T> {
  promise: Promise<T>;
  pending?: () => AkashNode;
  then: (value: T) => AkashNode;
  catch?: (error: Error) => AkashNode;
}
```

### awaitSignal(promise)

Functional helper that wraps a promise into a reactive signal tracking its state.

```ts
function awaitSignal<T>(
  promise: Promise<T>,
): () => { status: 'pending' } | { status: 'resolved'; value: T } | { status: 'rejected'; error: Error };
```

## Event Modifiers and Bind Directives

### withModifiers(handler, modifiers)

Wrap an event handler with modifiers (preventDefault, stopPropagation, once, self, capture, passive).

```ts
function withModifiers<E extends Event>(
  handler: (e: E) => void,
  modifiers: EventModifiers,
): (e: E) => void;

interface EventModifiers {
  preventDefault?: boolean;
  stopPropagation?: boolean;
  stopImmediatePropagation?: boolean;
  once?: boolean;
  capture?: boolean;
  passive?: boolean;
  self?: boolean;
}
```

### onEvent(el, event, handler, modifiers?)

Attach an event handler with modifiers to an element. Returns a dispose function.

```ts
function onEvent<K extends keyof HTMLElementEventMap>(
  el: HTMLElement,
  event: K,
  handler: (e: HTMLElementEventMap[K]) => void,
  modifiers?: EventModifiers,
): () => void;
```

### bindDimensions(el)

Bind element dimensions (clientWidth/clientHeight) to reactive read-only signals using ResizeObserver.

```ts
function bindDimensions(el: HTMLElement): {
  width: ReadonlySignal<number>;
  height: ReadonlySignal<number>;
};
```

### bindScroll(el?)

Bind scroll position to read/write signals. Omit `el` to bind to the window.

```ts
function bindScroll(el?: HTMLElement): {
  scrollX: Signal<number>;
  scrollY: Signal<number>;
};
```

### bindElement()

Create a signal that holds an element reference (like `bind:this` in Svelte).

```ts
function bindElement<T extends HTMLElement = HTMLElement>(): Signal<T | null>;
```

### bindGroup(name)

Create a signal for a radio/checkbox group.

```ts
function bindGroup<T>(name: string): Signal<T | null>;
```

### bindGroupItem(el, group, value)

Bind an individual radio/checkbox input to a group signal.

```ts
function bindGroupItem<T>(el: HTMLInputElement, group: Signal<T | null>, value: T): void;
```

### bindClass(el, className, condition)

Reactively toggle a CSS class based on a condition.

```ts
function bindClass(el: HTMLElement, className: string, condition: () => boolean): () => void;
```

### bindClasses(el, classes)

Apply multiple conditional CSS classes at once.

```ts
function bindClasses(el: HTMLElement, classes: Record<string, () => boolean>): () => void;
```

### bindStyle(el, property, value)

Reactively bind a single CSS property.

```ts
function bindStyle(el: HTMLElement, property: string, value: () => string | number | null): () => void;
```

### bindStyles(el, styles)

Bind multiple CSS properties at once.

```ts
function bindStyles(el: HTMLElement, styles: Record<string, () => string | number | null>): () => void;
```

## Snippets and Utilities

### defineSnippet(render)

Define a reusable template snippet (a function that returns a renderable node).

```ts
function defineSnippet<TArgs extends unknown[]>(
  render: (...args: TArgs) => AkashNode,
): Snippet<TArgs>;

type Snippet<TArgs extends unknown[] = []> = (...args: TArgs) => AkashNode;
```

### inspect(...sources, options?)

Debug helper that logs reactive values whenever they change.

```ts
function inspect(
  ...args: [...Array<() => unknown>, InspectOptions?]
): () => void;

interface InspectOptions {
  label?: string;              // prefix (default: 'inspect')
  level?: 'log' | 'warn' | 'debug' | 'trace';
  logger?: (label: string, ...values: unknown[]) => void;
  when?: () => boolean;        // only log when condition is true
}
```

### defineFormAction(url, options?)

Define a server-side form action with progressive enhancement.

```ts
function defineFormAction<T = unknown>(
  url: string,
  options?: {
    method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    headers?: Record<string, string>;
    onSuccess?: (result: T) => void;
    onError?: (error: Error) => void;
    fetch?: typeof globalThis.fetch;
  },
): FormAction<T>;

interface FormAction<T = unknown> {
  url: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  submitting: ReadonlySignal<boolean>;
  result: ReadonlySignal<T | null>;
  error: ReadonlySignal<Error | null>;
  handle(formData?: Record<string, unknown>): (e: Event) => void;
  submit(data: Record<string, unknown>): Promise<T>;
}
```

### enableSnapshots(config?)

Enable navigation snapshots — preserves scroll position and form state across back/forward navigation.

```ts
function enableSnapshots(config?: SnapshotConfig): () => void;

interface SnapshotConfig {
  keyPrefix?: string;                      // default 'akash-snapshot'
  capture?: ('scroll' | 'forms')[];        // default ['scroll', 'forms']
}
```

## Query State

### useQueryState(key, defaultValue, options?)

Create a signal that automatically syncs to a URL query parameter. Changes update the URL; browser back/forward updates the signal.

```ts
function useQueryState<T>(
  key: string,
  defaultValue: T,
  options?: QueryStateOptions<T>,
): Signal<T>;

interface QueryStateOptions<T> {
  serialize?: (value: T) => string;
  deserialize?: (raw: string) => T;
  history?: 'push' | 'replace';   // default 'replace'
  debounce?: number;               // ms, default 0
  removeDefault?: boolean;         // default true
}
```

### useQueryStates(schema, options?)

Create multiple URL-synced signals at once.

```ts
function useQueryStates<T extends QueryStateSchema>(
  schema: T,
  options?: { history?: 'push' | 'replace' },
): { [K in keyof T]: Signal<T[K]['default']> };
```

### clearQueryState()

Remove all query state params from the URL and reset signals to defaults.

```ts
function clearQueryState(): void;
```

### getQueryParams()

Get all current query params as a plain `Record<string, string>`.

```ts
function getQueryParams(): Record<string, string>;
```
