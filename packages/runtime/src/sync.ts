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
      (remote.timestamp === this.entry.timestamp && (
        !remote.peerId || !this.entry.peerId || remote.peerId >= this.entry.peerId
      ))
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
  /** Send presence data (peerId passed by createSync internals) */
  sendPresence?(data: unknown, peerId?: string): void;
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
      ws?.send(JSON.stringify({ ...op, type: 'op', room: options.room }));
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
  const presenceHandlers: Array<(peerId: string, data: unknown) => void> = [];
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
    sendPresence(data, senderPeerId?: string) {
      for (const h of presenceHandlers) h(senderPeerId ?? 'unknown', data);
    },
    onPresence(handler) {
      presenceHandlers.push(handler);
      let removed = false;
      return () => {
        if (removed) return;
        removed = true;
        const i = presenceHandlers.indexOf(handler);
        if (i !== -1) presenceHandlers.splice(i, 1);
      };
    },
    connect() {},
    disconnect() {},
  };
}

// =========================================================================
// createSync — the main API
// =========================================================================

export interface SyncConflict {
  key: string;
  localValue: unknown;
  remoteValue: unknown;
  localTimestamp: number;
  remoteTimestamp: number;
  remotePeerId: string;
}

export interface SyncOptions {
  /** Transport for sending/receiving operations */
  transport?: SyncTransport;
  /** Unique peer ID (default: random) */
  peerId?: string;
  /** Initial presence data — broadcast on connect */
  presence?: Record<string, unknown>;
  /** Custom conflict resolver. Return the winning value, or undefined to queue for manual resolution. */
  onConflict?: (conflict: SyncConflict) => unknown | undefined;
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
  /** Unresolved conflicts (reactive) */
  conflicts: ReadonlySignal<SyncConflict[]>;
  /** Resolve a conflict by choosing a value for a key */
  resolveConflict: (key: string, value: unknown) => void;
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
  initialState: T,
  options?: SyncOptions,
): SyncDoc<T>;
export function createSync<T extends Record<string, unknown>>(
  roomIdOrState: string | T,
  stateOrOptions?: T | SyncOptions,
  maybeOptions?: SyncOptions,
): SyncDoc<T> {
  // Support both old (roomId, state, options) and new (state, options) signatures
  let initialState: T;
  let options: SyncOptions;
  if (typeof roomIdOrState === 'string') {
    initialState = stateOrOptions as T;
    options = maybeOptions ?? {};
  } else {
    initialState = roomIdOrState;
    options = (stateOrOptions as SyncOptions) ?? {};
  }
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
  const presence = signal<Record<string, unknown>>(options.presence ?? {});
  const peerPresenceMap = signal(new Map<string, unknown>());

  // Conflict tracking
  const conflictsSignal = signal<SyncConflict[]>([]);

  function resolveConflict(key: string, value: unknown): void {
    // Apply the resolved value
    if (key in stateSignals) {
      stateSignals[key].set(value);
      const register = registers.get(key);
      if (register) register.set(value, peerId);
      // Broadcast the resolution
      transport.send({ type: 'set', key, value, timestamp: Date.now(), peerId });
    }
    // Remove from conflicts list
    conflictsSignal.update(list => list.filter(c => c.key !== key));
  }

  // Listen for remote operations
  const unsubOps = transport.onReceive((op) => {
    if (op.type === 'set' && registers.has(op.key)) {
      const register = registers.get(op.key)!;
      const localValue = register.value;
      const localTimestamp = register.timestamp;

      // Check for conflict: remote write to a key we also recently wrote
      const isConflict = options.onConflict && localTimestamp > 0 &&
        Math.abs(op.timestamp - localTimestamp) < 1000 && // within 1s window
        op.peerId !== peerId;

      if (isConflict) {
        const conflict: SyncConflict = {
          key: op.key,
          localValue,
          remoteValue: op.value,
          localTimestamp,
          remoteTimestamp: op.timestamp,
          remotePeerId: op.peerId,
        };
        let resolved: unknown;
        try {
          resolved = options.onConflict!(conflict);
        } catch (err) {
          console.warn('[AkashJS Sync] onConflict handler threw, falling back to LWW:', err);
          // Fallback to standard LWW merge
          const merged = register.merge({ value: op.value, timestamp: op.timestamp, peerId: op.peerId });
          if (merged) stateSignals[op.key].set(op.value);
          resolved = '__fallback__';
        }
        if (resolved === '__fallback__') {
          // Already handled by LWW fallback above
        } else if (resolved !== undefined) {
          register.set(resolved, peerId);
          stateSignals[op.key].set(resolved);
          transport.send({ type: 'set', key: op.key, value: resolved, timestamp: Date.now(), peerId });
        } else {
          conflictsSignal.update(list => [...list, conflict]);
        }
      } else {
        // No conflict handler or no conflict — standard LWW merge
        const merged = register.merge({
          value: op.value,
          timestamp: op.timestamp,
          peerId: op.peerId,
        });
        if (merged) {
          stateSignals[op.key].set(op.value);
        }
      }
    }
  });

  // Intercept presence.set to broadcast with peerId
  const originalPresenceSet = presence.set;
  presence.set = (data: Record<string, unknown>) => {
    originalPresenceSet.call(presence, data);
    transport.sendPresence?.(data, peerId);
  };

  // Listen for presence — filter out self
  const unsubPresence = transport.onPresence?.((remotePeerId, data) => {
    if (remotePeerId === peerId) return; // ignore own presence
    peerPresenceMap.update((map) => {
      const next = new Map(map);
      if (data === null) {
        next.delete(remotePeerId); // peer disconnected
      } else {
        next.set(remotePeerId, data);
      }
      return next;
    });
  });

  return {
    state,
    peers: () => peers(),
    presence,
    peerPresence: () => peerPresenceMap(),
    conflicts: () => conflictsSignal(),
    resolveConflict,
    peerId,
    connected: () => connected(),
    connect() {
      transport.connect();
      connected.set(true);
      // Broadcast initial presence on connect
      const p = presence();
      if (Object.keys(p).length > 0) {
        transport.sendPresence?.(p, peerId);
      }
    },
    disconnect() {
      // Broadcast null presence to signal departure
      transport.sendPresence?.(null, peerId);
      transport.disconnect();
      connected.set(false);
    },
    dispose() {
      transport.sendPresence?.(null, peerId);
      unsubOps();
      unsubPresence?.();
      transport.disconnect();
    },
  };
}

