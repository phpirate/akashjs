# @akashjs/router API

## createRouter(routes, options?)

Create a router instance with automatic scroll restoration.

```ts
function createRouter(routes: RouteConfig[], options?: RouterOptions): Router;

interface RouterOptions {
  /** Enable automatic scroll restoration (default: true) */
  scrollRestoration?: boolean;
}

interface Router {
  navigate: NavigateFn;
  route: () => ResolvedRoute | null;
  dispose: () => void;
}
```

Scroll restoration is enabled by default:
- **Forward navigation** scrolls to top (or to `#hash` element)
- **Back/Forward** restores the saved scroll position
- **Query-only changes** preserve scroll position
- Opt out globally with `{ scrollRestoration: false }`
- Opt out per navigation with `navigate('/path', { scroll: false })`

## Hooks

### useRoute()

Get reactive route information. Must be called inside a component within a router.

```ts
function useRoute(): RouteInfo;

interface RouteInfo {
  path: () => string;
  params: () => Record<string, string>;
  query: () => Record<string, string>;
  hash: () => string;
}
```

### useParams()

Shorthand for reactive route params.

```ts
function useParams(): () => Record<string, string>;
```

### useNavigate()

Get the navigate function.

```ts
function useNavigate(): NavigateFn;
```

### useSearchParams()

Reactive read/write access to URL query parameters.

```ts
function useSearchParams(): [
  () => Record<string, string>,
  (params: Record<string, string | null | undefined>, options?: SetSearchParamsOptions) => void,
];

interface SetSearchParamsOptions {
  /** Replace all params instead of merging (default: false) */
  replace?: boolean;
  /** Push a new history entry instead of replacing (default: false) */
  push?: boolean;
}
```

```ts
const [searchParams, setSearchParams] = useSearchParams();

// Read (reactive)
const page = searchParams().page;

// Write — merges with existing params, uses replaceState by default
setSearchParams({ page: '2' });

// Remove a param
setSearchParams({ page: null });

// Replace ALL params
setSearchParams({ q: 'hello' }, { replace: true });

// Push to history (new back button entry)
setSearchParams({ page: '3' }, { push: true });
```

### useLoaderData()

Get loader data for the current route segment.

```ts
function useLoaderData<T>(): () => T | undefined;
```

## Components

### Link

Declarative navigation component.

```ts
interface LinkProps {
  to: string;
  params?: Record<string, string>;
  query?: Record<string, string>;
  hash?: string;
  replace?: boolean;
  class?: string;
}
```

### Outlet

Renders the matched route component. Used in layout components.

## Guards

### composeGuards(...guards)

Compose multiple guards. First redirect wins.

```ts
function composeGuards(...guards: RouteGuard[]): RouteGuard;
```

### guardWith(check, redirectTo)

Create a guard from a boolean check.

```ts
function guardWith(
  check: (ctx: GuardContext) => Promise<boolean> | boolean,
  redirectTo: string,
): RouteGuard;
```

## Navigation Events

### onBeforeNavigate(callback)

Register a callback that fires before navigation starts (before guards/loaders). Observational only — cannot block navigation. Auto-cleans up on component unmount.

```ts
function onBeforeNavigate(cb: NavigationEventCallback): () => void;
```

### onAfterNavigate(callback)

Register a callback that fires after navigation completes and DOM updates. Auto-cleans up on component unmount.

```ts
function onAfterNavigate(cb: NavigationEventCallback): () => void;
```

### NavigationEvent

```ts
interface NavigationEvent {
  from: NavigationLocation;
  to: NavigationLocation;
  type: 'push' | 'replace' | 'pop';
}

interface NavigationLocation {
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  hash: string;
}
```

```ts
import { onBeforeNavigate, onAfterNavigate } from '@akashjs/router';

// Cancel in-flight requests when leaving a page
onBeforeNavigate(() => {
  abortController.abort();
});

// Analytics + scroll to top on page changes
onAfterNavigate((event) => {
  analytics.trackPageView(event.to.path);
  if (event.from.path !== event.to.path) {
    window.scrollTo(0, 0);
  }
});
```

## Types

### RouteConfig

```ts
interface RouteConfig {
  path: string;
  component: () => Promise<{ default: Component<any> }>;
  layout?: () => Promise<{ default: Component<any> }>;
  guard?: () => Promise<{ guard: RouteGuard }>;
  loader?: () => Promise<{ loader: RouteLoader<any> }>;
  children?: RouteConfig[];
}
```

### RouteGuard

```ts
type RouteGuard = (ctx: GuardContext) => Promise<NavigationResult | void> | void;
```

### RouteLoader

```ts
type RouteLoader<P> = (ctx: LoaderContext<P>) => Promise<unknown>;
```

## Middleware

### defineMiddleware(fn)

Define a route middleware function.

```ts
function defineMiddleware(
  fn: (ctx: MiddlewareContext, next: () => Promise<void>) => Promise<void>,
): Middleware;
```

### runMiddleware(middlewares, ctx)

Execute an array of middleware in order.

```ts
function runMiddleware(middlewares: Middleware[], ctx: MiddlewareContext): Promise<void>;
```

### composeMiddleware(...fns)

Compose multiple middleware functions into a single middleware.

```ts
function composeMiddleware(...fns: Middleware[]): Middleware;
```

## Route Transitions

### canDeactivate(options)

Create a guard that prevents navigation when there are unsaved changes. Also registers a `beforeunload` handler for tab close / external navigation.

```ts
function canDeactivate(options: CanDeactivateOptions): RouteGuard;

interface CanDeactivateOptions {
  /** Return true to allow navigation */
  canLeave: () => boolean | Promise<boolean>;
  /** Confirmation message (default: 'You have unsaved changes...') */
  message?: string;
  /** Use browser's native confirm dialog (default: true) */
  useNativeConfirm?: boolean;
}
```

The returned guard also exposes a `.dispose()` method to remove the `beforeunload` listener.

### getRouteTransitionClasses(name?)

Return the enter/exit CSS class names for a route transition.

```ts
function getRouteTransitionClasses(name?: string): {
  enterFrom: string;
  enterActive: string;
  enterTo: string;
  exitFrom: string;
  exitActive: string;
  exitTo: string;
};
```

Default `name` is `'route'`, producing classes like `route-enter-from`, `route-exit-active`, etc.

### generateRouteTransitionCSS(name?, type?)

Generate CSS rules for common route transition types.

```ts
function generateRouteTransitionCSS(
  name?: string,   // default 'route'
  type?: 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'scale', // default 'fade'
): string;
```

## History Helpers

### createHistory()

Create a reactive history manager wrapping the browser History API.

```ts
function createHistory(): HistoryManager;

interface HistoryManager {
  location: Signal<HistoryLocation>;
  push(url: string): void;
  replace(url: string): void;
  go(delta: number): void;
  dispose(): void;
}

interface HistoryLocation {
  pathname: string;
  search: string;
  hash: string;
}
```

### buildUrl(pathname, query?, hash?)

Construct a URL string from parts.

```ts
function buildUrl(
  pathname: string,
  query?: Record<string, string>,
  hash?: string,
): string;
```

### parseQuery(search)

Parse a query string into a plain object.

```ts
function parseQuery(search: string): Record<string, string>;
```

### parseHash(hash)

Strip the leading `#` from a hash string.

```ts
function parseHash(hash: string): string;
```
