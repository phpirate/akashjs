/**
 * Fine-grained reactivity system.
 *
 * Inspired by SolidJS/Preact Signals. Provides signal(), computed(),
 * effect(), and untrack() primitives with automatic dependency tracking
 * and glitch-free diamond dependency resolution.
 */

import { scheduleEffect, batch, enterBatch, exitBatch, type ScheduledEffect } from './scheduler.js';
import { recordPerfEntry, isProfiling } from './perf.js';

const __DEV__ = typeof process === 'undefined' || process.env?.NODE_ENV !== 'production';

/** Depth counter to defer effect scheduling until all notifications complete (glitch-free) */
let notifyDepth = 0;

// --- Tracking scope ---

type Subscriber = EffectNode | ComputedNode<any>;

let currentSubscriber: Subscriber | null = null;

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

interface SignalNode<T> {
  value: T;
  subscribers: Set<Subscriber>;
  equals: (a: T, b: T) => boolean;
}

export function signal<T>(
  initialValue: T,
  options?: { equals?: (a: T, b: T) => boolean },
): Signal<T> {
  const node: SignalNode<T> = {
    value: initialValue,
    subscribers: new Set(),
    equals: options?.equals ?? Object.is,
  };

  const read = (): T => {
    trackSubscriber(node);
    return node.value;
  };

  read.set = (value: T): void => {
    if (__DEV__ && currentSubscriber && currentSubscriber._tag === 'computed') {
      console.warn('[AkashJS] Writing to a signal inside computed() is not allowed. The write will be lost on the next evaluation.');
    }
    if (node.equals(node.value, value)) return;
    node.value = value;
    if (isProfiling()) recordPerfEntry('signal-update', 'signal.set', 0);
    batch(() => { notifySubscribers(node); });
  };

  read.update = (fn: (prev: T) => T): void => {
    read.set(fn(node.value));
  };

  read.peek = (): T => node.value;

  return read;
}

// --- Computed ---

const enum ComputedState {
  Clean = 0,
  Dirty = 1,
}

interface ComputedNode<T> {
  _tag: 'computed';
  fn: () => T;
  value: T | undefined;
  state: ComputedState;
  subscribers: Set<Subscriber>;
  sources: Set<SignalNode<any> | ComputedNode<any>>;
  equals: (a: T, b: T) => boolean;
}

export function computed<T>(
  fn: () => T,
  options?: { equals?: (a: T, b: T) => boolean },
): ReadonlySignal<T> {
  const node: ComputedNode<T> = {
    _tag: 'computed',
    fn,
    value: undefined,
    state: ComputedState.Dirty,
    subscribers: new Set(),
    sources: new Set(),
    equals: options?.equals ?? Object.is,
  };

  const read = (): T => {
    // Track this computed as a dependency of the current subscriber
    if (currentSubscriber) {
      node.subscribers.add(currentSubscriber);
      if ('sources' in currentSubscriber) {
        currentSubscriber.sources.add(node);
      }
    }

    if (node.state !== ComputedState.Clean) {
      recompute(node);
    }

    return node.value as T;
  };

  return read;
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
  // Without this, a computed that reads other dirty computeds can trigger
  // notifySubscribers → scheduleEffect → flush → re-enter recompute on
  // a node still in computingSet (false circular detection).
  enterBatch();

  // Clean up old source subscriptions
  for (const source of node.sources) {
    source.subscribers.delete(node);
  }
  node.sources.clear();

  const prevSubscriber = currentSubscriber;
  currentSubscriber = node;

  const _t0 = isProfiling() ? performance.now() : 0;
  try {
    const newValue = node.fn();
    const isFirst = node.value === undefined;
    const changed = isFirst || !node.equals(node.value as T, newValue);
    node.value = newValue;
    node.state = ComputedState.Clean;

    // Only propagate if value actually changed (skip first computation —
    // the effect that triggered the read is already running).
    if (changed && !isFirst) {
      if (skipEffectNotify) {
        // Only mark downstream computeds as dirty — don't schedule effects.
        // Effects are already handled by the runEffect that triggered this recompute.
        for (const sub of [...node.subscribers]) {
          if (sub._tag === 'computed') {
            sub.state = ComputedState.Dirty;
            // Recursively propagate to further computeds
            for (const sub2 of [...sub.subscribers]) {
              if (sub2._tag === 'computed') sub2.state = ComputedState.Dirty;
            }
          }
        }
      } else {
        notifySubscribers(node);
      }
    }
  } finally {
    if (_t0) recordPerfEntry('computed', 'computed', performance.now() - _t0);
    computingSet.delete(node as ComputedNode<unknown>);
    currentSubscriber = prevSubscriber;
    exitBatch();
  }
}

// --- Effect ---

