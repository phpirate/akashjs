/**
 * Benchmark runner — execute and report results.
 *
 * Run with: npx tsx benchmark/run.ts
 */

import { runBenchmarks, formatResults } from './index.js';

console.log('\n  AkashJS Benchmark Suite');
console.log('  Running standard js-framework-benchmark operations...\n');

const results = runBenchmarks();
console.log(formatResults(results));

// Summary
const total = results.reduce((sum, r) => sum + r.duration, 0);
console.log(`  Total time: ${total.toFixed(2)} ms\n`);

// Output as JSON for CI
if (process.argv.includes('--json')) {
  console.log(JSON.stringify(results, null, 2));
}
