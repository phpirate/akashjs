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
let reflushNeeded = false;

const MAX_EFFECT_RUNS = 3;
const MAX_FLUSH_ITERATIONS = 100;

function flush(): void {
  if (flushing) return;
  flushing = true;
  flushScheduled = false;

  // Fresh per-effect run counter for THIS flush — reset every time
  const runCounts = new Map<ScheduledEffect, number>();
  let circularDetected = false;

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
        const count = (runCounts.get(fx) ?? 0) + 1;
        runCounts.set(fx, count);
        if (count > MAX_EFFECT_RUNS) {
          circularDetected = true;
          continue; // skip this effect — it's in a cycle
        }
        fx.run();
      }
    }

    // Drain user effects (sorted by depth)
    if (pendingUser.size > 0) {
      const queue = [...pendingUser].sort(byDepth);
      pendingUser.clear();
      for (const fx of queue) {
        const count = (runCounts.get(fx) ?? 0) + 1;
        runCounts.set(fx, count);
        if (count > MAX_EFFECT_RUNS) {
          circularDetected = true;
          continue; // skip this effect — it's in a cycle
        }
        fx.run();
      }
    }

    // If all remaining effects were skipped due to cycle detection, break
    if (circularDetected && pendingRender.size === 0 && pendingUser.size === 0) {
      break;
    }
  }

  if (circularDetected || iterations >= MAX_FLUSH_ITERATIONS) {
    pendingRender.clear();
    pendingUser.clear();
    console.error(
      '[AkashJS] Circular dependency detected between effects. ' +
      'Two or more effects are writing to each other\'s dependencies. ' +
      'The cycle has been broken after ' + iterations + ' iterations.'
    );
  }

  flushing = false;

  // If effects were scheduled during the tail end of this flush (after the
  // while loop's condition was last checked), re-flush them now.
  if (reflushNeeded) {
    reflushNeeded = false;
    if (pendingRender.size > 0 || pendingUser.size > 0) {
      flush();
    }
  }
}

export function scheduleEffect(fx: ScheduledEffect): void {
  if (fx.isRender) {
    pendingRender.add(fx);
  } else {
    pendingUser.add(fx);
  }

  if (batchDepth === 0 && !flushing) {
    flush();
  } else if (flushing) {
    // Effects were added during a flush. The while loop may still pick them
    // up, but if it has already checked the queues and found them empty,
    // we need a re-flush after the current one completes.
    reflushNeeded = true;
  }
}

/**
 * Batch multiple signal writes — subscribers are notified only once
 * at the end of the batch.
 */
export function batch<T>(fn: () => T): T {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      flush();
    }
  }
}

/** Enter/exit batch depth — used by computed recompute to prevent mid-evaluation flush */
export function enterBatch(): void { batchDepth++; }
export function exitBatch(): void {
  batchDepth--;
  if (batchDepth === 0) flush();
}

/** Sort effects by depth (lower depth first = parents before children) */
function byDepth(a: ScheduledEffect, b: ScheduledEffect): number {
  return (a.depth ?? 0) - (b.depth ?? 0);
}

/** Synchronously flush all pending effects. Useful for testing. */
export function flushSync(): void {
  flush();
}
