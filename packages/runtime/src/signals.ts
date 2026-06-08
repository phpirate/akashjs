/**
 * Fine-grained reactivity system.
 *
 * Inspired by SolidJS/Preact Signals. Provides signal(), computed(),
 * effect(), and untrack() primitives with automatic dependency tracking
 * and glitch-free diamond dependency resolution.
 *
 * Optimized for minimal memory footprint:
 * - Class-based nodes for V8 hidden class sharing
 * - Lazy subscriber collections (null → single → array)
 * - Shared method functions (no per-instance closures for update/peek)
 * - Version-based dirty checking for computed
 * - Dev-only code stripped in production builds
 */

import { scheduleEffect, enterBatch, exitBatch, type ScheduledEffect } from './scheduler.js';

import { recordPerfEntry, isProfiling } from './perf.js';

const __DEV__ = typeof process === 'undefined' || process.env?.NODE_ENV !== 'production';

/** Depth counter to defer effect scheduling until all notifications complete (glitch-free) */
let notifyDepth = 0;

// --- Tracking scope ---

type Subscriber = EffectNode | ComputedNode<any>;
type SubscriberSlot = Subscriber | Subscriber[] | null;

let currentSubscriber: Subscriber | null = null;

// --- Subscriber collection helpers (lazy: null → single → array) ---

function addSubscriber(slot: SubscriberSlot, sub: Subscriber): SubscriberSlot {
  if (slot === null) return sub;
  if (Array.isArray(slot)) {
    if (slot.indexOf(sub) === -1) slot.push(sub);
    return slot;
  }
  // slot is a single subscriber
  if (slot === sub) return slot;
  return [slot, sub];
}

function removeSubscriber(slot: SubscriberSlot, sub: Subscriber): SubscriberSlot {
  if (slot === null) return null;
  if (slot === sub) return null;
  if (Array.isArray(slot)) {
    const idx = slot.indexOf(sub);
    if (idx !== -1) {
      if (slot.length === 2) return slot[1 - idx];
      slot.splice(idx, 1);
    }
    return slot;
  }
  return slot;
}

function forEachSubscriber(slot: SubscriberSlot, fn: (sub: Subscriber) => void): void {
  if (slot === null) return;
  if (Array.isArray(slot)) {
    // Snapshot to avoid mutation during iteration
    const copy = slot.slice();
    for (let i = 0; i < copy.length; i++) fn(copy[i]);
  } else {
    fn(slot);
  }
}

function hasSubscribers(slot: SubscriberSlot): boolean {
  return slot !== null;
}

// --- Signal ---

export interface Signal<T> {
  /** Read the current value (tracks dependency if inside a reactive scope) */
  (): T;
  /** Set a new value */
  set(value: T): void;
  /** Update the value using the previous value */
  update(fn: (prev: T) => T): void;
  /** Read without tracking (no dependency registered) */
  peek(): T;
}

export type ReadonlySignal<T> = () => T;

// Strategy 1: Class-based node for V8 hidden class optimization
class SignalNode<T> {
  _value: T;
  _subscribers: SubscriberSlot;
  _equals: (a: T, b: T) => boolean;
  _version: number; // Strategy 5: cheap dirty checking

  constructor(value: T, equals?: (a: T, b: T) => boolean) {
    this._value = value;
    this._subscribers = null; // Strategy 2: lazy (not new Set())
    this._equals = equals ?? Object.is;
    this._version = 0;
  }
}

// Strategy 3: Shared method functions (not per-instance closures)
function signalUpdate<T>(this: Signal<T> & { _node: SignalNode<T> }, fn: (prev: T) => T): void {
  this.set(fn(this._node._value));
}

function signalPeek<T>(this: { _node: SignalNode<T> }): T {
  return this._node._value;
}

export function signal<T>(
  initialValue: T,
  options?: { equals?: (a: T, b: T) => boolean },
): Signal<T> {
  const node = new SignalNode(initialValue, options?.equals);

  const read = (): T => {
    trackSubscriber(node);
    return node._value;
  };

  read.set = (value: T): void => {
    if (__DEV__ && currentSubscriber && (currentSubscriber as any)._tag === 'computed') {
      console.warn('[AkashJS] Writing to a signal inside computed() is not allowed. The write will be lost on the next evaluation.');
    }
    if (node._equals(node._value, value)) return;
    node._value = value;
    node._version++;
    if (__DEV__ && isProfiling()) recordPerfEntry('signal-update', 'signal.set', 0);
    // Inline batch to avoid closure allocation on every set() call
    enterBatch();
    notifySubscribers(node);
    exitBatch();
  };

  // Strategy 3: bind shared functions instead of creating per-instance closures
  (read as any)._node = node;
  read.update = signalUpdate.bind(read as any);
  read.peek = signalPeek.bind(read as any);

  return read as Signal<T>;
}

