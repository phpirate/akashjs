/**
 * Benchmark runner — execute and report results.
 *
 * Run with: npx tsx benchmark/run.ts
 *
 * IMPORTANT: These benchmarks measure DATA OPERATIONS ONLY (create,
 * mutate, filter arrays), NOT DOM rendering. They run in Node.js
 * without a browser. For real DOM rendering benchmarks, use the
 * js-framework-benchmark harness in a browser.
 *
 * What these DO measure:
 * - Signal creation and propagation speed
 * - Array manipulation performance
 * - Memory usage under load
 *
 * What these DON'T measure:
 * - DOM creation/patching time
 * - Layout/paint cost
 * - Hydration performance
 * - Real user interaction latency
 */

import { runBenchmarks, formatResults, buildData } from './index.js';
import { signal, computed, effect } from '../packages/runtime/src/signals.js';
import { batch, flushSync } from '../packages/runtime/src/scheduler.js';

console.log('\n  AkashJS Benchmark Suite');
console.log('  ══════════════════════════════════════════\n');

// =========================================================================
// 1. Data operations (js-framework-benchmark style)
// =========================================================================

console.log('  1. Data Operations (array create/mutate/filter)');
console.log('  ──────────────────────────────────────────\n');

const results = runBenchmarks();
console.log(formatResults(results));

const total = results.reduce((sum, r) => sum + r.duration, 0);
console.log(`  Total: ${total.toFixed(2)} ms\n`);

// =========================================================================
// 2. Signal performance
// =========================================================================

console.log('  2. Signal Performance');
console.log('  ──────────────────────────────────────────\n');

// Create N signals
function benchSignalCreation(n: number): number {
  const start = performance.now();
  const signals = [];
  for (let i = 0; i < n; i++) {
    signals.push(signal(i));
  }
  return performance.now() - start;
}

// Update signals and measure propagation
function benchSignalPropagation(n: number): number {
  const source = signal(0);
  const computeds = [];
  for (let i = 0; i < n; i++) {
    computeds.push(computed(() => source() + i));
  }

  const start = performance.now();
  for (let i = 0; i < 1000; i++) {
    source.set(i);
    // Read all computeds to trigger evaluation
    for (const c of computeds) c();
  }
  return performance.now() - start;
}

// Diamond dependency (A -> B, A -> C, B+C -> D)
function benchDiamondDeps(depth: number): number {
  const root = signal(0);
  let left: any = root;
  let right: any = root;

  for (let i = 0; i < depth; i++) {
    const l = left;
    const r = right;
    left = computed(() => l() + 1);
    right = computed(() => r() + 1);
  }

  const diamond = computed(() => left() + right());

  const start = performance.now();
  for (let i = 0; i < 1000; i++) {
    root.set(i);
    diamond(); // Trigger evaluation
  }
  return performance.now() - start;
}

// Batch updates
function benchBatch(n: number): number {
  const signals = Array.from({ length: n }, (_, i) => signal(i));
  const sum = computed(() => signals.reduce((acc, s) => acc + s(), 0));

  const start = performance.now();
  for (let iter = 0; iter < 100; iter++) {
    batch(() => {
      for (const s of signals) {
        s.set(s() + 1);
      }
    });
    sum(); // Trigger evaluation
  }
  return performance.now() - start;
}

// Effect creation and disposal
function benchEffects(n: number): number {
  const source = signal(0);
  const disposers: Array<() => void> = [];

  const start = performance.now();
  for (let i = 0; i < n; i++) {
    disposers.push(effect(() => { source(); }));
  }
  flushSync();

  // Update and flush
  source.set(1);
  flushSync();

  // Dispose all
  for (const d of disposers) d();

  return performance.now() - start;
}

const signalResults = [
  { name: 'Create 10,000 signals', duration: benchSignalCreation(10000) },
  { name: 'Create 100,000 signals', duration: benchSignalCreation(100000) },
  { name: 'Propagate 100 computeds × 1000', duration: benchSignalPropagation(100) },
  { name: 'Propagate 1000 computeds × 1000', duration: benchSignalPropagation(1000) },
  { name: 'Diamond deps (depth 10) × 1000', duration: benchDiamondDeps(10) },
  { name: 'Diamond deps (depth 50) × 1000', duration: benchDiamondDeps(50) },
  { name: 'Batch update 100 signals × 100', duration: benchBatch(100) },
  { name: 'Batch update 1000 signals × 100', duration: benchBatch(1000) },
  { name: 'Create+dispose 1000 effects', duration: benchEffects(1000) },
  { name: 'Create+dispose 10,000 effects', duration: benchEffects(10000) },
];

for (const r of signalResults) {
  const ms = r.duration.toFixed(2).padStart(8);
  console.log(`    ${r.name.padEnd(38)} ${ms} ms`);
}

// =========================================================================
// 3. Memory usage
// =========================================================================

console.log('\n  3. Memory Usage');
console.log('  ──────────────────────────────────────────\n');

if (typeof process !== 'undefined' && process.memoryUsage) {
  global.gc?.(); // Run GC if available
  const before = process.memoryUsage();

  // Create 100K signals
  const memSignals = [];
  for (let i = 0; i < 100000; i++) {
    memSignals.push(signal(i));
  }

  const after = process.memoryUsage();
  const heapDiff = (after.heapUsed - before.heapUsed) / 1024 / 1024;
  console.log(`    100,000 signals: ~${heapDiff.toFixed(1)} MB heap`);
  console.log(`    Per signal: ~${((after.heapUsed - before.heapUsed) / 100000).toFixed(0)} bytes`);

  // Cleanup
  memSignals.length = 0;
  global.gc?.();

  const afterCleanup = process.memoryUsage();
  const freed = (after.heapUsed - afterCleanup.heapUsed) / 1024 / 1024;
  console.log(`    After cleanup: ${freed.toFixed(1)} MB freed`);
}

// =========================================================================
// Summary
// =========================================================================

console.log('\n  ══════════════════════════════════════════');
console.log('  NOTE: These are NODE.JS benchmarks, not browser DOM benchmarks.');
console.log('  Signal/computed/effect performance is measured, DOM rendering is not.');
console.log('  For browser benchmarks, use js-framework-benchmark harness.');
console.log('  ══════════════════════════════════════════\n');

// JSON output for CI
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ data: results, signals: signalResults }, null, 2));
}
