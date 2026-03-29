/**
 * Core router engine.
 *
 * Path matching, route resolution, guard/loader execution,
 * and the createRouter() factory.
 */

import { signal, computed, effect, createContext, provide, inject } from '@akashjs/runtime';
import type { Signal, ReadonlySignal, InjectionKey } from '@akashjs/runtime';
import { createHistory, buildUrl, parseQuery, parseHash } from './history.js';
import type { HistoryManager } from './history.js';
import type {
  RouteConfig,
  RouteMatch,
  ResolvedRoute,
  Router,
  NavigateFn,
  NavigateOptions,
  GuardContext,
  NavigationResult,
  RouteInfo,
} from './types.js';

// --- Path matching ---

interface CompiledRoute {
  config: RouteConfig;
  regex: RegExp;
  paramNames: string[];
}

/**
 * Compile a path pattern into a regex for matching.
 *
 * Supports:
 * - Static segments: /about
 * - Dynamic params: /blog/:slug
 * - Catch-all: /[...rest] or /*rest
 */
export function compilePath(path: string): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];

  // Normalize: ensure leading slash, remove trailing slash (except root)
  let normalized = path.startsWith('/') ? path : '/' + path;
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  const segments = normalized.split('/').filter(Boolean);
  let pattern = '';

  for (const segment of segments) {
    // Catch-all: [...param]
    if (segment.startsWith('[...') && segment.endsWith(']')) {
      const name = segment.slice(4, -1);
      paramNames.push(name);
      pattern += '/(.+)';
      continue;
    }

    // Dynamic param: [param] or :param
    if (segment.startsWith('[') && segment.endsWith(']')) {
      const name = segment.slice(1, -1);
      paramNames.push(name);
      pattern += '/([^/]+)';
      continue;
    }
    if (segment.startsWith(':')) {
      paramNames.push(segment.slice(1));
      pattern += '/([^/]+)';
      continue;
    }

    // Static segment
    pattern += '/' + escapeRegex(segment);
  }

  // Root path
  if (pattern === '') pattern = '/';

  const regex = new RegExp('^' + pattern + '$');
  return { regex, paramNames };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Match a pathname against a route config.
 */
export function matchPath(
  pathname: string,
  path: string,
): { params: Record<string, string> } | null {
  const { regex, paramNames } = compilePath(path);
  const match = pathname.match(regex);

  if (!match) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < paramNames.length; i++) {
    params[paramNames[i]] = decodeURIComponent(match[i + 1]);
  }

  return { params };
}

/**
 * Resolve a path pattern by filling in parameter values.
 */
export function resolvePath(pattern: string, params: Record<string, string>): string {
  let result = pattern;

  // Replace [...param] catch-all
  result = result.replace(/\[\.\.\.(\w+)\]/g, (_, name) => {
    return params[name] ?? '';
  });

  // Replace [param] brackets
  result = result.replace(/\[(\w+)\]/g, (_, name) => {
    return encodeURIComponent(params[name] ?? '');
  });

  // Replace :param
  result = result.replace(/:(\w+)/g, (_, name) => {
    return encodeURIComponent(params[name] ?? '');
  });

  return result;
}

// --- Route resolution ---

/**
 * Find the best matching route for a pathname.
 * Returns the chain of matches (for nested layouts).
 */
export function resolveRoutes(
  routes: RouteConfig[],
  pathname: string,
): RouteMatch[] | null {
  for (const route of routes) {
    const result = matchPath(pathname, route.path);
    if (result) {
      return [{ route, params: result.params, path: route.path }];
    }

    // Try children with prefix matching
    if (route.children) {
      const childMatches = resolveRoutes(route.children, pathname);
      if (childMatches) {
        return [
          { route, params: {}, path: route.path },
          ...childMatches,
        ];
      }
    }
  }

  return null;
}

// --- Guard execution ---

function createRedirect(path: string): NavigationResult {
  return { _type: 'redirect', path };
}

async function runGuards(matches: RouteMatch[]): Promise<NavigationResult | null> {
  for (const match of matches) {
    if (!match.route.guard) continue;

    const guardModule = await match.route.guard();
    const ctx: GuardContext = {
      params: match.params,
      redirect: createRedirect,
    };

    const result = await guardModule.guard(ctx);
    if (result && result._type === 'redirect') {
      return result;
    }
  }
  return null;
}

// --- Loader execution ---