// --- Computed ---

const enum ComputedState {
  Clean = 0,
  Dirty = 1,
}

// Strategy 1: Class-based computed node
class ComputedNode<T> {
  _tag: 'computed' = 'computed';
  _fn: () => T;
  _value: T | undefined;
  _state: ComputedState;
  _subscribers: SubscriberSlot;
  _sources: (SignalNode<any> | ComputedNode<any>)[] | null;
  _equals: (a: T, b: T) => boolean;
  _version: number; // Strategy 5

  // Strategy 5: version snapshots of dependencies at last evaluation
  _depVersions: number[] | null;

  constructor(fn: () => T, equals?: (a: T, b: T) => boolean) {
    this._fn = fn;
    this._value = undefined;
    this._state = ComputedState.Dirty;
    this._subscribers = null; // lazy
    this._sources = null; // lazy
    this._equals = equals ?? Object.is;
    this._version = 0;
    this._depVersions = null;
  }
}

export function computed<T>(
  fn: () => T,
  options?: { equals?: (a: T, b: T) => boolean },
): ReadonlySignal<T> {
  const node = new ComputedNode<T>(fn, options?.equals);

  const read = (): T => {
    // Track this computed as a dependency of the current subscriber
    if (currentSubscriber) {
      node._subscribers = addSubscriber(node._subscribers, currentSubscriber);
      if ('_sources' in currentSubscriber) {
        addSource(currentSubscriber, node);
      }
    }

    if (node._state !== ComputedState.Clean) {
      // Strategy 5: check if deps actually changed via version
      if (!isDirtyByVersion(node)) {
        node._state = ComputedState.Clean;
      } else {
        recompute(node);
      }
    }

    return node._value as T;
  };

  return read;
}

// Strategy 5: version-based dirty check
function isDirtyByVersion(node: ComputedNode<any>): boolean {
  if (node._depVersions === null || node._sources === null) return true;
  const deps = node._sources;
  const versions = node._depVersions;
  if (deps.length !== versions.length) return true;
  for (let i = 0; i < deps.length; i++) {
    const dep = deps[i];
    // If a dep is a dirty computed, recompute it first to get the real version
    if (dep instanceof ComputedNode && dep._state === ComputedState.Dirty) {
      recompute(dep);
    }
    if (dep._version !== versions[i]) return true;
  }
  return false;
}

// Snapshot dependency versions after evaluation
function snapshotVersions(node: ComputedNode<any>): void {
  if (node._sources === null || node._sources.length === 0) {
    node._depVersions = null;
    return;
  }
  const deps = node._sources;
  const versions = node._depVersions = new Array(deps.length);
  for (let i = 0; i < deps.length; i++) {
    versions[i] = deps[i]._version;
  }
}

// Helper: add source to node's sources array
function addSource(sub: { _sources: (SignalNode<any> | ComputedNode<any>)[] | null }, source: SignalNode<any> | ComputedNode<any>): void {
  if (sub._sources === null) {
    sub._sources = [source];
  } else if (sub._sources.indexOf(source) === -1) {
    sub._sources.push(source);
  }
}

const computingSet = new Set<ComputedNode<unknown>>();

/**
 * @param skipEffectNotify - When true, don't schedule effects in notifySubscribers.
 *   Used when recompute is called from runEffect's dirty check — the effect is
 *   already being processed, re-scheduling it would trigger the circular run limit.
 */
