/**
 * Plugin system.
 *
 * Allows third-party extensions to hook into the AkashJS lifecycle.
 * Plugins can provide context values, add global error handlers,
 * register stores, and run setup code.
 *
 * ```ts
 * const authPlugin = definePlugin({
 *   name: 'auth',
 *   setup(app) {
 *     const store = defineStore('auth', { ... })();
 *     app.provide(AuthContext, store);
 *     app.onError((err) => { if (err.status === 401) logout(); });
 *   },
 * });
 *
 * const app = createApp(App);
 * app.use(authPlugin);
 * app.mount('#app');
 * ```
 */

import { provide } from './context.js';
import type { InjectionKey } from './context.js';
import type { Component } from './component.js';

// --- Types ---

export interface PluginContext {
  /** Provide a value to all components */
  provide<T>(key: InjectionKey<T>, value: T): void;
  /** Register a global error handler */
  onError(handler: (error: Error) => void): void;
  /** Register a hook that runs before each component mount */
  onBeforeMount(hook: () => void): void;
  /** Access the app config */
  config: Record<string, unknown>;
}

export interface Plugin {
  /** Plugin name (for debugging) */
  name: string;
  /** Setup function called when the plugin is installed */
  setup: (ctx: PluginContext) => void | Promise<void>;
}

export interface AppInstance {
  /** Install a plugin */
  use(plugin: Plugin): AppInstance;
  /** Set a config value */
  config(key: string, value: unknown): AppInstance;
  /** Mount the app to a DOM element */
  mount(selector: string | HTMLElement): void;
  /** Unmount the app */
  unmount(): void;
}

// --- definePlugin ---

/**
 * Define a framework plugin.
 */
export function definePlugin(plugin: Plugin): Plugin {
  return plugin;
}

// --- createApp ---

/**
 * Create an application instance with plugin support.
 *
 * ```ts
 * const app = createApp(App);
 * app.use(authPlugin);
 * app.use(i18nPlugin);
 * app.mount('#app');
 * ```
 */
export function createApp<P extends Record<string, unknown>>(
  rootComponent: Component<P>,
  rootProps?: P,
): AppInstance {
  const plugins: Plugin[] = [];
  const errorHandlers: Array<(error: Error) => void> = [];
  const beforeMountHooks: Array<() => void> = [];
  const appConfig: Record<string, unknown> = {};
  let mountedNode: Node | null = null;
  let containerEl: HTMLElement | null = null;

  const pluginCtx: PluginContext = {
    provide<T>(key: InjectionKey<T>, value: T) {
      // Will be called during setup — context scope is active
      provide(key, value);
    },
    onError(handler: (error: Error) => void) {
      errorHandlers.push(handler);
    },
    onBeforeMount(hook: () => void) {
      beforeMountHooks.push(hook);
    },
    config: appConfig,
  };

  const app: AppInstance = {
    use(plugin: Plugin) {
      plugins.push(plugin);
      return app;
    },

    config(key: string, value: unknown) {
      appConfig[key] = value;
      return app;
    },

    mount(selector: string | HTMLElement) {
      containerEl =
        typeof selector === 'string'
          ? document.querySelector<HTMLElement>(selector)
          : selector;

      if (!containerEl) {
        throw new Error(
          `[AkashJS] Mount target not found: ${selector}`,
        );
      }

      // Run plugin setup
      for (const plugin of plugins) {
        plugin.setup(pluginCtx);
      }

      // Run before-mount hooks
      for (const hook of beforeMountHooks) {
        hook();
      }

      // Render root component
      try {
        mountedNode = rootComponent((rootProps ?? {}) as any);
        containerEl.appendChild(mountedNode);
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        if (errorHandlers.length > 0) {
          for (const handler of errorHandlers) {
            handler(e);
          }
        } else {
          throw e;
        }
      }
    },

    unmount() {
      if (mountedNode && containerEl) {
        containerEl.removeChild(mountedNode);
        mountedNode = null;
      }
    },
  };

  return app;
}
