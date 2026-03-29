/**
 * Fine-grained reactivity system.
 *
 * Inspired by SolidJS/Preact Signals. Provides signal(), computed(),
 * effect(), and untrack() primitives with automatic dependency tracking
 * and glitch-free diamond dependency resolution.
 */

import { scheduleEffect, type ScheduledEffect } from './scheduler.js';

// --- Tracking scope ---

type Subscriber = EffectNode | ComputedNode<unknown>;

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
    if (node.equals(node.value, value)) return;
    node.value = value;
    notifySubscribers(node);
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
  sources: Set<SignalNode<unknown> | ComputedNode<unknown>>;
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

function recompute<T>(node: ComputedNode<T>): void {
  // Clean up old source subscriptions
  for (const source of node.sources) {
    source.subscribers.delete(node);
  }
  node.sources.clear();

  const prevSubscriber = currentSubscriber;
  currentSubscriber = node;

  try {
    const newValue = node.fn();
    const changed =
      node.value === undefined || !node.equals(node.value, newValue);
    node.value = newValue;
    node.state = ComputedState.Clean;

    // Only propagate if value actually changed
    if (changed) {
      notifySubscribers(node);
    }
  } finally {
    currentSubscriber = prevSubscriber;
  }
}

// --- Effect ---

interface EffectNode extends ScheduledEffect {
  _tag: 'effect';
  fn: () => void | (() => void);
  cleanup: (() => void) | null;
  sources: Set<SignalNode<unknown> | ComputedNode<unknown>>;
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
  // If all computed sources resolved to the same value, skip the re-run.
  if (node.sources.size > 0) {
    let anyChanged = false;
    for (const source of node.sources) {
      if ('_tag' in source && source._tag === 'computed') {
        if (source.state === ComputedState.Dirty) {
          const oldValue = source.value;
          recompute(source);
          if (!source.equals(oldValue as never, source.value as never)) {
            anyChanged = true;
          }
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

  // Clean up old source subscriptions
  for (const source of node.sources) {
    source.subscribers.delete(node);
  }
  node.sources.clear();

  const prevSubscriber = currentSubscriber;
  currentSubscriber = node;

  try {
    const result = node.fn();
    if (typeof result === 'function') {
      node.cleanup = result;
    }
  } finally {
    currentSubscriber = prevSubscriber;
  }
}

function cleanupEffect(node: EffectNode): void {
  if (node.cleanup) {
    node.cleanup();
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

// --- Internal helpers ---

function trackSubscriber(
  node: SignalNode<unknown> | ComputedNode<unknown>,
): void {
  if (currentSubscriber) {
    node.subscribers.add(currentSubscriber);

    if ('sources' in currentSubscriber) {
      currentSubscriber.sources.add(node);
    }
  }
}

function notifySubscribers(
  node: SignalNode<unknown> | ComputedNode<unknown>,
): void {
  for (const sub of node.subscribers) {
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
