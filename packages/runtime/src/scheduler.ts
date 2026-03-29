/**
 * Microtask-based effect scheduler with priority levels and deduplication.
 *
 * Render effects (DOM bindings) run before user effects to ensure
 * DOM is consistent before user-side effects execute.
 */

export interface ScheduledEffect {
  run(): void;
  isRender: boolean;
  /** Depth in the dependency graph (0 = root). Lower depth runs first. */
  depth?: number;
}

const pendingRender = new Set<ScheduledEffect>();
const pendingUser = new Set<ScheduledEffect>();
let flushing = false;
let batchDepth = 0;
let flushScheduled = false;

const MAX_FLUSH_ITERATIONS = 1000;

function flush(): void {
  if (flushing) return;
  flushing = true;
  flushScheduled = false;

  // Process render effects first, then user effects.
  // Effects may enqueue more effects during flush, so loop until empty.
  let iterations = 0;
  while ((pendingRender.size > 0 || pendingUser.size > 0) && iterations < MAX_FLUSH_ITERATIONS) {
    iterations++;

    // Drain render effects (sorted by depth — parents before children)
    if (pendingRender.size > 0) {
      const queue = [...pendingRender].sort(byDepth);
      pendingRender.clear();
      for (const fx of queue) {
        fx.run();
      }
    }

    // Drain user effects (sorted by depth)
    if (pendingUser.size > 0) {
      const queue = [...pendingUser].sort(byDepth);
      pendingUser.clear();
      for (const fx of queue) {
        fx.run();
      }
    }
  }

  if (iterations >= MAX_FLUSH_ITERATIONS) {
    console.error('[AkashJS] Effect flush limit reached. Possible circular dependency.');
  }

  flushing = false;
}

export function scheduleEffect(fx: ScheduledEffect): void {
  if (fx.isRender) {
    pendingRender.add(fx);
  } else {
    pendingUser.add(fx);
  }

  if (batchDepth === 0 && !flushing && !flushScheduled) {
    flushScheduled = true;
    queueMicrotask(flush);
  }
}

/**
 * Batch multiple signal writes — subscribers are notified only once
 * at the end of the batch.
 */
export function batch(fn: () => void): void {
  batchDepth++;
  try {
    fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      flush();
    }
  }
}

/** Sort effects by depth (lower depth first = parents before children) */
function byDepth(a: ScheduledEffect, b: ScheduledEffect): number {
  return (a.depth ?? 0) - (b.depth ?? 0);
}

/** Synchronously flush all pending effects. Useful for testing. */
export function flushSync(): void {
  flush();
}
