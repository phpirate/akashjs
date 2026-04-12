/**
 * Router type definitions.
 */

import type { AkashNode, Component } from '@akashjs/runtime';

// --- Route configuration ---

export interface RouteConfig {
  /** URL path pattern, e.g. '/blog/:slug' */
  path: string;
  /** Lazy-loaded page component */
  component: () => Promise<{ default: Component<any> }>;
  /** Lazy-loaded layout component (wraps this route and its children) */
  layout?: () => Promise<{ default: Component<any> }>;
  /** Lazy-loaded route guard */
  guard?: () => Promise<{ guard: RouteGuard }>;
  /** Lazy-loaded data loader */
  loader?: () => Promise<{ loader: RouteLoader<any> }>;
  /** Child routes for nested routing */
  children?: RouteConfig[];
}

// --- Route matching ---

export interface RouteMatch {
  /** The matched route config */
  route: RouteConfig;
  /** Extracted path parameters */
  params: Record<string, string>;
  /** Matched path segment */
  path: string;
}

/** Full match result including nested layout chain */
export interface ResolvedRoute {
  /** Chain of matched routes from root layout to leaf page */
  matches: RouteMatch[];
  /** Merged params from all segments */
  params: Record<string, string>;
  /** Query string parameters */
  query: Record<string, string>;
  /** URL hash (without #) */
  hash: string;
  /** Full pathname */
  path: string;
}

// --- Guards ---

export interface GuardContext {
  /** Current route params */
  params: Record<string, string>;
  /** Redirect to a different path (aborts navigation) */
  redirect: (path: string) => NavigationResult;
}

export type RouteGuard = (ctx: GuardContext) => Promise<NavigationResult | void> | NavigationResult | void;

export interface NavigationResult {
  _type: 'redirect';
  path: string;
}

// --- Loaders ---

export interface LoaderContext<P extends Record<string, string> = Record<string, string>> {
  /** Route params */
  params: P;
  /** Fetch function (can be intercepted) */
  fetch: typeof globalThis.fetch;
}

export type RouteLoader<P extends Record<string, string> = Record<string, string>> = (
  ctx: LoaderContext<P>,
) => Promise<unknown>;

// --- Navigation ---

export interface NavigateOptions {
  /** Replace the current history entry instead of pushing */
  replace?: boolean;
  /** Route params for parameterized paths */
  params?: Record<string, string>;
  /** Query string parameters */
  query?: Record<string, string>;
  /** Hash (without #) */
  hash?: string;
  /** Set to false to skip scroll behavior for this navigation */
  scroll?: boolean;
}

export interface RouterOptions {
  /** Enable automatic scroll restoration (default: true) */
  scrollRestoration?: boolean;
}

// --- Router instance ---

export interface Router {
  /** Navigate to a path */
  navigate: NavigateFn;
  /** Current resolved route (reactive signal) */
  route: () => ResolvedRoute | null;
  /** Dispose the router and stop listening to history */
  dispose: () => void;
}

export type NavigateFn = {
  /** Navigate to a path string */
  (path: string, options?: NavigateOptions): Promise<void>;
  /** Navigate back/forward by delta */
  (delta: number): void;
};

// --- Route info hooks return types ---

export interface RouteInfo {
  /** Current pathname */
  path: () => string;
  /** Current params */
  params: () => Record<string, string>;
  /** Current query params */
  query: () => Record<string, string>;
  /** Current hash */
  hash: () => string;
}

// --- Navigation events ---

export interface NavigationLocation {
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  hash: string;
}

export interface NavigationEvent {
  from: NavigationLocation;
  to: NavigationLocation;
  type: 'push' | 'replace' | 'pop';
}

export type NavigationEventCallback = (event: NavigationEvent) => void;

// --- Navigation state (pending indicator) ---

export interface NavigationStateInfo {
  /** Current navigation state */
  state: () => 'idle' | 'loading';
  /** Target location during loading, null when idle */
  to: () => NavigationLocation | null;
}