async function runLoaders(matches: RouteMatch[]): Promise<Map<string, unknown>> {
  const data = new Map<string, unknown>();

  // Run all loaders in parallel
  const loaderPromises = matches
    .filter((m) => m.route.loader)
    .map(async (match) => {
      const loaderModule = await match.route.loader!();
      const result = await loaderModule.loader({
        params: match.params,
        fetch: globalThis.fetch.bind(globalThis),
      });
      data.set(match.route.path, result);
    });

  await Promise.all(loaderPromises);
  return data;
}

// --- Router context ---

const RouterContext = createContext<RouterInternal>();

interface RouterInternal {
  route: () => ResolvedRoute | null;
  navigate: NavigateFn;
  loaderData: () => Map<string, unknown>;
  /** Index into the matches array for the current Outlet depth */
  depth: Signal<number>;
}

/** @internal — provide router context in the component tree */
export function provideRouter(router: RouterInternal): void {
  provide(RouterContext, router);
}

/** @internal — consume router context */
export function useRouterInternal(): RouterInternal {
  return inject(RouterContext);
}

// --- Public hooks ---

/**
 * Get reactive route information (path, params, query, hash).
 * Must be called inside a component within a <RouterOutlet>.
 */
export function useRoute(): RouteInfo {
  const ctx = useRouterInternal();
  return {
    path: () => ctx.route()?.path ?? '/',
    params: () => ctx.route()?.params ?? {},
    query: () => ctx.route()?.query ?? {},
    hash: () => ctx.route()?.hash ?? '',
  };
}

/**
 * Get the current route params as a reactive signal.
 */
export function useParams(): () => Record<string, string> {
  const ctx = useRouterInternal();
  return () => ctx.route()?.params ?? {};
}

/**
 * Get loader data for the current route segment.
 */
export function useLoaderData<T = unknown>(): () => T | undefined {
  const ctx = useRouterInternal();
  return () => {
    const resolved = ctx.route();
    const depth = ctx.depth();
    if (!resolved || !resolved.matches[depth]) return undefined;
    const match = resolved.matches[depth];
    return ctx.loaderData().get(match.route.path) as T | undefined;
  };
}

/**
 * Get the navigate function.
 */
export function useNavigate(): NavigateFn {
  const ctx = useRouterInternal();
  return ctx.navigate;
}

// --- createRouter ---

export function createRouter(routes: RouteConfig[]): Router {
  const history = createHistory();
  const resolvedRoute = signal<ResolvedRoute | null>(null);
  const loaderData = signal<Map<string, unknown>>(new Map());
  const isNavigating = signal(false);

  async function performNavigation(pathname: string, search: string, hash: string): Promise<void> {
    const matches = resolveRoutes(routes, pathname);

    if (!matches) {
      resolvedRoute.set(null);
      loaderData.set(new Map());
      return;
    }

    // Merge params from all matches
    const params: Record<string, string> = {};
    for (const match of matches) {
      Object.assign(params, match.params);
    }

    // Run guards
    const guardResult = await runGuards(matches);
    if (guardResult) {
      // Redirect — navigate to the new path instead
      await navigate(guardResult.path);
      return;
    }

    // Run loaders
    const data = await runLoaders(matches);
    loaderData.set(data);

    // Set resolved route
    resolvedRoute.set({
      matches,
      params,
      query: parseQuery(search),
      hash: parseHash(hash),
      path: pathname,
    });
  }

  // React to history changes
  const disposeEffect = effect(() => {
    const loc = history.location();
    isNavigating.set(true);
    performNavigation(loc.pathname, loc.search, loc.hash).finally(() => {
      isNavigating.set(false);
    });
  });

  // Navigate function
  const navigate: NavigateFn = ((
    pathOrDelta: string | number,
    options?: NavigateOptions,
  ): any => {
    if (typeof pathOrDelta === 'number') {
      history.go(pathOrDelta);
      return;
    }

    let pathname = pathOrDelta;

    // Fill in params if the path has placeholders
    if (options?.params) {
      pathname = resolvePath(pathname, options.params);
    }

    const url = buildUrl(pathname, options?.query, options?.hash);

    if (options?.replace) {
      history.replace(url);
    } else {
      history.push(url);
    }

    return performNavigation(
      pathname,
      options?.query ? '?' + new URLSearchParams(options.query).toString() : '',
      options?.hash ? '#' + options.hash : '',
    );
  }) as NavigateFn;

  // Provide router context so Outlet and use* hooks can inject it
  const depth = signal(0);
  provideRouter({ route: () => resolvedRoute(), navigate, loaderData: () => loaderData(), depth });

  return {
    navigate,
    route: () => resolvedRoute(),
    dispose() {
      disposeEffect();
      history.dispose();
    },
  };
}
