/**
 * Effect disposal and leak detection (dev mode).
 *
 * In development, tracks all created effects and verifies they
 * get properly cleaned up when components unmount. Logs warnings
 * for leaked effects that were never disposed.
 */

import type { ScheduledEffect } from './scheduler.js';

// --- Tracking state ---

let tracking = false;
const activeEffects = new Map<number, EffectRecord>();
let effectIdCounter = 0;

interface EffectRecord {
  id: number;
  createdAt: number;
  stackTrace: string | null;
  componentName: string | null;
  disposed: boolean;
}

// --- Public API ---

/**
 * Enable leak detection. Call once at app startup in dev mode.
 *
 * ```ts
 * if (import.meta.env.DEV) {
 *   enableLeakDetection();
 * }
 * ```
 */
export function enableLeakDetection(): void {
  tracking = true;
}

/**
 * Disable leak detection.
 */
export function disableLeakDetection(): void {
  tracking = false;
  activeEffects.clear();
}

/**
 * Check if leak detection is enabled.
 */
export function isLeakDetectionEnabled(): boolean {
  return tracking;
}

/**
 * Register an effect for tracking. Called internally by effect().
 * Returns an ID for later disposal tracking.
 */
export function trackEffect(componentName?: string): number {
  if (!tracking) return -1;

  const id = ++effectIdCounter;
  activeEffects.set(id, {
    id,
    createdAt: Date.now(),
    stackTrace: captureStack(),
    componentName: componentName ?? null,
    disposed: false,
  });

  return id;
}

/**
 * Mark an effect as disposed. Called internally by effect dispose function.
 */
export function untrackEffect(id: number): void {
  if (!tracking || id === -1) return;

  const record = activeEffects.get(id);
  if (record) {
    record.disposed = true;
    activeEffects.delete(id);
  }
}

/**
 * Get all currently active (undisposed) effects.
 */
export function getActiveEffects(): EffectRecord[] {
  return Array.from(activeEffects.values());
}

/**
 * Check for leaked effects and return warnings.
 * An effect is considered leaked if it's been active for longer
 * than the given threshold without being disposed.
 */
export function checkForLeaks(thresholdMs = 30000): LeakWarning[] {
  if (!tracking) return [];

  const now = Date.now();
  const warnings: LeakWarning[] = [];

  for (const record of activeEffects.values()) {
    if (!record.disposed && now - record.createdAt > thresholdMs) {
      warnings.push({
        effectId: record.id,
        age: now - record.createdAt,
        componentName: record.componentName,
        stackTrace: record.stackTrace,
      });
    }
  }

  return warnings;
}

/**
 * Log leak warnings to the console.
 */
export function reportLeaks(thresholdMs = 30000): void {
  const leaks = checkForLeaks(thresholdMs);
  if (leaks.length === 0) return;

  console.warn(
    `[AkashJS] ${leaks.length} potential effect leak(s) detected:`,
  );
  for (const leak of leaks) {
    const component = leak.componentName ? ` in ${leak.componentName}` : '';
    console.warn(
      `  Effect #${leak.effectId}${component} — active for ${(leak.age / 1000).toFixed(1)}s`,
    );
    if (leak.stackTrace) {
      console.warn(`    Created at:\n${leak.stackTrace}`);
    }
  }
}

/**
 * Get a summary of effect tracking state.
 */
export function getLeakDetectionStats(): {
  enabled: boolean;
  activeCount: number;
  totalTracked: number;
} {
  return {
    enabled: tracking,
    activeCount: activeEffects.size,
    totalTracked: effectIdCounter,
  };
}

// --- Types ---

export interface LeakWarning {
  effectId: number;
  age: number;
  componentName: string | null;
  stackTrace: string | null;
}

// --- Internal ---

function captureStack(): string | null {
  try {
    const err = new Error();
    const stack = err.stack;
    if (!stack) return null;
    // Remove first 3 lines (Error, captureStack, trackEffect)
    const lines = stack.split('\n');
    return lines.slice(3, 8).join('\n');
  } catch {
    return null;
  }
}
