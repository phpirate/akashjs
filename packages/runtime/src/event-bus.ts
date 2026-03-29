/**
 * Event bus — typed pub/sub for cross-component communication.
 *
 * Fire-and-forget events between unrelated components without
 * prop drilling or context coupling.
 *
 * ```ts
 * const bus = createEventBus<{
 *   'user:login': { userId: string };
 *   'cart:updated': { itemCount: number };
 *   'notification': string;
 * }>();
 *
 * // Subscribe
 * bus.on('user:login', ({ userId }) => fetchProfile(userId));
 *
 * // Emit from anywhere
 * bus.emit('user:login', { userId: '123' });
 *
 * // One-time listener
 * bus.once('cart:updated', ({ itemCount }) => showBadge(itemCount));
 * ```
 */

// =========================================================================
// Types
// =========================================================================

export type EventMap = Record<string, unknown>;
export type EventHandler<T = unknown> = (data: T) => void;

export interface EventBus<T extends EventMap> {
  /** Subscribe to an event */
  on<K extends keyof T & string>(event: K, handler: EventHandler<T[K]>): () => void;
  /** Subscribe once — auto-removes after first call */
  once<K extends keyof T & string>(event: K, handler: EventHandler<T[K]>): () => void;
  /** Emit an event to all listeners */
  emit<K extends keyof T & string>(event: K, data: T[K]): void;
  /** Remove a specific handler */
  off<K extends keyof T & string>(event: K, handler: EventHandler<T[K]>): void;
  /** Remove all handlers for an event (or all events) */
  clear(event?: keyof T & string): void;
  /** Get listener count for an event */
  listenerCount(event: keyof T & string): number;
  /** Check if an event has listeners */
  hasListeners(event: keyof T & string): boolean;
}

// =========================================================================
// createEventBus
// =========================================================================

/**
 * Create a typed event bus.
 *
 * ```ts
 * const bus = createEventBus<{
 *   'theme:change': 'light' | 'dark';
 *   'toast': { message: string; type: string };
 * }>();
 * ```
 */
export function createEventBus<T extends EventMap = Record<string, unknown>>(): EventBus<T> {
  const listeners = new Map<string, Set<EventHandler>>();

  function getSet(event: string): Set<EventHandler> {
    let set = listeners.get(event);
    if (!set) {
      set = new Set();
      listeners.set(event, set);
    }
    return set;
  }

  return {
    on<K extends keyof T & string>(event: K, handler: EventHandler<T[K]>): () => void {
      getSet(event).add(handler as EventHandler);
      return () => getSet(event).delete(handler as EventHandler);
    },

    once<K extends keyof T & string>(event: K, handler: EventHandler<T[K]>): () => void {
      const wrapper: EventHandler<T[K]> = (data) => {
        getSet(event).delete(wrapper as EventHandler);
        handler(data);
      };
      getSet(event).add(wrapper as EventHandler);
      return () => getSet(event).delete(wrapper as EventHandler);
    },

    emit<K extends keyof T & string>(event: K, data: T[K]): void {
      const set = listeners.get(event);
      if (set) {
        for (const handler of Array.from(set)) {
          handler(data);
        }
      }
    },

    off<K extends keyof T & string>(event: K, handler: EventHandler<T[K]>): void {
      getSet(event).delete(handler as EventHandler);
    },

    clear(event?: keyof T & string): void {
      if (event) {
        listeners.delete(event);
      } else {
        listeners.clear();
      }
    },

    listenerCount(event: keyof T & string): number {
      return listeners.get(event)?.size ?? 0;
    },

    hasListeners(event: keyof T & string): boolean {
      return (listeners.get(event)?.size ?? 0) > 0;
    },
  };
}

// =========================================================================
// Global bus singleton
// =========================================================================

let globalBus: EventBus<any> | null = null;

/**
 * Get the global event bus (created on first call).
 *
 * ```ts
 * import { globalEventBus } from '@akashjs/runtime';
 *
 * // In component A:
 * globalEventBus().emit('notification', 'Hello!');
 *
 * // In component B:
 * globalEventBus().on('notification', (msg) => show(msg));
 * ```
 */
export function globalEventBus<T extends EventMap = Record<string, unknown>>(): EventBus<T> {
  if (!globalBus) {
    globalBus = createEventBus<T>();
  }
  return globalBus as EventBus<T>;
}
