/**
 * Collaborative signals with CRDT.
 *
 * Make any signal multiplayer with one line. Multiple users can
 * edit the same state simultaneously with automatic conflict
 * resolution via Last-Writer-Wins Register and Operation-based CRDTs.
 *
 * ```ts
 * const doc = createSync('doc-123', {
 *   title: '',
 *   blocks: [],
 *   cursor: { x: 0, y: 0 },
 * });
 *
 * doc.state.title.set('Hello'); // syncs to all peers
 * doc.peers();                  // list of connected users
 * doc.presence.set({ cursor: { x: 10, y: 20 } });
 * ```
 */

import { signal, computed } from './signals.js';
import type { Signal, ReadonlySignal } from './signals.js';

// =========================================================================
// CRDT — Last-Writer-Wins Register
// =========================================================================

export interface LWWEntry<T> {
  value: T;
  timestamp: number;
  peerId: string;
}

/**
 * Last-Writer-Wins Register — simplest CRDT for single values.
 * The write with the highest timestamp wins on conflict.
 */
export class LWWRegister<T> {
  private entry: LWWEntry<T>;

  constructor(initialValue: T, peerId: string) {
    this.entry = { value: initialValue, timestamp: Date.now(), peerId };
  }

  get value(): T {
    return this.entry.value;
  }

  get timestamp(): number {
    return this.entry.timestamp;
  }

  set(value: T, peerId: string): boolean {
    const ts = Date.now();
    // Local writes always succeed (same peer always advances its own state).
    // Cross-peer conflicts resolve by highest timestamp, then peerId tiebreak.
    if (
      peerId === this.entry.peerId ||
      ts > this.entry.timestamp ||
      (ts === this.entry.timestamp && peerId > this.entry.peerId)
    ) {
      this.entry = { value, timestamp: Math.max(ts, this.entry.timestamp + 1), peerId };
      return true;
    }
    return false;
  }

  merge(remote: LWWEntry<T>): boolean {
    if (
      remote.timestamp > this.entry.timestamp ||
      (remote.timestamp === this.entry.timestamp && remote.peerId > this.entry.peerId)
    ) {
      this.entry = remote;
      return true;
    }
    return false;
  }

  toEntry(): LWWEntry<T> {
    return { ...this.entry };
  }
}

// =========================================================================
// Operation log for list CRDTs
// =========================================================================

export type SyncOp =
  | { type: 'set'; key: string; value: unknown; timestamp: number; peerId: string }
  | { type: 'insert'; key: string; index: number; value: unknown; timestamp: number; peerId: string }
  | { type: 'delete'; key: string; index: number; timestamp: number; peerId: string };

// =========================================================================
// Sync transport interface
// =========================================================================

export interface SyncTransport {
  /** Send an operation to peers */
  send(op: SyncOp): void;
  /** Listen for operations from peers */
  onReceive(handler: (op: SyncOp) => void): () => void;
  /** Listen for peer presence updates */
  onPresence?(handler: (peerId: string, data: unknown) => void): () => void;
  /** Send presence data */
  sendPresence?(data: unknown): void;
  /** Connect to the sync channel */
  connect(): void;
  /** Disconnect */
  disconnect(): void;
}

// =========================================================================
// WebSocket transport
// =========================================================================

export interface WebSocketTransportOptions {
  url: string;
  room: string;
  protocols?: string | string[];
}

export function createWebSocketTransport(options: WebSocketTransportOptions): SyncTransport {
  let ws: WebSocket | null = null;
  const opHandlers: Array<(op: SyncOp) => void> = [];
  const presenceHandlers: Array<(peerId: string, data: unknown) => void> = [];

  return {
    send(op: SyncOp) {
      ws?.send(JSON.stringify({ type: 'op', room: options.room, ...op }));
    },
    onReceive(handler) {
      opHandlers.push(handler);
      let removed = false;
      return () => {
        if (removed) return;
        removed = true;
        const i = opHandlers.indexOf(handler);
        if (i !== -1) opHandlers.splice(i, 1);
      };
    },
    onPresence(handler) {
      presenceHandlers.push(handler);
      return () => {
        const i = presenceHandlers.indexOf(handler);
        if (i !== -1) presenceHandlers.splice(i, 1);
      };
    },
    sendPresence(data) {
      ws?.send(JSON.stringify({ type: 'presence', room: options.room, data }));
    },
    connect() {
      ws = new WebSocket(options.url, options.protocols);
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'op') {
            for (const h of opHandlers) h(msg);
          } else if (msg.type === 'presence') {
            for (const h of presenceHandlers) h(msg.peerId, msg.data);
          }
        } catch { /* ignore parse errors */ }
      };
      ws.onopen = () => {
        ws?.send(JSON.stringify({ type: 'join', room: options.room }));
      };
    },
    disconnect() {
      ws?.close();
      ws = null;
    },
  };
}

