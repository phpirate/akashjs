/**
 * bindSocket — declarative WebSocket ↔ query cache bridge.
 *
 * Maps server-push events to cache invalidation or direct patches.
 *
 * ```ts
 * bindSocket(ws, queryClient, {
 *   'UpdateProgram': { invalidates: ['programs'] },
 *   'ProgramStatus': {
 *     update: (event) => ({
 *       key: ['programs'],
 *       updater: (old) => old.map(p => p.id === event.id ? { ...p, ...event } : p),
 *     }),
 *   },
 *   'JoinProgram': { handler: (event) => presence.addUser(event) },
 * });
 * ```
 */

import type { Socket } from './socket.js';
import type { QueryClient } from './query.js';

// --- Types ---

type CacheKeyPrefix = string | (string | number | boolean | Record<string, unknown>)[];

export interface BindSocketRule {
  /** Invalidate queries matching these key prefixes */
  invalidates?: CacheKeyPrefix[];
  /** Directly update cached data */
  update?: (event: any) => {
    key: (string | number | boolean | Record<string, unknown>)[];
    updater: (prev: any) => any;
  };
  /** Custom handler (escape hatch) */
  handler?: (event: any) => void;
}

export interface BindSocketOptions {
  /** Extract the event type from the message (default: msg.type) */
  getType?: (msg: unknown) => string | undefined;
  /** Extract the event data from the message (default: msg itself) */
  getData?: (msg: unknown) => unknown;
}

// --- bindSocket ---

/**
 * Bind a WebSocket to a query client with declarative event → cache rules.
 * Returns an unsubscribe function.
 */
export function bindSocket(
  socket: Socket,
  client: QueryClient,
  rules: Record<string, BindSocketRule>,
  options: BindSocketOptions = {},
): () => void {
  const getType = options.getType ?? ((msg: any) => msg?.type);
  const getData = options.getData ?? ((msg: any) => msg);

  return socket.on('message', (raw) => {
    const type = getType(raw);
    if (!type || !(type in rules)) return;

    const rule = rules[type];
    const data = getData(raw);

    // Invalidation
    if (rule.invalidates) {
      for (const prefix of rule.invalidates) {
        client.invalidate(prefix);
      }
    }

    // Direct cache update
    if (rule.update) {
      const { key, updater } = rule.update(data);
      client.setQueryData(key, updater);
    }

    // Custom handler
    if (rule.handler) {
      rule.handler(data);
    }
  });
}
