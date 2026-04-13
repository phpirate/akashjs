// @akashjs/runtime — Core runtime entry point
export { signal, computed, effect, untrack, on } from './signals.js';
export type { Signal, ReadonlySignal } from './signals.js';

export { batch, flushSync } from './scheduler.js';

export { defineComponent, onMount, onUnmount, onError, ref, __getter } from './component.js';
export type { Component, ComponentContext, Ref } from './component.js';

export { createContext, provide, inject, getCurrentScope, runInScope } from './context.js';
export type { InjectionKey } from './context.js';

export {
  createElement,
  createText,
  cloneTemplate,
  setProperty,
  bindText,
  bindProperty,
  bindVisible,
  renderConditional,
  renderList,
  Show,
  For,
  nodeToDOM,
  insert,
} from './dom.js';

export type { AkashNode } from './types.js';

export { renderSlot, hasSlot, createSlots } from './slots.js';
export type { SlotFn, Slots } from './slots.js';

export { ErrorBoundary } from './error-boundary.js';
export type { ErrorBoundaryProps } from './error-boundary.js';

export { Suspense, getSuspenseContext, registerPending } from './suspense.js';
export type { SuspenseProps } from './suspense.js';

export {
  hydrate,
  progressiveHydrate,
  isHydrationActive,
  claimElement,
  claimText,
  findHydrationBoundaries,
  HYDRATE_ATTR,
} from './hydration.js';
export type { HydrateOptions, ProgressiveHydrateOptions } from './hydration.js';

export {
  renderToString,
  renderToStringSync,
  renderToStream,
  ssrElement,
  ssrText,
  ssrRaw,
  nodeToHtml,
  renderNodes,
  isServerRendering,
} from './ssr.js';
export type { SSRElement, SSRText, SSRRaw, SSRNode } from './ssr.js';

export { defineStore, clearStores, configureStores, __getStoreInstances } from './store.js';
export type { StorePlugin } from './store.js';
export type { Store, StoreDefinition } from './store.js';

export {
  Transition,
  getTransitionClasses,
  enterTransition,
  exitTransition,
  generateTransitionCSS,
} from './transition.js';
export type { TransitionProps, TransitionClasses } from './transition.js';

export { useHead, renderHeadToString, collectSSRHead } from './head.js';
export type { HeadConfig, MetaTag, LinkTag, ScriptTag } from './head.js';

export { definePlugin, createApp } from './plugin.js';
export type { Plugin, PluginContext, AppInstance } from './plugin.js';

export {
  useInterval, useTimeout, useDebounce, useThrottle,
  useCounter, useToggle, usePrevious,
} from './composables.js';

export {
  useMediaQuery, useBreakpoint, useStorage, useClipboard,
  useOnline, useGeolocation, useWindowSize, useClickOutside,
} from './browser.js';
export type { Breakpoints, GeolocationState } from './browser.js';

export { Portal } from './portal.js';
export type { PortalProps } from './portal.js';

export { createToaster } from './toast.js';
export type { Toast, ToastType, ToastPosition, ToastOptions, ToasterOptions, Toaster } from './toast.js';

export { useTheme } from './theme.js';
export type { ThemeConfig, ThemeVariables, Theme } from './theme.js';

export { VirtualFor, calculateRange, useVirtualList } from './virtual-list.js';
export type { VirtualForProps, VirtualRange } from './virtual-list.js';

export { defineAsyncComponent } from './async-component.js';
export type { AsyncComponentLoader, AsyncComponentOptions } from './async-component.js';

export { longestIncreasingSubsequence, reconcileKeys, countOps } from './reconcile.js';
export type { ReconcileOp } from './reconcile.js';

export {
  enableLeakDetection, disableLeakDetection, isLeakDetectionEnabled,
  trackEffect, untrackEffect, getActiveEffects, checkForLeaks, reportLeaks,
  getLeakDetectionStats,
} from './leak-detector.js';
export type { LeakWarning } from './leak-detector.js';

export {
  startProfiling, stopProfiling, isProfiling, recordPerfEntry,
  getProfileSummary, measureSync, measureAsync, createTimer, formatProfile,
} from './perf.js';
export type { PerfEntry, PerfProfile, PerfSummary } from './perf.js';

export { useFocusTrap, useAnnounce, useKeyboard } from './a11y.js';
export type { FocusTrap, FocusTrapOptions, AriaLive, KeyBinding, KeyboardManager } from './a11y.js';

export { Image } from './image.js';
export type { ImageProps } from './image.js';

export { useInfiniteScroll } from './infinite-scroll.js';
export type { InfiniteScroll, InfiniteScrollOptions } from './infinite-scroll.js';

export { cx, css, applyStyles } from './css.js';

export { createDataTable } from './data-table.js';
export type { DataTable, DataTableOptions, ColumnDef, SortState, SortDirection } from './data-table.js';

export { useStructuredData, useOpenGraph, useTwitterCard, useSEO, generateSitemap } from './seo.js';
export type { StructuredData, OpenGraphData, TwitterCardData, SEOConfig, SitemapEntry } from './seo.js';

