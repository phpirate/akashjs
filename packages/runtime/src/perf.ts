/**
 * Performance profiling utilities.
 *
 * Measure component render times, signal propagation, and
 * effect execution for performance debugging.
 *
 * ```ts
 * import { startProfiling, stopProfiling, getProfile } from '@akashjs/runtime';
 *
 * startProfiling();
 * // ... do stuff ...
 * stopProfiling();
 * console.table(getProfile().entries);
 * ```
 */

// --- Types ---

export interface PerfEntry {
  type: 'render' | 'effect' | 'signal-update' | 'computed';
  name: string;
  duration: number;
  timestamp: number;
}

export interface PerfProfile {
  entries: PerfEntry[];
  totalDuration: number;
  startTime: number;
  endTime: number;
}

export interface PerfSummary {
  totalRenders: number;
  totalEffects: number;
  totalSignalUpdates: number;
  totalComputedEvals: number;
  avgRenderTime: number;
  avgEffectTime: number;
  slowestRender: PerfEntry | null;
  slowestEffect: PerfEntry | null;
}

// --- Profiling state ---

let profiling = false;
let entries: PerfEntry[] = [];
let profileStart = 0;

// --- Public API ---

/**
 * Start profiling. Clears previous data.
 */
export function startProfiling(): void {
  profiling = true;
  entries = [];
  profileStart = performance.now();
}

/**
 * Stop profiling.
 */
export function stopProfiling(): PerfProfile {
  profiling = false;
  const endTime = performance.now();

  return {
    entries: [...entries],
    totalDuration: endTime - profileStart,
    startTime: profileStart,
    endTime,
  };
}

/**
 * Check if profiling is active.
 */
export function isProfiling(): boolean {
  return profiling;
}

/**
 * Record a performance entry (called internally by the framework).
 */
export function recordPerfEntry(
  type: PerfEntry['type'],
  name: string,
  duration: number,
): void {
  if (!profiling) return;
  entries.push({
    type,
    name,
    duration,
    timestamp: performance.now(),
  });
}

/**
 * Get a summary of the profiling data.
 */
export function getProfileSummary(profile: PerfProfile): PerfSummary {
  const renders = profile.entries.filter((e) => e.type === 'render');
  const effects = profile.entries.filter((e) => e.type === 'effect');
  const signalUpdates = profile.entries.filter((e) => e.type === 'signal-update');
  const computeds = profile.entries.filter((e) => e.type === 'computed');

  const avg = (arr: PerfEntry[]) =>
    arr.length > 0 ? arr.reduce((s, e) => s + e.duration, 0) / arr.length : 0;

  const slowest = (arr: PerfEntry[]) =>
    arr.length > 0 ? arr.reduce((s, e) => (e.duration > s.duration ? e : s)) : null;

  return {
    totalRenders: renders.length,
    totalEffects: effects.length,
    totalSignalUpdates: signalUpdates.length,
    totalComputedEvals: computeds.length,
    avgRenderTime: avg(renders),
    avgEffectTime: avg(effects),
    slowestRender: slowest(renders),
    slowestEffect: slowest(effects),
  };
}

// --- Measurement helpers ---

/**
 * Measure the time to execute a function.
 *
 * ```ts
 * const { result, duration } = measureSync('my-operation', () => expensiveWork());
 * ```
 */
export function measureSync<T>(name: string, fn: () => T): { result: T; duration: number } {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  recordPerfEntry('render', name, duration);
  return { result, duration };
}

/**
 * Measure the time to execute an async function.
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  recordPerfEntry('render', name, duration);
  return { result, duration };
}

/**
 * Create a named timer for manual start/stop measurement.
 *
 * ```ts
 * const timer = createTimer('data-fetch');
 * timer.start();
 * await fetch(...);
 * timer.stop(); // records the entry
 * timer.duration; // ms
 * ```
 */
export function createTimer(name: string) {
  let startTime = 0;
  let dur = 0;

  return {
    start() { startTime = performance.now(); },
    stop() {
      dur = performance.now() - startTime;
      recordPerfEntry('render', name, dur);
    },
    get duration() { return dur; },
  };
}

/**
 * Format a profile for console output.
 */
export function formatProfile(profile: PerfProfile): string {
  const summary = getProfileSummary(profile);
  let out = '\n  Performance Profile\n';
  out += '  ' + '─'.repeat(50) + '\n';
  out += `  Duration:         ${profile.totalDuration.toFixed(1)} ms\n`;
  out += `  Renders:          ${summary.totalRenders} (avg ${summary.avgRenderTime.toFixed(2)} ms)\n`;
  out += `  Effects:          ${summary.totalEffects} (avg ${summary.avgEffectTime.toFixed(2)} ms)\n`;
  out += `  Signal updates:   ${summary.totalSignalUpdates}\n`;
  out += `  Computed evals:   ${summary.totalComputedEvals}\n`;

  if (summary.slowestRender) {
    out += `  Slowest render:   ${summary.slowestRender.name} (${summary.slowestRender.duration.toFixed(2)} ms)\n`;
  }
  if (summary.slowestEffect) {
    out += `  Slowest effect:   ${summary.slowestEffect.name} (${summary.slowestEffect.duration.toFixed(2)} ms)\n`;
  }

  out += '  ' + '─'.repeat(50) + '\n';
  return out;
}
