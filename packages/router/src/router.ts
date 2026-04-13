/**
 * Core router engine.
 *
 * Path matching, route resolution, guard/loader execution,
 * and the createRouter() factory.
 */

import { signal, computed, effect, createContext, provide, inject, onUnmount } from '@akashjs/runtime';
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
  NavigationEvent,
  NavigationEventCallback,
  NavigationLocation,
  RouterOptions,
  NavigationStateInfo,
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
    // Optional catch-all: [[...param]] — matches zero or more segments (including /)
    if (segment.startsWith('[[...') && segment.endsWith(']]')) {
      const name = segment.slice(5, -2);
      paramNames.push(name);
      pattern += '(?:/(.+))?/?';
      continue;
    }

    // Catch-all: [...param] — matches one or more segments
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
  // Strip query string and hash — only match against the path portion
  const cleanPathname = pathname.split('?')[0].split('#')[0];
  const { regex, paramNames } = compilePath(path);
  const match = cleanPathname.match(regex);

  if (!match) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < paramNames.length; i++) {
    const captured = match[i + 1];
    params[paramNames[i]] = captured ? decodeURIComponent(captured) : '';
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
    const value = params[name];
    if (value == null || value === '') {
      throw new Error(`[AkashJS] Missing required catch-all param: ${name} in pattern "${pattern}"`);
    }
    return value;
  });

  // Replace [param] brackets
  result = result.replace(/\[(\w+)\]/g, (_, name) => {
    const value = params[name];
    if (value == null || value === '') {
      throw new Error(`[AkashJS] Missing required param: ${name} in pattern "${pattern}"`);
    }
    return encodeURIComponent(value);
  });

  // Replace :param
  result = result.replace(/:(\w+)/g, (_, name) => {
    const value = params[name];
    if (value == null || value === '') {
      throw new Error(`[AkashJS] Missing required param: ${name} in pattern "${pattern}"`);
    }
    return encodeURIComponent(value);
  });

  return result;
}

// --- Route resolution ---

/**
 * Route specificity score: static > dynamic > catch-all.
 * Lower score = higher priority.
 */
function routeSpecificity(path: string): number {
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return 0; // root path

  let score = 0;
  for (const seg of segments) {
    if (seg.startsWith('[...') || seg.startsWith('*')) {
      score += 200; // catch-all — lowest priority
    } else if (seg.startsWith(':') || (seg.startsWith('[') && seg.endsWith(']'))) {
      score += 100; // dynamic param
    } else {
      score += 0; // static — highest priority
    }
  }
  return score;
}

/** Sort routes by specificity (static first, then params, then catch-all) */
function sortBySpecificity(routes: RouteConfig[]): RouteConfig[] {
  return [...routes].sort((a, b) => routeSpecificity(a.path) - routeSpecificity(b.path));
}

/**
 * Find the best matching route for a pathname.
 * Returns the chain of matches (for nested layouts).
 */
/**
 * Match a path pattern as a prefix (without requiring full match).
 * Returns the matched portion's length and extracted params, or null.
 */
function matchPathPrefix(
  pathname: string,
  path: string,
): { params: Record<string, string>; matchedLength: number } | null {
  const { regex, paramNames } = compilePath(path);
  // Convert exact regex to prefix: remove trailing '$'
  const prefixSource = regex.source.replace(/\$$/, '');
  const prefixRegex = new RegExp(prefixSource);
  const match = pathname.match(prefixRegex);

  if (!match) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < paramNames.length; i++) {
    params[paramNames[i]] = decodeURIComponent(match[i + 1]);
  }

  return { params, matchedLength: match[0].length };
}

