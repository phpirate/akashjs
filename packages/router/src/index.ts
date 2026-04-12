// @akashjs/router — Entry point

// Core router
export { createRouter, compilePath, matchPath, resolvePath, resolveRoutes } from './router.js';
export { useRoute, useParams, useNavigate, useLoaderData, useSearchParams, useNavigationState, onBeforeNavigate, onAfterNavigate } from './router.js';
export type { SetSearchParamsOptions } from './router.js';

// Components
export { Link } from './link.js';
export type { LinkProps } from './link.js';
export { Outlet } from './outlet.js';

// Guards
export { composeGuards, guardWith } from './guards.js';

// Loaders
export { defineLoader } from './loader.js';

// History
export { createHistory, buildUrl, parseQuery, parseHash } from './history.js';
export type { HistoryManager, HistoryLocation } from './history.js';

// Middleware
export { defineMiddleware, runMiddleware, composeMiddleware } from './middleware.js';
export type { Middleware, MiddlewareContext } from './middleware.js';

// Navigation progress indicator
export { NavigationProgress } from './navigation-progress.js';
export type { NavigationProgressProps } from './navigation-progress.js';

// Route transitions + canDeactivate
export { canDeactivate, getRouteTransitionClasses, generateRouteTransitionCSS } from './route-transition.js';
export type { RouteTransitionConfig, CanDeactivateOptions, CanDeactivateFn } from './route-transition.js';

// Types
export type {
  RouteConfig,
  RouteMatch,
  ResolvedRoute,
  Router,
  NavigateFn,
  NavigateOptions,
  RouteGuard,
  GuardContext,
  NavigationResult,
  RouteLoader,
  LoaderContext,
  RouteInfo,
  NavigationEvent,
  NavigationEventCallback,
  NavigationLocation,
  RouterOptions,
  NavigationStateInfo,
} from './types.js';