interface EffectNode extends ScheduledEffect {
  _tag: 'effect';
  fn: () => void | (() => void);
  cleanup: (() => void) | null;
  sources: Set<SignalNode<any> | ComputedNode<any>>;
  disposed: boolean;
  isRender: boolean;
}

export function effect(
  fn: () => void | (() => void),
  options?: { render?: boolean },
): () => void {
  const node: EffectNode = {
    _tag: 'effect',
    fn,
    cleanup: null,
    sources: new Set(),
    disposed: false,
    isRender: options?.render ?? false,
    run() {
      runEffect(node);
    },
  };

  // Run immediately to establish dependencies
  runEffect(node);

  // Return dispose function
  return () => {
    node.disposed = true;
    cleanupEffect(node);
    for (const source of node.sources) {
      source.subscribers.delete(node);
    }
    node.sources.clear();
  };
}

function runEffect(node: EffectNode): void {
  if (node.disposed) return;

  // Before re-running, check if any dirty computed source actually changed.
  // Compare against per-effect cached values (not the shared source.value which
  // may have been updated by another effect's recompute already).
  if (node.sources.size > 0) {
    let anyChanged = false;
    for (const source of node.sources) {
      if ('_tag' in source && source._tag === 'computed') {
        if (source.state === ComputedState.Dirty) {
          recompute(source, true);
        }
        // Compare against this effect's last-seen value (not the shared source.value
        // which another effect's recompute may have already updated)
        const cachedValues = (node as any)._lastSeen as Map<unknown, unknown> | undefined;
        if (cachedValues?.has(source)) {
          const lastSeen = cachedValues.get(source);
          if (!source.equals(lastSeen as never, source.value as never)) {
            anyChanged = true;
          }
        } else {
          // No cached value — first dirty check after creation. Always run.
          anyChanged = true;
        }
      } else {
        // Plain signal source — if we got scheduled, something changed
        anyChanged = true;
      }
    }
    if (!anyChanged) return;
  }

  // Clean up previous run
  cleanupEffect(node);

  // Save old sources in case the effect throws — we need to re-subscribe
  const prevSources = new Set(node.sources);

  // Clean up old source subscriptions
  for (const source of node.sources) {
    source.subscribers.delete(node);
  }
  node.sources.clear();

  const prevSubscriber = currentSubscriber;
  currentSubscriber = node;
  const _t0 = isProfiling() ? performance.now() : 0;

  try {
    const result = node.fn();
    if (typeof result === 'function') {
      node.cleanup = result;
    }
  } catch (err) {
    // Re-subscribe to previous sources so the effect can recover on next change
    for (const source of prevSources) {
      source.subscribers.add(node);
      node.sources.add(source);
    }
    console.error('[AkashJS] Error in effect (will retry on next signal change):', err);
  } finally {
    if (_t0) recordPerfEntry('effect', 'effect', performance.now() - _t0);
    currentSubscriber = prevSubscriber;

    // Cache computed values so the next dirty check compares against THIS effect's
    // last-seen values, not the shared source.value (which another effect may update)
    const lastSeen = new Map();
    for (const source of node.sources) {
      if ('_tag' in source && source._tag === 'computed') {
        lastSeen.set(source, source.value);
      }
    }
    if (lastSeen.size > 0) (node as any)._lastSeen = lastSeen;
  }
}

function cleanupEffect(node: EffectNode): void {
  if (node.cleanup) {
    try {
      node.cleanup();
    } catch (err) {
      console.error('[AkashJS] Error in effect cleanup (ignored):', err);
    }
    node.cleanup = null;
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

    // Skip the initial effect run — only fire on actual changes
    // (pass { defer: false } to opt out and run immediately)
    if (isFirst) {
      isFirst = false;
      prevValues = values.slice();
      if (options?.defer !== false) return;
    }

    const prev = prevValues;
    prevValues = values.slice();

    // Run fn without tracking so reads inside don't create subscriptions
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
    node.subscribers.add(currentSubscriber);

    if ('sources' in currentSubscriber) {
      currentSubscriber.sources.add(node);
    }
  }
}

function notifySubscribers(
  node: SignalNode<any> | ComputedNode<any>,
): void {
  // Snapshot subscribers before iterating. Effects that run synchronously
  // during flush() will delete and re-add themselves to the Set, and JS
  // Set iterators visit newly added entries — causing an infinite loop
  // without the snapshot.
  const subs = [...node.subscribers];
  for (const sub of subs) {
    if (sub._tag === 'computed') {
      // Mark dirty. The computed will re-evaluate lazily when read.
      sub.state = ComputedState.Dirty;
      // Propagate through the computed chain to reach effects.
      // The effects will re-read the computed, triggering recompute,
      // and only update DOM if the value actually changed.
      notifySubscribers(sub);
    } else if (sub._tag === 'effect') {
      scheduleEffect(sub);
    }
  }
}