export function resolveRoutes(
  routes: RouteConfig[],
  pathname: string,
): RouteMatch[] | null {
  const sorted = sortBySpecificity(routes);
  for (const route of sorted) {
    // Exact match (leaf route or route without children)
    const result = matchPath(pathname, route.path);
    if (result) {
      return [{ route, params: result.params, path: route.path }];
    }

    // Try children — pathname must start with the parent's path prefix
    if (route.children) {
      const prefixResult = matchPathPrefix(pathname, route.path);
      if (prefixResult) {
        // Remaining path after the parent prefix
        const remaining = pathname.slice(prefixResult.matchedLength) || '/';

        // Children can use either relative paths (e.g., ':slug') or
        // absolute paths (e.g., '/users/:id/posts/:postId').
        // Try relative first (remaining), then absolute (full pathname).
        const childMatches =
          resolveRoutes(route.children, remaining) ??
          resolveRoutes(route.children, pathname);
        if (childMatches) {
          return [
            { route, params: prefixResult.params, path: route.path },
            ...childMatches,
          ];
        }
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
  /** Fine-grained query signal — updates without triggering Outlet re-render */
  query: () => Record<string, string>;
  /** Fine-grained hash signal — updates without triggering Outlet re-render */
  hash: () => string;
  /** Index into the matches array for the current Outlet depth */
  depth: Signal<number>;
  /** Navigation event listener registration */
  addBeforeNavigate: (cb: NavigationEventCallback) => () => void;
  addAfterNavigate: (cb: NavigationEventCallback) => () => void;
  /** Navigation state for pending indicator */
  navState: () => 'idle' | 'loading';
  navTo: () => NavigationLocation | null;
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
    query: () => ctx.query(),
    hash: () => ctx.hash(),
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

// --- useSearchParams ---

export interface SetSearchParamsOptions {
  /** Replace all params instead of merging (default: false) */
  replace?: boolean;
  /** Push a new history entry instead of replacing (default: false — uses replaceState) */
  push?: boolean;
}

/**
 * Reactive read/write access to URL query parameters.
 *
 * Returns a `[getter, setter]` tuple:
 * - `getter()` returns `Record<string, string>` of current query params (reactive)
 * - `setter(params, options?)` merges params into URL by default
 *   - Set a value to `null` or `undefined` to remove that param
 *   - `{ replace: true }` replaces all params instead of merging
 *   - `{ push: true }` creates a new history entry (default is replaceState)
 */
export function useSearchParams(): [
  () => Record<string, string>,
  (params: Record<string, string | null | undefined>, options?: SetSearchParamsOptions) => void,
] {
  const ctx = useRouterInternal();

  const getter = (): Record<string, string> => ctx.query();

  const setter = (
    params: Record<string, string | null | undefined>,
    options?: SetSearchParamsOptions,
  ): void => {
    const resolved = ctx.route();
    const currentPath = resolved?.path ?? '/';
    const currentHash = resolved?.hash ?? '';

    let newQuery: Record<string, string>;

    if (options?.replace) {
      // Replace mode — only use the provided params
      newQuery = {};
      for (const [key, value] of Object.entries(params)) {
        if (value != null) {
          newQuery[key] = value;
        }
      }
    } else {
      // Merge mode (default) — start from current, apply changes
      newQuery = { ...getter() };
      for (const [key, value] of Object.entries(params)) {
        if (value == null) {
          delete newQuery[key];
        } else {
          newQuery[key] = value;
        }
      }
    }

    // Navigate — preserve path and hash, only change query
    ctx.navigate(currentPath, {
      query: newQuery,
      hash: currentHash || undefined,
      replace: !options?.push, // replaceState by default
    });
  };

  return [getter, setter];
}

// --- Navigation event hooks ---

/**
 * Register a callback that fires BEFORE navigation starts (before guards/loaders).
 * Observational only — cannot block navigation.
 * Auto-cleans up when the component unmounts. Returns an unsubscribe function.
 */
export function onBeforeNavigate(cb: NavigationEventCallback): () => void {
  const ctx = useRouterInternal();
  const unsub = ctx.addBeforeNavigate(cb);
  try { onUnmount(unsub); } catch (_) { /* not inside a component — manual cleanup */ }
  return unsub;
}

/**
 * Register a callback that fires AFTER navigation completes and DOM updates.
 * Auto-cleans up when the component unmounts. Returns an unsubscribe function.
 */
export function onAfterNavigate(cb: NavigationEventCallback): () => void {
  const ctx = useRouterInternal();
  const unsub = ctx.addAfterNavigate(cb);
  try { onUnmount(unsub); } catch (_) { /* not inside a component — manual cleanup */ }
  return unsub;
}

// --- Navigation state hook ---

/**
 * Get the current navigation state (idle/loading) and target location.
 * Use this to build loading indicators, disable UI during navigation, etc.
 */
export function useNavigationState(): NavigationStateInfo {
  const ctx = useRouterInternal();
  return {
    state: () => ctx.navState(),
    to: () => ctx.navTo(),
  };
}

// --- createRouter ---

/** Check if two route match chains resolve to the same route components */
function sameRouteMatches(a: RouteMatch[] | undefined, b: RouteMatch[]): boolean {
  if (!a) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].route !== b[i].route) return false;
  }
  return true;
}

function sameParams(a: Record<string, string>, b: Record<string, string>): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const k of aKeys) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

