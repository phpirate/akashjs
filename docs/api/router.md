# @akashjs/router API

## createRouter(routes)

Create a router instance.

```ts
function createRouter(routes: RouteConfig[]): Router;

interface Router {
  navigate: NavigateFn;
  route: () => ResolvedRoute | null;
  dispose: () => void;
}
```

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
