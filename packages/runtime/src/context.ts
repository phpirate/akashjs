/**
 * Lightweight dependency injection via provide/inject.
 *
 * Context is scoped to the component tree — no injector hierarchy,
 * no decorators, no classes. Just createContext(), provide(), inject().
 */

// --- Types ---

import { akashError } from './errors.js';

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
    throw akashError('AK0010');
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
    throw akashError('AK0012');
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

  throw akashError('AK0013');
}