export {
  createSync, LWWRegister, createWebSocketTransport, createLocalTransport,
  useCursor, useTypingIndicator,
} from './sync.js';
export type { SyncDoc, SyncOptions, SyncTransport, SyncOp, PeerInfo, LWWEntry, SyncConflict } from './sync.js';

export { createOfflineStore } from './offline.js';
export type { OfflineStore, OfflineStoreOptions, ConflictStrategy } from './offline.js';

export {
  pipe, chain, definePipe,
  uppercase, lowercase, capitalize, titleCase, trim, truncate,
  date, currency, number, percent, json, plural, relativeTime,
} from './pipes.js';
export type { PipeFn } from './pipes.js';

export {
  defineDirective, directiveFromFn, applyDirective, updateDirective, removeDirectives,
  vAutoFocus, vClickOutside, vLongPress, vIntersect, vResize,
} from './directive.js';
export type { Directive, DirectiveBinding, DirectiveHooks } from './directive.js';

export { registerServiceWorker, generateSWScript, subscribePush } from './pwa.js';
export type { SWOptions, SWRegistration, CacheStrategy, CacheRoute } from './pwa.js';

export { defineCustomElement, toCustomElement } from './web-component.js';
export type { CustomElementOptions } from './web-component.js';

export { prerender, discoverStaticRoutes, generatePaths, urlToFilePath, sitemapFromResults } from './ssg.js';
export type { PrerenderOptions, PrerenderResult } from './ssg.js';

export { renderSwitch, Switch, match } from './switch.js';
export type { SwitchProps } from './switch.js';

export {
  defineProvider, createInjector, injectProvider, clearProviders,
} from './di.js';
export type { ProviderDef, Injector, ProviderRegistration } from './di.js';

export {
  animate, animateStagger, animateSequence, animateGroup,
  animateSpring, keyframes, defineStates,
} from './animate.js';
export type { AnimationOptions, StaggerOptions, SpringOptions, AnimationControl, AnimationState } from './animate.js';

export { defer } from './defer.js';
export type { DeferTrigger, DeferOptions } from './defer.js';

export {
  startViewTransition, supportsViewTransitions,
  viewTransitionCSS, assignTransitionName,
} from './view-transition.js';
export type { ViewTransitionOptions, ViewTransition } from './view-transition.js';

export {
  useQueryState, useQueryStates, clearQueryState,
  getQueryParams, removeQueryState, resetQueryState,
} from './query-state.js';
export type { QueryStateOptions } from './query-state.js';

export { tweened, easings } from './tweened.js';
export type { TweenedSignal, TweenedOptions, Interpolator, EasingFn } from './tweened.js';

export { createFlip, flip } from './flip.js';
export type { FlipOptions, FlipController } from './flip.js';

export { Await, awaitSignal } from './await-block.js';
export type { AwaitProps } from './await-block.js';

export {
  withModifiers, onEvent,
  bindDimensions, bindScroll, bindElement, bindGroup, bindGroupItem,
  bindClass, bindClasses, bindStyle, bindStyles,
} from './event-modifiers.js';
export type { EventModifiers } from './event-modifiers.js';

export { defineSnippet, inspect, defineFormAction, enableSnapshots } from './snippets.js';
export type { Snippet, InspectOptions, FormAction, SnapshotConfig } from './snippets.js';

export { watch, watchOnce, watchDebounced } from './watch.js';
export type { WatchOptions, WatchSource, WatchCallback } from './watch.js';

export { deepSignal, toRaw, isDeepSignal } from './deep-signal.js';
export type { DeepSignal } from './deep-signal.js';

export { createMachine } from './machine.js';
export type { Machine, MachineConfig, StateConfig, TransitionConfig, MachineContext } from './machine.js';

export { createEventBus, globalEventBus } from './event-bus.js';
export type { EventBus, EventMap, EventHandler } from './event-bus.js';

export {
  sanitize, escapeHtml, createSafeHTML,
  generateCSP, getCSPHeaderName, generateSecurityHeaders,
  safeMerge, deepFreeze,
  generateSRI, generateCSRFToken, createCSRFInterceptor,
  sanitizeURL, createRateLimiter,
} from './security.js';
export type { SanitizeOptions, CSPConfig, SecurityHeadersConfig } from './security.js';

export {
  deprecated, deprecatedValue, setDeprecationWarnings, setWarningHandler,
  resetDeprecationWarnings, registerAPI, getRegisteredAPIs, getAPIsByStability,
  isDeprecated, getDeprecationInfo, checkCompatibility,
} from './deprecation.js';
export type { APIStability, DeprecationInfo, APIInfo, CompatibilityResult } from './deprecation.js';

export { akashError, formatError, getErrorDef, getAllErrorCodes } from './errors.js';
export type { ErrorDef } from './errors.js';

export { installDevtools } from './devtools.js';
export type { DevToolsAPI, DevToolsOptions } from './devtools.js';

export { enhanceError, installErrorHints } from './error-hints.js';