export function createRouter(routes: RouteConfig[], options?: RouterOptions): Router {
  const history = createHistory();
  const resolvedRoute = signal<ResolvedRoute | null>(null);

  // --- Navigation event listeners ---
  const beforeListeners = new Set<NavigationEventCallback>();
  const afterListeners = new Set<NavigationEventCallback>();
  let isInitialNavigation = true;
  /** Track the last navigation type for the event */
  let lastNavType: 'push' | 'replace' | 'pop' = 'push';
  /** Track whether current navigation opted out of scroll */
  let skipScroll = false;

  function addBeforeNavigate(cb: NavigationEventCallback): () => void {
    beforeListeners.add(cb);
    return () => { beforeListeners.delete(cb); };
  }

  function addAfterNavigate(cb: NavigationEventCallback): () => void {
    afterListeners.add(cb);
    return () => { afterListeners.delete(cb); };
  }

  function buildLocation(pathname: string, params: Record<string, string>, query: Record<string, string>, hash: string): NavigationLocation {
    return { path: pathname, params, query, hash };
  }

  function fireListeners(listeners: Set<NavigationEventCallback>, event: NavigationEvent): void {
    for (const cb of listeners) {
      try { cb(event); } catch (_) { /* listener errors don't break navigation */ }
    }
  }
  // Separate signals for query and hash — these can change without
  // triggering Outlet re-render (same route, different query/hash).
  const querySignal = signal<Record<string, string>>({}, {
    equals: (a, b) => {
      const aKeys = Object.keys(a);
      const bKeys = Object.keys(b);
      if (aKeys.length !== bKeys.length) return false;
      for (const k of aKeys) { if (a[k] !== b[k]) return false; }
      return true;
    },
  });
  const hashSignal = signal<string>('');
  const loaderData = signal<Map<string, unknown>>(new Map());
  const isNavigating = signal(false);
  const navStateSignal = signal<'idle' | 'loading'>('idle');
  const navToSignal = signal<NavigationLocation | null>(null);
  let lastNavUrl = '';

  async function performNavigation(pathname: string, search: string, hash: string): Promise<void> {
    // Deduplicate — skip if already navigated to this exact URL in this tick.
    // Prevents double afterNavigate on pop (effect + direct call).
    const navUrl = pathname + search + hash;
    if (navUrl === lastNavUrl) return;
    lastNavUrl = navUrl;
    // Reset after microtask so the same URL can be navigated to again later
    queueMicrotask(() => { lastNavUrl = ''; });

    const matches = resolveRoutes(routes, pathname);
    const newQuery = parseQuery(search);
    const newHash = parseHash(hash);

    // Build "from" location from current state
    const current = resolvedRoute();
    const fromLocation: NavigationLocation = current
      ? buildLocation(current.path, current.params, current.query, current.hash)
      : buildLocation('/', {}, {}, '');

    if (!matches) {
      resolvedRoute.set(null);
      querySignal.set({});
      hashSignal.set('');
      loaderData.set(new Map());
      navStateSignal.set('idle');
      navToSignal.set(null);
      return;
    }

    // Merge params from all matches
    const params: Record<string, string> = {};
    for (const match of matches) {
      Object.assign(params, match.params);
    }

    const toLocation = buildLocation(pathname, params, newQuery, newHash);

    // Fire before-navigate listeners (skip initial page load)
    if (!isInitialNavigation) {
      const event: NavigationEvent = { from: fromLocation, to: toLocation, type: lastNavType };
      fireListeners(beforeListeners, event);
    }

    // Set loading state — covers guards + loaders + component chunk load.
    // Query-only and hash-only changes skip this (no component loading).
    navStateSignal.set('loading');
    navToSignal.set(toLocation);

    // If only query/hash changed but the matched route chain and params
    // are identical, update just the query/hash signals without triggering
    // a full Outlet re-render (guards, loaders, component swap).
    // Query-only and hash-only changes do NOT trigger loading state.
    if (
      current &&
      current.path === pathname &&
      sameRouteMatches(current.matches, matches) &&
      sameParams(current.params, params)
    ) {
      querySignal.set(newQuery);
      hashSignal.set(newHash);
      // Update the resolved route object in place so route() reflects
      // current query/hash, but use the same matches reference so the
      // signal equality check prevents Outlet from re-rendering.
      current.query = newQuery;
      current.hash = newHash;

      // Query/hash-only — reset loading state immediately (no component load)
      navStateSignal.set('idle');
      navToSignal.set(null);

      // Fire after-navigate (skip initial)
      if (!isInitialNavigation) {
        const event: NavigationEvent = { from: fromLocation, to: toLocation, type: lastNavType };
        fireListeners(afterListeners, event);
      }
      isInitialNavigation = false;
      return;
    }

    // Run guards
    const guardResult = await runGuards(matches);
    if (guardResult) {
      // Redirect — update `to` to reflect redirect target, then navigate
      navToSignal.set({ path: guardResult.path, params: {}, query: {}, hash: '' });
      await navigate(guardResult.path);
      return;
    }

    // Run loaders
    const data = await runLoaders(matches);
    loaderData.set(data);

    // Update query/hash signals
    querySignal.set(newQuery);
    hashSignal.set(newHash);

    // Set resolved route — triggers Outlet re-render
    resolvedRoute.set({
      matches,
      params,
      query: newQuery,
      hash: newHash,
      path: pathname,
    });

    // Navigation complete — reset to idle
    navStateSignal.set('idle');
    navToSignal.set(null);

    // Fire after-navigate (skip initial)
    if (!isInitialNavigation) {
      const event: NavigationEvent = { from: fromLocation, to: toLocation, type: lastNavType };
      fireListeners(afterListeners, event);
    }
    isInitialNavigation = false;
  }

  // Flag to suppress the location effect during programmatic navigation.
  // navigate() calls performNavigation directly — the effect should only
  // fire for actual popstate (back/forward button).
  let programmaticNav = false;

  // Hoisted ref — assigned inside scroll restoration setup, called from navigate()
  let scrollSaveNow: (() => void) | null = null;

  // React to history changes (popstate = back/forward button)
  const disposeEffect = effect(() => {
    const loc = history.location();
    if (programmaticNav) {
      programmaticNav = false;
      return;
    }
    lastNavType = 'pop';
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

    lastNavType = options?.replace ? 'replace' : 'push';
    skipScroll = options?.scroll === false;

    // Save scroll position for the CURRENT entry BEFORE push changes history.state
    if (scrollSaveNow) {
      scrollSaveNow();
    }

    // Suppress the location effect — we call performNavigation directly
    programmaticNav = true;

    if (options?.replace) {
      history.replace(url);
    } else {
      history.push(url);
    }

    isNavigating.set(true);
    return performNavigation(
      pathname,
      options?.query ? '?' + new URLSearchParams(options.query).toString() : '',
      options?.hash ? '#' + options.hash : '',
    ).finally(() => {
      isNavigating.set(false);
    });
  }) as NavigateFn;

  // Provide router context so Outlet and use* hooks can inject it
  const depth = signal(0);
  provideRouter({ route: () => resolvedRoute(), navigate, loaderData: () => loaderData(), query: () => querySignal(), hash: () => hashSignal(), depth, addBeforeNavigate, addAfterNavigate, navState: () => navStateSignal(), navTo: () => navToSignal() });

  // --- Scroll restoration ---
  const scrollEnabled = options?.scrollRestoration !== false;
  let disposeScroll: (() => void) | undefined;

  if (scrollEnabled && typeof window !== 'undefined') {
    // Take over scroll restoration from the browser
    window.history.scrollRestoration = 'manual';

    const STORAGE_PREFIX = '__akash_scroll_';

    /** Get the scroll key from the current history entry */
    function getScrollKey(): string | null {
      return window.history.state?.__scrollKey ?? null;
    }

    // In-memory cache + sessionStorage for persistence across refresh
    const savedPositions = new Map<string, { x: number; y: number }>();

    function saveForKey(key: string, pos: { x: number; y: number }): void {
      savedPositions.set(key, pos);
      try {
        sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(pos));
      } catch (_) { /* quota exceeded — non-critical */ }
    }

    function getSavedPosition(key: string): { x: number; y: number } | null {
      const mem = savedPositions.get(key);
      if (mem) return mem;
      const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
      if (!raw) return null;
      try { return JSON.parse(raw); } catch (_) { return null; }
    }

    // Continuously save scroll position on scroll (debounced).
    // This avoids the popstate timing problem: by the time onBeforeNavigate
    // fires for back/forward, history.state has already changed to the
    // destination entry, so we can't read the source entry's key.
    // Instead, we save on every scroll so the position is always fresh.
    let scrollTimer: ReturnType<typeof setTimeout> | null = null;
    function onScroll(): void {
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        const key = getScrollKey();
        if (key) {
          saveForKey(key, { x: window.scrollX, y: window.scrollY });
        }
      }, 100);
    }
    window.addEventListener('scroll', onScroll, { passive: true });

    // Save initial position — scroll listener only fires on scroll events,
    // so {x:0, y:0} at page load would never be captured otherwise.
    const initKey = getScrollKey();
    if (initKey) {
      saveForKey(initKey, { x: window.scrollX, y: window.scrollY });
    }

    // Also save immediately before programmatic navigations (push/replace)
    // where we control the timing and history.state is still the source entry.
    function saveScrollNow(): void {
      if (scrollTimer) { clearTimeout(scrollTimer); scrollTimer = null; }
      const key = getScrollKey();
      if (key) {
        saveForKey(key, { x: window.scrollX, y: window.scrollY });
      }
    }
    scrollSaveNow = saveScrollNow;

    function restoreScrollPosition(): void {
      const key = getScrollKey();
      if (!key) return;
      const pos = getSavedPosition(key);
      if (!pos) return;

      const { x, y } = pos;

      // Try immediately
      window.scrollTo(x, y);
      if (y <= 0 || Math.abs(window.scrollY - y) < 2) return;

      // Page isn't tall enough yet (async component loading) —
      // use MutationObserver to retry as content renders.
      const timeout = setTimeout(() => {
        observer.disconnect();
      }, 5000);

      const observer = new MutationObserver(() => {
        window.scrollTo(x, y);
        if (Math.abs(window.scrollY - y) < 2) {
          observer.disconnect();
          clearTimeout(timeout);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
    }

    function scrollToHash(hash: string): void {
      // Try immediately first
      const el = document.getElementById(hash);
      if (el) { el.scrollIntoView(); return; }

      // Element not in DOM yet (async component loading) —
      // use MutationObserver to detect when it appears.
      const timeout = setTimeout(() => {
        observer.disconnect();
        window.scrollTo(0, 0);
      }, 5000);

      const observer = new MutationObserver(() => {
        const target = document.getElementById(hash);
        if (target) {
          observer.disconnect();
          clearTimeout(timeout);
          target.scrollIntoView();
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
    }

    // Scroll save for programmatic navigations happens in navigate()
    // before history.push changes the state key. For pop (back/forward),
    // the debounced scroll listener already saved.

    // After: restore or scroll to top
    const unsubAfter = addAfterNavigate((event) => {
      if (skipScroll) { skipScroll = false; return; }

      if (event.type === 'pop') {
        // Back/Forward: if the URL has a hash, scroll to that element
        // instead of restoring a potentially stale saved position
        // (smooth scrollIntoView may have been mid-animation when saved).
        if (event.to.hash) {
          scrollToHash(event.to.hash);
          return;
        }
        restoreScrollPosition();
      } else if (event.from.path !== event.to.path) {
        // Forward to new page
        if (event.to.hash) {
          scrollToHash(event.to.hash);
        } else {
          window.scrollTo(0, 0);
        }
      } else if (event.to.hash) {
        // Same page — scroll to hash if present (covers hash change and
        // navigating to same path with hash from a Link)
        // Use instant scroll — smooth animation races with the debounced
        // scroll-save listener, causing stale positions to be saved.
        scrollToHash(event.to.hash);
      } else {
        // Query-only changes: do nothing — user stays where they are
      }
    });

    // Initial page load: browser's native hash scroll is disabled by
    // scrollRestoration='manual', and onAfterNavigate skips the initial
    // navigation. Handle it manually after the page component mounts.
    const initHash = window.location.hash;
    if (initHash) {
      scrollToHash(initHash.slice(1));
    }

    disposeScroll = () => { unsubAfter(); window.removeEventListener('scroll', onScroll); if (scrollTimer) clearTimeout(scrollTimer); };
  }

  return {
    navigate,
    route: () => resolvedRoute(),
    dispose() {
      disposeEffect();
      history.dispose();
      disposeScroll?.();
    },
  };
}