function recompute<T>(node: ComputedNode<T>, skipEffectNotify = false): void {
  // Detect circular computed dependencies — only if THIS node is already being computed
  if (computingSet.has(node as ComputedNode<unknown>)) {
    throw new Error('[AkashJS] Circular dependency detected between computed values.');
  }
  computingSet.add(node as ComputedNode<unknown>);

  // Prevent effects from flushing while computed is evaluating.
  enterBatch();

  // Clean up old source subscriptions
  if (node._sources !== null) {
    for (let i = 0; i < node._sources.length; i++) {
      node._sources[i]._subscribers = removeSubscriber(node._sources[i]._subscribers, node);
    }
    node._sources = null;
  }

  const prevSubscriber = currentSubscriber;
  currentSubscriber = node;

  const _t0 = __DEV__ && isProfiling() ? performance.now() : 0;
  try {
    const newValue = node._fn();
    const isFirst = node._value === undefined && node._state === ComputedState.Dirty;
    const changed = isFirst || !node._equals(node._value as T, newValue);
    node._value = newValue;
    node._state = ComputedState.Clean;
    if (changed) node._version++;

    // Snapshot dep versions for next dirty check
    snapshotVersions(node);

    // Only propagate if value actually changed (skip first computation —
    // the effect that triggered the read is already running).
    if (changed && !isFirst) {
      if (skipEffectNotify) {
        // Only mark downstream computeds as dirty — don't schedule effects.
        forEachSubscriber(node._subscribers, (sub) => {
          if (sub._tag === 'computed') {
            (sub as ComputedNode<any>)._state = ComputedState.Dirty;
            forEachSubscriber((sub as ComputedNode<any>)._subscribers, (sub2) => {
              if (sub2._tag === 'computed') (sub2 as ComputedNode<any>)._state = ComputedState.Dirty;
            });
          }
        });
      } else {
        notifySubscribers(node);
      }
    }
  } finally {
    if (__DEV__ && _t0) recordPerfEntry('computed', 'computed', performance.now() - _t0);
    computingSet.delete(node as ComputedNode<unknown>);
    currentSubscriber = prevSubscriber;
    exitBatch();
  }
}

// --- Effect ---

// Strategy 1: Class-based effect node
class EffectNode implements ScheduledEffect {
  _tag: 'effect' = 'effect';
  _fn: () => void | (() => void);
  _cleanup: (() => void) | null;
  _sources: (SignalNode<any> | ComputedNode<any>)[] | null;
  _disposed: boolean;
  isRender: boolean;
  _lastSeen: Map<unknown, unknown> | null;

  constructor(fn: () => void | (() => void), isRender: boolean) {
    this._fn = fn;
    this._cleanup = null;
    this._sources = null; // lazy
    this._disposed = false;
    this.isRender = isRender;
    this._lastSeen = null;
  }

  run(): void {
    runEffect(this);
  }
}

// --- Effect ownership / disposal tracking ---

let currentOwner: (() => void)[] | null = null;

/**
 * Run a function and collect all effect disposers created during its execution.
 * Returns a single dispose function that cleans up all collected effects.
 * Used by <For> to track per-row effects for proper garbage collection.
 */
export function createDisposableScope(fn: () => void): () => void {
  const disposers: (() => void)[] = [];
  const prevOwner = currentOwner;
  currentOwner = disposers;
  try {
    fn();
  } finally {
    currentOwner = prevOwner;
  }
  if (disposers.length === 0) return () => {};
  if (disposers.length === 1) return disposers[0];
  return () => {
    for (let i = 0; i < disposers.length; i++) disposers[i]();
  };
}

export function effect(
  fn: () => void | (() => void),
  options?: { render?: boolean },
): () => void {
  const node = new EffectNode(fn, options?.render ?? false);

  // Run immediately to establish dependencies
  runEffect(node);

  // Return dispose function
  const dispose = () => {
    node._disposed = true;
    cleanupEffect(node);
    if (node._sources !== null) {
      for (let i = 0; i < node._sources.length; i++) {
        node._sources[i]._subscribers = removeSubscriber(node._sources[i]._subscribers, node);
      }
      node._sources = null;
    }
  };

  // Register with current owner scope (if any) for batch disposal
  if (currentOwner) currentOwner.push(dispose);

  return dispose;
}

function runEffect(node: EffectNode): void {
  if (node._disposed) return;

  // Before re-running, check if any dirty computed source actually changed.
  if (node._sources !== null && node._sources.length > 0) {
    let anyChanged = false;
    for (let i = 0; i < node._sources.length; i++) {
      const source = node._sources[i];
      if (source instanceof ComputedNode) {
        if (source._state === ComputedState.Dirty) {
          recompute(source, true);
        }
        if (node._lastSeen !== null && node._lastSeen.has(source)) {
          const lastSeen = node._lastSeen.get(source);
          if (!source._equals(lastSeen as never, source._value as never)) {
            anyChanged = true;
          }
        } else {
          anyChanged = true;
        }
      } else {
        anyChanged = true;
      }
    }
    if (!anyChanged) return;
  }

  // Clean up previous run
  cleanupEffect(node);

  // Save old sources in case the effect throws
  const prevSources = node._sources !== null ? node._sources.slice() : null;

  // Clean up old source subscriptions
  if (node._sources !== null) {
    for (let i = 0; i < node._sources.length; i++) {
      node._sources[i]._subscribers = removeSubscriber(node._sources[i]._subscribers, node);
    }
    node._sources = null;
  }

  const prevSubscriber = currentSubscriber;
  currentSubscriber = node;
  const _t0 = __DEV__ && isProfiling() ? performance.now() : 0;

  try {
    const result = node._fn();
    if (typeof result === 'function') {
      node._cleanup = result;
    }
  } catch (err) {
    // Re-subscribe to previous sources so the effect can recover on next change
    if (prevSources !== null) {
      node._sources = prevSources;
      for (let i = 0; i < prevSources.length; i++) {
        prevSources[i]._subscribers = addSubscriber(prevSources[i]._subscribers, node);
      }
    }
    console.error('[AkashJS] Error in effect (will retry on next signal change):', err);
  } finally {
    if (__DEV__ && _t0) recordPerfEntry('effect', 'effect', performance.now() - _t0);
    currentSubscriber = prevSubscriber;

    // Cache computed values for next dirty check
    if (node._sources !== null) {
      let lastSeen: Map<unknown, unknown> | null = null;
      for (let i = 0; i < node._sources.length; i++) {
        const source = node._sources[i];
        if (source instanceof ComputedNode) {
          if (lastSeen === null) lastSeen = new Map();
          lastSeen.set(source, source._value);
        }
      }
      node._lastSeen = lastSeen;
    } else {
      node._lastSeen = null;
    }
  }
}

