/**
 * Hierarchical Dependency Injection.
 *
 * Extends the basic provide/inject with multi-level injectors,
 * provider factories, tree-shakable providers, and multi-providers.
 *
 * ```ts
 * // Define a provider with factory
 * const ApiService = defineProvider({
 *   factory: () => createHttpClient({ baseUrl: '/api' }),
 * });
 *
 * // Tree-shakable provider (only bundled if injected)
 * const Logger = defineProvider({
 *   factory: () => new ConsoleLogger(),
 *   providedIn: 'root',
 * });
 *
 * // Use in component
 * const api = injectProvider(ApiService);
 * ```
 */

import { signal } from './signals.js';

// =========================================================================
// Types
// =========================================================================

export interface ProviderDef<T> {
  _type: 'provider';
  factory: () => T;
  providedIn?: 'root' | 'component';
  multi?: boolean;
  _id: symbol;
}

export interface Injector {
  /** Get a provider value */
  get<T>(provider: ProviderDef<T>): T;
  /** Check if a provider is registered */
  has(provider: ProviderDef<unknown>): boolean;
  /** Create a child injector */
  createChild(providers?: ProviderRegistration[]): Injector;
  /** Dispose this injector and all cached instances */
  dispose(): void;
}

export interface ProviderRegistration<T = unknown> {
  provide: ProviderDef<T>;
  useFactory?: () => T;
  useValue?: T;
  useExisting?: ProviderDef<T>;
  multi?: boolean;
}

// =========================================================================
// defineProvider
// =========================================================================

let providerIdCounter = 0;

/**
 * Define a typed provider.
 *
 * ```ts
 * const DatabaseService = defineProvider({
 *   factory: () => new Database(config),
 *   providedIn: 'root', // singleton, tree-shakable
 * });
 * ```
 */
export function defineProvider<T>(config: {
  factory: () => T;
  providedIn?: 'root' | 'component';
  multi?: boolean;
}): ProviderDef<T> {
  return {
    _type: 'provider',
    factory: config.factory,
    providedIn: config.providedIn,
    multi: config.multi,
    _id: Symbol(`provider-${++providerIdCounter}`),
  };
}

// =========================================================================
// Injector implementation
// =========================================================================

const rootInstances = new Map<symbol, unknown>();

/**
 * Create an injector with hierarchical resolution.
 *
 * ```ts
 * const injector = createInjector([
 *   { provide: ApiService, useFactory: () => new MockApi() },
 *   { provide: Logger, useValue: console },
 * ]);
 *
 * const api = injector.get(ApiService);
 * ```
 */
export function createInjector(
  providers: ProviderRegistration[] = [],
  parent?: Injector,
): Injector {
  const instances = new Map<symbol, unknown>();
  const multiInstances = new Map<symbol, unknown[]>();
  const registrations = new Map<symbol, ProviderRegistration>();

  // Register providers
  for (const reg of providers) {
    registrations.set(reg.provide._id, reg);
  }

  const injector: Injector = {
    get<T>(provider: ProviderDef<T>): T {
      const id = provider._id;

      // Multi-provider
      if (provider.multi) {
        if (multiInstances.has(id)) return multiInstances.get(id) as T;
        const values: unknown[] = [];
        const reg = registrations.get(id);
        if (reg?.useFactory) values.push(reg.useFactory());
        else if (reg?.useValue !== undefined) values.push(reg.useValue);
        if (parent?.has(provider)) {
          const parentValues = parent.get(provider);
          if (Array.isArray(parentValues)) values.push(...parentValues);
        }
        multiInstances.set(id, values);
        return values as T;
      }

      // Check local cache
      if (instances.has(id)) return instances.get(id) as T;

      // Check root singleton
      if (provider.providedIn === 'root' && rootInstances.has(id)) {
        return rootInstances.get(id) as T;
      }

      // Check local registrations
      const reg = registrations.get(id);
      if (reg) {
        const instance = resolveRegistration(reg, injector);
        instances.set(id, instance);
        return instance as T;
      }

      // Check parent
      if (parent) {
        return parent.get(provider);
      }

      // Use default factory
      const instance = provider.factory();

      // Cache at appropriate level
      if (provider.providedIn === 'root') {
        rootInstances.set(id, instance);
      } else {
        instances.set(id, instance);
      }

      return instance;
    },

    has(provider: ProviderDef<unknown>): boolean {
      if (instances.has(provider._id)) return true;
      if (registrations.has(provider._id)) return true;
      if (provider.providedIn === 'root' && rootInstances.has(provider._id)) return true;
      if (parent) return parent.has(provider);
      return false;
    },

    createChild(childProviders?: ProviderRegistration[]): Injector {
      return createInjector(childProviders ?? [], injector);
    },

    dispose() {
      instances.clear();
      multiInstances.clear();
    },
  };

  return injector;
}

function resolveRegistration(reg: ProviderRegistration, injector: Injector): unknown {
  if (reg.useValue !== undefined) return reg.useValue;
  if (reg.useFactory) return reg.useFactory();
  if (reg.useExisting) return injector.get(reg.useExisting);
  return reg.provide.factory();
}

// =========================================================================
// Component-level injection helpers
// =========================================================================

let currentInjector: Injector | null = null;

/**
 * Set the current injector (called by component setup).
 * @internal
 */
export function setCurrentInjector(injector: Injector | null): Injector | null {
  const prev = currentInjector;
  currentInjector = injector;
  return prev;
}

/**
 * Inject a provider in the current component context.
 *
 * ```ts
 * const api = injectProvider(ApiService);
 * ```
 */
export function injectProvider<T>(provider: ProviderDef<T>): T {
  if (!currentInjector) {
    // Fallback to root or create new instance
    if (provider.providedIn === 'root') {
      if (rootInstances.has(provider._id)) {
        return rootInstances.get(provider._id) as T;
      }
      const instance = provider.factory();
      rootInstances.set(provider._id, instance);
      return instance;
    }
    return provider.factory();
  }
  return currentInjector.get(provider);
}

/**
 * Clear root provider instances (useful for testing).
 */
export function clearProviders(): void {
  rootInstances.clear();
}
