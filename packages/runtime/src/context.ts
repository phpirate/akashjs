/**
 * Lightweight dependency injection via provide/inject.
 *
 * Context is scoped to the component tree — no injector hierarchy,
 * no decorators, no classes. Just createContext(), provide(), inject().
 */

// --- Types ---

const CONTEXT_BRAND = Symbol('akash.context');

export interface InjectionKey<T> {
  readonly [CONTEXT_BRAND]: true;
  readonly _type: T; // phantom type — never used at runtime
  readonly defaultValue: T | undefined;
  readonly id: symbol;
}

// --- Context stack (managed by component system) ---

interface ContextScope {
  values: Map<symbol, unknown>;
  parent: ContextScope | null;
}

let currentScope: ContextScope | null = null;

/** @internal — called by defineComponent to push/pop context scopes */
export function pushScope(parent: ContextScope | null = currentScope): ContextScope {
  const scope: ContextScope = { values: new Map(), parent };
  currentScope = scope;
  return scope;
}

/** @internal */
export function popScope(scope: ContextScope): void {
  currentScope = scope.parent;
}

/** @internal */
export function getCurrentScope(): ContextScope | null {
  return currentScope;
}

/**
 * Run a function within a given scope so that provide/inject
 * work correctly for components created asynchronously
 * (e.g., lazy-loaded route components).
 */
export function runInScope<T>(scope: ContextScope, fn: () => T): T {
  const prev = currentScope;
  currentScope = scope;
  try {
    return fn();
  } finally {
    currentScope = prev;
  }
}

// --- Public API ---

/**
 * Create a typed context key with an optional default value.
 *
 * ```ts
 * const ThemeContext = createContext<'light' | 'dark'>('light');
 * ```
 */
export function createContext<T>(defaultValue?: T): InjectionKey<T> {
  return {
    [CONTEXT_BRAND]: true,
    _type: undefined as T,
    defaultValue,
    id: Symbol('context'),
  };
}

/**
 * Provide a value for a context key in the current component scope.
 * All descendant components can inject() this value.
 *
 * Must be called inside defineComponent() setup.
 */
export function provide<T>(key: InjectionKey<T>, value: T): void {
  if (!currentScope) {
    throw new Error('[AkashJS AK0010] provide() called outside component setup');
  }
  currentScope.values.set(key.id, value);
}

/**
 * Inject a value from the nearest ancestor that provided it.
 *
 * Must be called inside defineComponent() setup.
 */
export function inject<T>(key: InjectionKey<T>): T;
export function inject<T>(key: InjectionKey<T>, fallback: T): T;
export function inject<T>(key: InjectionKey<T>, fallback?: T): T {
  if (!currentScope) {
    throw new Error('[AkashJS AK0012] inject() called outside component setup');
  }

  // Walk up the scope chain
  let scope: ContextScope | null = currentScope;
  while (scope) {
    if (scope.values.has(key.id)) {
      return scope.values.get(key.id) as T;
    }
    scope = scope.parent;
  }

  // Check fallback, then default
  if (fallback !== undefined) return fallback;
  if (key.defaultValue !== undefined) return key.defaultValue;

  throw new Error('[AkashJS AK0013] No provider found for context key');
}