function cleanupEffect(node: EffectNode): void {
  if (node._cleanup) {
    try {
      node._cleanup();
    } catch (err) {
      console.error('[AkashJS] Error in effect cleanup (ignored):', err);
    }
    node._cleanup = null;
  }
}

// --- Untrack ---

/** Execute a function without tracking any signal reads */
export function untrack<T>(fn: () => T): T {
  const prev = currentSubscriber;
  currentSubscriber = null;
  try {
    return fn();
  } finally {
    currentSubscriber = prev;
  }
}

// --- on() helper ---

/**
 * Create an effect callback that only tracks specific signals.
 * All other signal reads inside the callback are untracked.
 *
 * ```ts
 * effect(on(url, (currentUrl, prevUrl) => {
 *   fetch(currentUrl, options()); // options() not tracked
 * }));
 *
 * effect(on([url, page], ([u, p], prev) => {
 *   fetch(`${u}?page=${p}`);
 * }));
 * ```
 */
export function on<T>(
  dep: () => T,
  fn: (value: T, prev: T | undefined) => void | (() => void),
  options?: { defer?: boolean },
): () => void | (() => void);
export function on<T extends readonly (() => unknown)[]>(
  deps: [...T],
  fn: (values: { [K in keyof T]: ReturnType<T[K]> }, prev: { [K in keyof T]: ReturnType<T[K]> } | undefined) => void | (() => void),
  options?: { defer?: boolean },
): () => void | (() => void);
export function on(
  deps: (() => any) | (() => any)[],
  fn: (values: any, prev: any) => void | (() => void),
  options?: { defer?: boolean },
): () => void | (() => void) {
  const isArray = Array.isArray(deps);
  const depArray = isArray ? deps : [deps];
  let prevValues: unknown[] | undefined;
  let isFirst = true;

  return () => {
    // Track only the specified deps
    const values = depArray.map(d => d());

    if (isFirst) {
      isFirst = false;
      prevValues = values.slice();
      if (options?.defer !== false) return;
    }

    const prev = prevValues;
    prevValues = values.slice();

    return untrack(() => fn(
      isArray ? values : values[0],
      prev ? (isArray ? prev : prev[0]) : undefined,
    ));
  };
}

// --- Internal helpers ---

function trackSubscriber(
  node: SignalNode<any> | ComputedNode<any>,
): void {
  if (currentSubscriber) {
    node._subscribers = addSubscriber(node._subscribers, currentSubscriber);

    if ('_sources' in currentSubscriber) {
      addSource(currentSubscriber as any, node);
    }
  }
}

function notifySubscribers(
  node: SignalNode<any> | ComputedNode<any>,
): void {
  // Inlined iteration — avoids closure + array copy overhead.
  // Safe because notifySubscribers is always called inside a batch,
  // so effects are only scheduled (not flushed) during iteration.
  const slot = node._subscribers;
  if (slot === null) return;
  if (Array.isArray(slot)) {
    for (let i = 0; i < slot.length; i++) {
      const sub = slot[i];
      if (sub._tag === 'computed') {
        (sub as ComputedNode<any>)._state = ComputedState.Dirty;
        notifySubscribers(sub as ComputedNode<any>);
      } else {
        scheduleEffect(sub as unknown as ScheduledEffect);
      }
    }
  } else {
    if (slot._tag === 'computed') {
      (slot as ComputedNode<any>)._state = ComputedState.Dirty;
      notifySubscribers(slot as ComputedNode<any>);
    } else {
      scheduleEffect(slot as unknown as ScheduledEffect);
    }
  }
}
