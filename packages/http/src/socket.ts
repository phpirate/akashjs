/**
 * WebSocket client with signal integration.
 *
 * ```ts
 * const ws = createSocket('wss://api.example.com/ws', {
 *   autoReconnect: true,
 *   maxRetries: 5,
 * });
 *
 * ws.status();   // 'connecting' | 'open' | 'closed' | 'error'
 * ws.on('message', (data) => { ... });
 * ws.send({ type: 'subscribe', channel: 'updates' });
 * ws.close();
 * ```
 */

import { signal } from '@akashjs/runtime';
import type { ReadonlySignal } from '@akashjs/runtime';

// --- Types ---

export type SocketStatus = 'connecting' | 'open' | 'closed' | 'error';

export interface SocketOptions {
  /** Auto-reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
  /** Max reconnect attempts (default: Infinity) */
  maxRetries?: number;
  /** Initial reconnect delay in ms (default: 1000) */
  reconnectDelay?: number;
  /** Max reconnect delay in ms with exponential backoff (default: 30000) */
  maxReconnectDelay?: number;
  /** WebSocket protocols */
  protocols?: string | string[];
  /** Serialize messages (default: JSON.stringify) */
  serialize?: (data: unknown) => string;
  /** Deserialize messages (default: JSON.parse) */
  deserialize?: (data: string) => unknown;
}

export type SocketEventMap = {
  message: unknown;
  open: Event;
  close: CloseEvent;
  error: Event;
};

type SocketListener<K extends keyof SocketEventMap> = (data: SocketEventMap[K]) => void;

export interface Socket {
  /** Connection status (reactive signal) */
  status: ReadonlySignal<SocketStatus>;
  /** Send a message (auto-serialized) */
  send(data: unknown): void;
  /** Listen for events */
  on<K extends keyof SocketEventMap>(event: K, listener: SocketListener<K>): () => void;
  /** Close the connection */
  close(code?: number, reason?: string): void;
  /** Manually reconnect */
  reconnect(): void;
  /** Dispose — close and stop reconnecting */
  dispose(): void;
}

// --- createSocket ---

/**
 * Create a WebSocket client with auto-reconnect and signal integration.
 */
export function createSocket(url: string, options: SocketOptions = {}): Socket {
  const {
    autoReconnect = true,
    maxRetries = Infinity,
    reconnectDelay = 1000,
    maxReconnectDelay = 30000,
    protocols,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
  } = options;

  const status = signal<SocketStatus>('connecting');
  let ws: WebSocket | null = null;
  let retryCount = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  const listeners: { [K in keyof SocketEventMap]?: Set<SocketListener<K>> } = {};

  function emit<K extends keyof SocketEventMap>(event: K, data: SocketEventMap[K]): void {
    const set = listeners[event] as Set<SocketListener<K>> | undefined;
    if (set) {
      for (const fn of set) {
        fn(data);
      }
    }
  }

  function connect(): void {
    if (disposed) return;

    status.set('connecting');
    ws = new WebSocket(url, protocols);

    ws.onopen = (e) => {
      status.set('open');
      retryCount = 0;
      emit('open', e);
    };

    ws.onmessage = (e) => {
      try {
        const data = deserialize(e.data);
        emit('message', data);
      } catch {
        emit('message', e.data);
      }
    };

    ws.onclose = (e) => {
      status.set('closed');
      emit('close', e);

      if (autoReconnect && !disposed && retryCount < maxRetries) {
        const delay = Math.min(
          reconnectDelay * Math.pow(2, retryCount),
          maxReconnectDelay,
        );
        retryCount++;
        retryTimer = setTimeout(connect, delay);
      }
    };

    ws.onerror = (e) => {
      status.set('error');
      emit('error', e);
    };
  }

  // Initial connection
  connect();

  return {
    status: () => status(),

    send(data: unknown): void {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(serialize(data));
      }
    },

    on<K extends keyof SocketEventMap>(event: K, listener: SocketListener<K>): () => void {
      if (!listeners[event]) {
        listeners[event] = new Set() as any;
      }
      (listeners[event] as Set<SocketListener<K>>).add(listener);
      return () => {
        (listeners[event] as Set<SocketListener<K>>).delete(listener);
      };
    },

    close(code?: number, reason?: string): void {
      if (retryTimer) clearTimeout(retryTimer);
      ws?.close(code, reason);
    },

    reconnect(): void {
      if (retryTimer) clearTimeout(retryTimer);
      retryCount = 0;
      ws?.close();
      connect();
    },

    dispose(): void {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      ws?.close();
    },
  };
}