// =========================================================================
// Presence composables
// =========================================================================

/**
 * Track cursor position and broadcast via sync presence.
 * Throttles updates to avoid flooding the transport.
 *
 * ```ts
 * const cursor = useCursor(doc, { throttle: 50 });
 * // Automatically tracks mousemove and broadcasts { cursor: { x, y } }
 * // Other peers: doc.peerPresence().get(peerId).cursor
 * ```
 */
export function useCursor(
  doc: SyncDoc<any>,
  options?: { throttle?: number; target?: HTMLElement },
): { x: ReadonlySignal<number>; y: ReadonlySignal<number>; dispose: () => void } {
  const throttleMs = options?.throttle ?? 50;
  const target = options?.target ?? (typeof document !== 'undefined' ? document : null);
  const x = signal(0);
  const y = signal(0);
  let lastSend = 0;
  let pending: ReturnType<typeof setTimeout> | null = null;

  function onMove(e: MouseEvent): void {
    x.set(e.clientX);
    y.set(e.clientY);

    const now = Date.now();
    if (now - lastSend >= throttleMs) {
      lastSend = now;
      doc.presence.set({ ...doc.presence.peek?.() ?? {}, cursor: { x: e.clientX, y: e.clientY } });
    } else if (!pending) {
      pending = setTimeout(() => {
        pending = null;
        lastSend = Date.now();
        doc.presence.set({ ...doc.presence.peek?.() ?? {}, cursor: { x: x.peek(), y: y.peek() } });
      }, throttleMs - (now - lastSend));
    }
  }

  target?.addEventListener?.('mousemove', onMove as EventListener);

  return {
    x: () => x(),
    y: () => y(),
    dispose() {
      target?.removeEventListener?.('mousemove', onMove as EventListener);
      if (pending) clearTimeout(pending);
    },
  };
}

/**
 * Typing indicator — broadcasts typing state with auto-timeout.
 *
 * ```ts
 * const typing = useTypingIndicator(doc, { timeout: 2000 });
 * typing.start();  // broadcasts { typing: true }
 * // Auto-stops after 2s of inactivity
 * typing.stop();   // manual stop
 *
 * // Other peers typing:
 * typing.othersTyping(); // string[] of peer IDs currently typing
 * ```
 */
export function useTypingIndicator(
  doc: SyncDoc<any>,
  options?: { timeout?: number },
): {
  isTyping: ReadonlySignal<boolean>;
  othersTyping: ReadonlySignal<string[]>;
  start: () => void;
  stop: () => void;
} {
  const timeout = options?.timeout ?? 2000;
  const isTyping = signal(false);
  let timer: ReturnType<typeof setTimeout> | null = null;

  function start(): void {
    isTyping.set(true);
    doc.presence.set({ ...doc.presence.peek?.() ?? {}, typing: true });
    if (timer) clearTimeout(timer);
    timer = setTimeout(stop, timeout);
  }

  function stop(): void {
    isTyping.set(false);
    doc.presence.set({ ...doc.presence.peek?.() ?? {}, typing: false });
    if (timer) { clearTimeout(timer); timer = null; }
  }

  const othersTyping = computed(() => {
    const peers = doc.peerPresence();
    const typing: string[] = [];
    if (peers instanceof Map) {
      for (const [id, data] of peers) {
        if (data && typeof data === 'object' && (data as any).typing) {
          typing.push(id);
        }
      }
    }
    return typing;
  });

  return {
    isTyping: () => isTyping(),
    othersTyping,
    start,
    stop,
  };
}