// =========================================================================
// In-memory transport (for testing / single-tab)
// =========================================================================

export function createLocalTransport(): SyncTransport {
  const opHandlers: Array<(op: SyncOp) => void> = [];
  return {
    send(op) {
      for (const h of opHandlers) h(op);
    },
    onReceive(handler) {
      opHandlers.push(handler);
      let removed = false;
      return () => {
        if (removed) return;
        removed = true;
        const i = opHandlers.indexOf(handler);
        if (i !== -1) opHandlers.splice(i, 1);
      };
    },
    connect() {},
    disconnect() {},
  };
}

// =========================================================================
// createSync — the main API
// =========================================================================

export interface SyncOptions {
  /** Transport for sending/receiving operations */
  transport?: SyncTransport;
  /** Unique peer ID (default: random) */
  peerId?: string;
}

export interface SyncDoc<T extends Record<string, unknown>> {
  /** Reactive synced state — each key is a Signal */
  state: { [K in keyof T]: Signal<T[K]> };
  /** Connected peers (reactive) */
  peers: ReadonlySignal<PeerInfo[]>;
  /** Local presence data */
  presence: Signal<Record<string, unknown>>;
  /** Peer presence map (reactive) */
  peerPresence: ReadonlySignal<Map<string, unknown>>;
  /** This peer's ID */
  peerId: string;
  /** Whether connected */
  connected: ReadonlySignal<boolean>;
  /** Connect to the sync channel */
  connect(): void;
  /** Disconnect */
  disconnect(): void;
  /** Dispose the sync doc */
  dispose(): void;
}

export interface PeerInfo {
  id: string;
  joinedAt: number;
}

let peerIdCounter = 0;

/**
 * Create a collaborative synced document.
 *
 * ```ts
 * const doc = createSync('room-1', { title: '', count: 0 }, {
 *   transport: createWebSocketTransport({ url: 'wss://sync.example.com', room: 'room-1' }),
 * });
 *
 * doc.state.title.set('Hello'); // auto-syncs to all peers
 * doc.peers();                  // connected users
 * ```
 */
export function createSync<T extends Record<string, unknown>>(
  roomId: string,
  initialState: T,
  options: SyncOptions = {},
): SyncDoc<T> {
  const peerId = options.peerId ?? `peer-${++peerIdCounter}-${Date.now()}`;
  const transport = options.transport ?? createLocalTransport();

  // Create CRDT registers and signals for each state key
  const registers = new Map<string, LWWRegister<unknown>>();
  const stateSignals: Record<string, Signal<unknown>> = {};

  for (const [key, value] of Object.entries(initialState)) {
    registers.set(key, new LWWRegister(value, peerId));
    stateSignals[key] = signal(value);
  }

  // Intercept signal.set to broadcast operations
  const state = {} as { [K in keyof T]: Signal<T[K]> };
  for (const key of Object.keys(initialState)) {
    const original = stateSignals[key];
    const register = registers.get(key)!;

    const proxy: Signal<any> = (() => original()) as any;
    proxy.set = (value: any) => {
      register.set(value, peerId);
      original.set(value);
      transport.send({
        type: 'set',
        key,
        value,
        timestamp: register.timestamp,
        peerId,
      });
    };
    proxy.update = (fn: (prev: any) => any) => {
      proxy.set(fn(original()));
    };
    proxy.peek = () => original.peek();

    (state as any)[key] = proxy;
  }

  // Peers
  const peers = signal<PeerInfo[]>([]);
  const connected = signal(false);
  const presence = signal<Record<string, unknown>>({});
  const peerPresenceMap = signal(new Map<string, unknown>());

  // Listen for remote operations
  const unsubOps = transport.onReceive((op) => {
    if (op.type === 'set' && registers.has(op.key)) {
      const register = registers.get(op.key)!;
      const merged = register.merge({
        value: op.value,
        timestamp: op.timestamp,
        peerId: op.peerId,
      });
      if (merged) {
        stateSignals[op.key].set(op.value);
      }
    }
  });

  // Listen for presence
  const unsubPresence = transport.onPresence?.((remotePeerId, data) => {
    peerPresenceMap.update((map) => {
      const next = new Map(map);
      next.set(remotePeerId, data);
      return next;
    });
  });

  return {
    state,
    peers: () => peers(),
    presence,
    peerPresence: () => peerPresenceMap(),
    peerId,
    connected: () => connected(),
    connect() {
      transport.connect();
      connected.set(true);
    },
    disconnect() {
      transport.disconnect();
      connected.set(false);
    },
    dispose() {
      unsubOps();
      unsubPresence?.();
      transport.disconnect();
    },
  };
}
