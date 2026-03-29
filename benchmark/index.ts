/**
 * js-framework-benchmark implementation for AkashJS.
 *
 * Standard benchmark operations:
 * 1. Create 1000 rows
 * 2. Replace all 1000 rows
 * 3. Partial update (every 10th row)
 * 4. Select row (highlight)
 * 5. Swap rows (2nd and 999th)
 * 6. Remove row
 * 7. Create 10,000 rows
 * 8. Append 1000 rows
 * 9. Clear all rows
 *
 * Run with: npx tsx benchmark/index.ts
 */

// --- Data generation ---

let idCounter = 0;

const ADJECTIVES = [
  'pretty', 'large', 'big', 'small', 'tall', 'short', 'long', 'handsome',
  'plain', 'quaint', 'clean', 'elegant', 'easy', 'angry', 'crazy', 'helpful',
  'mushy', 'odd', 'unsightly', 'adorable', 'important', 'inexpensive',
  'cheap', 'expensive', 'fancy',
];

const COLOURS = [
  'red', 'yellow', 'blue', 'green', 'pink', 'brown', 'purple', 'brown',
  'white', 'black', 'orange',
];

const NOUNS = [
  'table', 'chair', 'house', 'bbq', 'desk', 'car', 'pony', 'cookie',
  'sandwich', 'burger', 'pizza', 'mouse', 'keyboard',
];

function random(max: number): number {
  return (Math.random() * max) | 0;
}

export interface Row {
  id: number;
  label: string;
}

export function buildData(count: number): Row[] {
  const data: Row[] = [];
  for (let i = 0; i < count; i++) {
    data.push({
      id: ++idCounter,
      label: `${ADJECTIVES[random(ADJECTIVES.length)]} ${COLOURS[random(COLOURS.length)]} ${NOUNS[random(NOUNS.length)]}`,
    });
  }
  return data;
}

// --- Benchmark operations ---

export interface BenchmarkState {
  rows: Row[];
  selected: number;
}

export function createState(): BenchmarkState {
  return { rows: [], selected: -1 };
}

export function create1000(state: BenchmarkState): BenchmarkState {
  return { ...state, rows: buildData(1000) };
}

export function create10000(state: BenchmarkState): BenchmarkState {
  return { ...state, rows: buildData(10000) };
}

export function append1000(state: BenchmarkState): BenchmarkState {
  return { ...state, rows: [...state.rows, ...buildData(1000)] };
}

export function updateEvery10th(state: BenchmarkState): BenchmarkState {
  const rows = state.rows.map((row, i) =>
    i % 10 === 0 ? { ...row, label: row.label + ' !!!' } : row,
  );
  return { ...state, rows };
}

export function clear(state: BenchmarkState): BenchmarkState {
  return { ...state, rows: [] };
}

export function swapRows(state: BenchmarkState): BenchmarkState {
  if (state.rows.length < 999) return state;
  const rows = [...state.rows];
  const tmp = rows[1];
  rows[1] = rows[998];
  rows[998] = tmp;
  return { ...state, rows };
}

export function selectRow(state: BenchmarkState, id: number): BenchmarkState {
  return { ...state, selected: id };
}

export function removeRow(state: BenchmarkState, id: number): BenchmarkState {
  return { ...state, rows: state.rows.filter((r) => r.id !== id) };
}

// --- Timing utilities ---

export interface BenchmarkResult {
  name: string;
  duration: number;
}

export function measure(name: string, fn: () => void): BenchmarkResult {
  const start = performance.now();
  fn();
  const duration = performance.now() - start;
  return { name, duration };
}

export function runBenchmarks(): BenchmarkResult[] {
  const results: BenchmarkResult[] = [];

  // 1. Create 1000 rows
  let state = createState();
  results.push(measure('create 1000', () => { state = create1000(state); }));

  // 2. Replace all rows
  results.push(measure('replace 1000', () => { state = create1000(state); }));

  // 3. Partial update
  results.push(measure('update every 10th', () => { state = updateEvery10th(state); }));

  // 4. Select row
  results.push(measure('select row', () => { state = selectRow(state, state.rows[0].id); }));

  // 5. Swap rows
  results.push(measure('swap rows', () => { state = swapRows(state); }));

  // 6. Remove row
  results.push(measure('remove row', () => { state = removeRow(state, state.rows[0].id); }));

  // 7. Create 10,000 rows
  state = createState();
  results.push(measure('create 10000', () => { state = create10000(state); }));

  // 8. Append 1000
  state = createState();
  state = create1000(state);
  results.push(measure('append 1000', () => { state = append1000(state); }));

  // 9. Clear
  results.push(measure('clear', () => { state = clear(state); }));

  return results;
}

export function formatResults(results: BenchmarkResult[]): string {
  let out = '\n  AkashJS Benchmark Results\n';
  out += '  ' + '─'.repeat(40) + '\n';
  for (const r of results) {
    const ms = r.duration.toFixed(2).padStart(8);
    out += `  ${r.name.padEnd(25)} ${ms} ms\n`;
  }
  out += '  ' + '─'.repeat(40) + '\n';
  return out;
}
