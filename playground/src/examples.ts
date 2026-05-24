export interface Example {
  name: string;
  source: string;
}

export const examples: Example[] = [
  {
    name: 'Hello World',
    source: `<script>
import { signal } from '@akashjs/runtime';

const name = signal('World');
</script>

<template>
  <h1>Hello, {name()}!</h1>
  <input value={name()} onInput={(e) => name.set(e.target.value)} />
</template>

<style>
h1 {
  color: #6366f1;
  font-family: system-ui, sans-serif;
}
input {
  padding: 8px 12px;
  font-size: 16px;
  border: 2px solid #e2e8f0;
  border-radius: 6px;
  margin-top: 12px;
}
input:focus {
  outline: none;
  border-color: #6366f1;
}
</style>`,
  },
  {
    name: 'Counter',
    source: `<script>
import { signal, computed } from '@akashjs/runtime';

const count = signal(0);
const doubled = computed(() => count() * 2);
const isEven = computed(() => count() % 2 === 0);
</script>

<template>
  <div class="counter">
    <h2>Count: {count()}</h2>
    <p>Doubled: {doubled()}</p>
    <p>Is even: {isEven() ? 'Yes' : 'No'}</p>
    <div class="buttons">
      <button onClick={() => count.update(c => c - 1)}>-1</button>
      <button onClick={() => count.set(0)}>Reset</button>
      <button onClick={() => count.update(c => c + 1)}>+1</button>
    </div>
  </div>
</template>

<style>
.counter {
  font-family: system-ui, sans-serif;
  text-align: center;
  padding: 24px;
}
h2 { color: #1e293b; font-size: 2rem; }
p { color: #64748b; }
.buttons { display: flex; gap: 8px; justify-content: center; margin-top: 16px; }
button {
  padding: 8px 20px;
  font-size: 16px;
  border: none;
  border-radius: 6px;
  background: #6366f1;
  color: white;
  cursor: pointer;
}
button:hover { background: #4f46e5; }
</style>`,
  },
  {
    name: 'Todo List',
    source: `<script>
import { signal, computed } from '@akashjs/runtime';

const input = signal('');
const todos = signal([
  { id: 1, text: 'Learn AkashJS', done: true },
  { id: 2, text: 'Build something awesome', done: false },
]);
let nextId = 3;

const remaining = computed(() => todos().filter(t => !t.done).length);

function addTodo() {
  const text = input().trim();
  if (!text) return;
  todos.update(t => [...t, { id: nextId++, text, done: false }]);
  input.set('');
}

function toggle(id) {
  todos.update(t => t.map(todo =>
    todo.id === id ? { ...todo, done: !todo.done } : todo
  ));
}

function remove(id) {
  todos.update(t => t.filter(todo => todo.id !== id));
}
</script>

<template>
  <div class="app">
    <h2>Todo List</h2>
    <div class="input-row">
      <input
        placeholder="What needs to be done?"
        value={input()}
        onInput={(e) => input.set(e.target.value)}
        onKeydown={(e) => e.key === 'Enter' && addTodo()}
      />
      <button onClick={addTodo}>Add</button>
    </div>
    <ul>
      <For each={todos()} key={(t) => t.id}>
        {(todo) =>
          <li class:done={todo.done}>
            <input type="checkbox" checked={todo.done} onChange={() => toggle(todo.id)} />
            <span>{todo.text}</span>
            <button class="remove" onClick={() => remove(todo.id)}>x</button>
          </li>
        }
      </For>
    </ul>
    <p class="remaining">{remaining()} item{remaining() !== 1 ? 's' : ''} remaining</p>
  </div>
</template>

<style>
.app { font-family: system-ui, sans-serif; max-width: 400px; }
h2 { color: #1e293b; }
.input-row { display: flex; gap: 8px; margin-bottom: 16px; }
.input-row input { flex: 1; padding: 8px; border: 2px solid #e2e8f0; border-radius: 6px; font-size: 14px; }
.input-row button { padding: 8px 16px; background: #6366f1; color: white; border: none; border-radius: 6px; cursor: pointer; }
ul { list-style: none; padding: 0; }
li { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
li.done span { text-decoration: line-through; color: #94a3b8; }
.remove { background: none; border: none; color: #ef4444; cursor: pointer; font-size: 16px; margin-left: auto; }
.remaining { color: #64748b; font-size: 14px; }
</style>`,
  },
  {
    name: 'Signals & Effects',
    source: `<script>
import { signal, computed, effect } from '@akashjs/runtime';

const firstName = signal('John');
const lastName = signal('Doe');
const fullName = computed(() => firstName() + ' ' + lastName());

const log = signal([]);

effect(() => {
  log.update(l => [...l, 'Full name changed to: ' + fullName()]);
});
</script>

<template>
  <div class="app">
    <h2>Reactive Signals</h2>
    <div class="fields">
      <label>
        First name
        <input value={firstName()} onInput={(e) => firstName.set(e.target.value)} />
      </label>
      <label>
        Last name
        <input value={lastName()} onInput={(e) => lastName.set(e.target.value)} />
      </label>
    </div>
    <div class="result">
      <strong>Full name:</strong> {fullName()}
    </div>
    <div class="log">
      <h3>Effect Log</h3>
      <For each={log()} key={(_, i) => i}>
        {(entry) => <div class="entry">{entry}</div>}
      </For>
    </div>
  </div>
</template>

<style>
.app { font-family: system-ui, sans-serif; }
h2 { color: #1e293b; }
.fields { display: flex; gap: 16px; margin-bottom: 16px; }
label { display: flex; flex-direction: column; gap: 4px; color: #64748b; font-size: 14px; }
input { padding: 8px; border: 2px solid #e2e8f0; border-radius: 6px; font-size: 14px; }
input:focus { outline: none; border-color: #6366f1; }
.result { padding: 12px; background: #f8fafc; border-radius: 6px; margin-bottom: 16px; }
h3 { font-size: 14px; color: #64748b; }
.log { max-height: 150px; overflow-y: auto; }
.entry { font-size: 13px; color: #475569; padding: 4px 0; border-bottom: 1px solid #f1f5f9; font-family: monospace; }
</style>`,
  },
  {
    name: 'For Loop',
    source: `<script>
import { signal } from '@akashjs/runtime';

const colors = signal([
  { id: 1, name: 'Indigo', hex: '#6366f1' },
  { id: 2, name: 'Emerald', hex: '#10b981' },
  { id: 3, name: 'Amber', hex: '#f59e0b' },
  { id: 4, name: 'Rose', hex: '#f43f5e' },
]);

let nextId = 5;

function addRandom() {
  const names = ['Sky', 'Coral', 'Mint', 'Plum', 'Gold', 'Teal'];
  const hex = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  const name = names[Math.floor(Math.random() * names.length)];
  colors.update(c => [...c, { id: nextId++, name, hex }]);
}

function remove(id) {
  colors.update(c => c.filter(item => item.id !== id));
}

function shuffle() {
  colors.update(c => {
    const arr = [...c];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });
}
</script>

<template>
  <div class="app">
    <h2>Keyed For Loop</h2>
    <div class="actions">
      <button onClick={addRandom}>Add Color</button>
      <button onClick={shuffle}>Shuffle</button>
    </div>
    <div class="grid">
      <For each={colors()} key={(c) => c.id}>
        {(color) =>
          <div class="card" style={'background:' + color.hex}>
            <span>{color.name}</span>
            <button onClick={() => remove(color.id)}>x</button>
          </div>
        }
      </For>
    </div>
  </div>
</template>

<style>
.app { font-family: system-ui, sans-serif; }
h2 { color: #1e293b; }
.actions { display: flex; gap: 8px; margin-bottom: 16px; }
button { padding: 8px 16px; background: #6366f1; color: white; border: none; border-radius: 6px; cursor: pointer; }
button:hover { background: #4f46e5; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; }
.card {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 16px; border-radius: 8px; color: white; font-weight: 600;
  transition: transform 0.2s;
}
.card:hover { transform: scale(1.05); }
.card button { background: rgba(255,255,255,0.3); padding: 2px 8px; font-size: 14px; }
</style>`,
  },
  {
    name: 'Clock',
    source: `<script>
import { signal, computed, effect } from '@akashjs/runtime';

const time = signal(new Date());

effect(() => {
  const id = setInterval(() => time.set(new Date()), 1000);
  return () => clearInterval(id);
});

const hours = computed(() => time().getHours().toString().padStart(2, '0'));
const minutes = computed(() => time().getMinutes().toString().padStart(2, '0'));
const seconds = computed(() => time().getSeconds().toString().padStart(2, '0'));
const greeting = computed(() => {
  const h = time().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
});
</script>

<template>
  <div class="clock">
    <p class="greeting">{greeting()}</p>
    <div class="time">
      <span class="digit">{hours()}</span>
      <span class="sep">:</span>
      <span class="digit">{minutes()}</span>
      <span class="sep">:</span>
      <span class="digit">{seconds()}</span>
    </div>
    <p class="date">{time().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>
</template>

<style>
.clock {
  font-family: system-ui, sans-serif;
  text-align: center;
  padding: 40px;
}
.greeting { font-size: 18px; color: #64748b; margin-bottom: 8px; }
.time { display: flex; justify-content: center; align-items: center; gap: 4px; }
.digit {
  font-size: 64px; font-weight: 700; color: #1e293b;
  background: #f1f5f9; border-radius: 8px; padding: 8px 16px;
  font-variant-numeric: tabular-nums;
}
.sep { font-size: 48px; color: #6366f1; font-weight: 700; }
.date { margin-top: 16px; color: #94a3b8; font-size: 14px; }
</style>`,
  },,
  {
    name: 'Full Demo',
    source: `<script>
import { signal, computed, effect, batch, untrack, onMount, ref } from '@akashjs/runtime';

// ═══════════════════════════════════════════════════════════════
//  THEME & GLOBAL STATE
// ═══════════════════════════════════════════════════════════════
const theme = signal(localStorage.getItem('ak-theme') || 'dark');
effect(() => localStorage.setItem('ak-theme', theme()));
const view = signal('dashboard');
const cmdOpen = signal(false);
const cmdQuery = signal('');
const cmdRef = ref(null);

// ═══════════════════════════════════════════════════════════════
//  CLOCK
// ═══════════════════════════════════════════════════════════════
const now = signal(new Date());
effect(() => { const id = setInterval(() => now.set(new Date()), 1000); return () => clearInterval(id); });
const timeStr = computed(() => now().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

// ═══════════════════════════════════════════════════════════════
//  POMODORO TIMER
// ═══════════════════════════════════════════════════════════════
const pomoDuration = signal(25 * 60);
const pomoLeft = signal(25 * 60);
const pomoRunning = signal(false);
const pomoMode = signal('work');
const pomoDone = signal(0);

effect(() => {
  if (!pomoRunning()) return;
  const id = setInterval(() => {
    pomoLeft.update(l => {
      if (l <= 1) {
        pomoRunning.set(false);
        const mode = untrack(() => pomoMode());
        if (mode === 'work') {
          pomoDone.update(d => d + 1);
          pomoMode.set('break');
          toast('Break time!', 'success');
          return 5 * 60;
        } else {
          pomoMode.set('work');
          toast('Back to work!', 'info');
          return 25 * 60;
        }
      }
      return l - 1;
    });
  }, 1000);
  return () => clearInterval(id);
});

const pomoDisplay = computed(() => {
  const l = pomoLeft();
  const m = Math.floor(l / 60).toString().padStart(2, '0');
  const s = (l % 60).toString().padStart(2, '0');
  return m + ':' + s;
});

const pomoProgress = computed(() => {
  const dur = pomoMode() === 'work' ? 25 * 60 : 5 * 60;
  return ((dur - pomoLeft()) / dur) * 100;
});

function pomoToggle() { pomoRunning.update(r => !r); }
function pomoReset() { batch(() => { pomoRunning.set(false); pomoLeft.set(pomoMode() === 'work' ? 25 * 60 : 5 * 60); }); }
function pomoSkip() {
  batch(() => {
    pomoRunning.set(false);
    if (pomoMode() === 'work') { pomoMode.set('break'); pomoLeft.set(5 * 60); }
    else { pomoMode.set('work'); pomoLeft.set(25 * 60); }
  });
}

// ═══════════════════════════════════════════════════════════════
//  TOASTS
// ═══════════════════════════════════════════════════════════════
const toasts = signal([]);
let tid = 0;
function toast(text, type) {
  const id = tid++;
  toasts.update(t => [...t, { id, text, type }]);
  setTimeout(() => toasts.update(t => t.filter(x => x.id !== id)), 2500);
}

// ═══════════════════════════════════════════════════════════════
//  KANBAN BOARD
// ═══════════════════════════════════════════════════════════════
const dragOverCol = signal(null);
const dragCard = signal(null);

function defaultBoard() {
  return [
    { id: 'todo', title: 'To Do', color: '#6366f1', cards: [
      { id: 1, title: 'Design auth flow', tag: 'design', pri: 'high' },
      { id: 2, title: 'API rate limiting', tag: 'backend', pri: 'medium' },
      { id: 3, title: 'Write unit tests', tag: 'testing', pri: 'low' },
    ]},
    { id: 'doing', title: 'In Progress', color: '#f59e0b', cards: [
      { id: 4, title: 'Dashboard charts', tag: 'frontend', pri: 'high' },
    ]},
    { id: 'review', title: 'Review', color: '#8b5cf6', cards: [
      { id: 5, title: 'PR #89: Caching layer', tag: 'backend', pri: 'medium' },
    ]},
    { id: 'done', title: 'Done', color: '#10b981', cards: [
      { id: 6, title: 'Set up CI pipeline', tag: 'devops', pri: 'high' },
      { id: 7, title: 'User onboarding flow', tag: 'design', pri: 'medium' },
    ]},
  ];
}

let nid = 50;
const board = signal(defaultBoard());
const boardHistory = signal([JSON.stringify(defaultBoard())]);
const boardIdx = signal(0);
const canUndo = computed(() => boardIdx() > 0);
const canRedo = computed(() => boardIdx() < boardHistory().length - 1);

function pushSnap() {
  const s = JSON.stringify(board());
  const h = boardHistory().slice(0, boardIdx() + 1);
  if (h[h.length - 1] === s) return;
  batch(() => { boardHistory.set([...h, s].slice(-20)); boardIdx.set(h.length); });
}
function undo() { if (!canUndo()) return; const i = boardIdx() - 1; boardIdx.set(i); board.set(JSON.parse(boardHistory()[i])); toast('Undo', 'info'); }
function redo() { if (!canRedo()) return; const i = boardIdx() + 1; boardIdx.set(i); board.set(JSON.parse(boardHistory()[i])); toast('Redo', 'info'); }

const tagCol = { design: '#ec4899', backend: '#06b6d4', frontend: '#10b981', devops: '#f97316', testing: '#8b5cf6' };
const priCol = { low: '#94a3b8', medium: '#f59e0b', high: '#ef4444' };

function addCard(colId) {
  const tags = Object.keys(tagCol); const pris = ['low','medium','high'];
  board.update(b => b.map(c => c.id === colId ? { ...c, cards: [...c.cards, { id: nid++, title: 'New task #' + nid, tag: tags[Math.floor(Math.random()*tags.length)], pri: pris[Math.floor(Math.random()*3)] }] } : c));
  pushSnap(); toast('Card added', 'success');
}
function delCard(colId, cardId) { board.update(b => b.map(c => c.id === colId ? { ...c, cards: c.cards.filter(x => x.id !== cardId) } : c)); pushSnap(); toast('Deleted', 'error'); }
function onDragStart(colId, card, e) { dragCard.set({ colId, card }); e.dataTransfer.effectAllowed = 'move'; e.target.style.opacity = '0.4'; }
function onDragEnd(e) { e.target.style.opacity = '1'; batch(() => { dragCard.set(null); dragOverCol.set(null); }); }
function onDrop(toCol, e) {
  e.preventDefault();
  const d = untrack(() => dragCard());
  if (!d || d.colId === toCol) { dragOverCol.set(null); return; }
  board.update(b => {
    let mv = null;
    const a = b.map(c => { if (c.id === d.colId) { mv = c.cards.find(x => x.id === d.card.id); return { ...c, cards: c.cards.filter(x => x.id !== d.card.id) }; } return c; });
    if (!mv) return b;
    return a.map(c => c.id === toCol ? { ...c, cards: [...c.cards, mv] } : c);
  });
  batch(() => { dragCard.set(null); dragOverCol.set(null); }); pushSnap(); toast('Moved', 'info');
}

const boardStats = computed(() => {
  const b = board(); let total = 0, hi = 0;
  b.forEach(c => c.cards.forEach(x => { total++; if (x.pri === 'high') hi++; }));
  return { total, hi, done: (b.find(c => c.id === 'done')?.cards.length) || 0 };
});

// ═══════════════════════════════════════════════════════════════
//  SPREADSHEET
// ═══════════════════════════════════════════════════════════════
const ROWS = 12;
const COLS = 6;
const colLabels = ['A','B','C','D','E','F'];
const cells = signal({});
const activeCell = signal(null);
const editingCell = signal(null);
const editValue = signal('');

function cellKey(r, c) { return colLabels[c] + (r + 1); }
function getCellVal(key) { return cells()[key] || ''; }
function getCellDisplay(key) {
  const raw = getCellVal(key);
  if (typeof raw === 'string' && raw.startsWith('=')) {
    try { return evalFormula(raw); } catch(e) { return '#ERR'; }
  }
  return raw;
}

function evalFormula(formula) {
  const expr = formula.slice(1).toUpperCase();
  // SUM(A1:A5)
  const sumMatch = expr.match(/^SUM\\(([A-F])(\\d+):([A-F])(\\d+)\\)\$/);
  if (sumMatch) {
    const [, c1, r1, c2, r2] = sumMatch;
    let sum = 0;
    for (let r = parseInt(r1); r <= parseInt(r2); r++) {
      const v = parseFloat(getCellDisplay(c1 + r)) || 0;
      sum += v;
    }
    return sum;
  }
  // AVG(A1:A5)
  const avgMatch = expr.match(/^AVG\\(([A-F])(\\d+):([A-F])(\\d+)\\)\$/);
  if (avgMatch) {
    const [, c1, r1, c2, r2] = avgMatch;
    let sum = 0, cnt = 0;
    for (let r = parseInt(r1); r <= parseInt(r2); r++) {
      const v = parseFloat(getCellDisplay(c1 + r));
      if (!isNaN(v)) { sum += v; cnt++; }
    }
    return cnt ? (sum / cnt).toFixed(1) : 0;
  }
  // Simple math: replace cell refs with values
  const replaced = expr.replace(/([A-F])(\\d+)/g, (_, c, r) => {
    const v = parseFloat(getCellDisplay(c + r));
    return isNaN(v) ? 0 : v;
  });
  return new Function('return ' + replaced)();
}

function startEdit(r, c) {
  const key = cellKey(r, c);
  batch(() => { editingCell.set(key); editValue.set(getCellVal(key)); activeCell.set(key); });
}
function commitEdit() {
  const key = editingCell();
  if (!key) return;
  cells.update(c => ({ ...c, [key]: editValue() }));
  editingCell.set(null);
}
function cancelEdit() { editingCell.set(null); }

// Pre-fill some data
onMount(() => {
  cells.set({
    'A1': 'Product', 'B1': 'Q1', 'C1': 'Q2', 'D1': 'Q3', 'E1': 'Q4', 'F1': 'Total',
    'A2': 'Widget', 'B2': '150', 'C2': '230', 'D2': '180', 'E2': '310', 'F2': '=SUM(B2:E2)',
    'A3': 'Gadget', 'B3': '90', 'C3': '120', 'D3': '200', 'E3': '170', 'F3': '=SUM(B3:E3)',
    'A4': 'Doohickey', 'B4': '60', 'C4': '80', 'D4': '95', 'E4': '110', 'F4': '=SUM(B4:E4)',
    'A5': '', 'B5': '=SUM(B2:B4)', 'C5': '=SUM(C2:C4)', 'D5': '=SUM(D2:D4)', 'E5': '=SUM(E2:E4)', 'F5': '=SUM(B5:E5)',
    'A5': 'Totals',
    'A7': 'Avg', 'B7': '=AVG(B2:B4)', 'C7': '=AVG(C2:C4)',
  });
  if (cmdRef.current) cmdRef.current.focus();
  setTimeout(() => chartTick.update(v => v + 1), 200);
  toast('Welcome to AkashJS Productivity Suite', 'success');
});

// ═══════════════════════════════════════════════════════════════
//  CANVAS CHART
// ═══════════════════════════════════════════════════════════════
const chartType = signal('bar');
const chartData = computed(() => {
  const b = board();
  return b.map(col => ({ label: col.title, value: col.cards.length, color: col.color }));
});
const chartTick = signal(0);

function drawChart() {
  const canvas = document.getElementById('akash-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const data = untrack(() => chartData());
  const type = untrack(() => chartType());
  const isDark = untrack(() => theme()) === 'dark';
  const ow = canvas.offsetWidth || 300;
  const oh = canvas.offsetHeight || 200;
  canvas.width = ow * 2;
  canvas.height = oh * 2;
  ctx.scale(2, 2);
  const cw = ow, ch = oh;
  ctx.clearRect(0, 0, cw, ch);
  ctx.font = '11px system-ui';

  if (type === 'bar') {
    const max = Math.max(...data.map(d => d.value), 1);
    const barW = (cw - 60) / data.length - 10;
    data.forEach((d, i) => {
      const bh = (d.value / max) * (ch - 50);
      const x = 40 + i * (barW + 10);
      const y = ch - 30 - bh;
      ctx.fillStyle = d.color;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, barW, bh, 4);
      else ctx.rect(x, y, barW, bh);
      ctx.fill();
      ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
      ctx.textAlign = 'center';
      ctx.fillText(d.label, x + barW / 2, ch - 12);
      ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
      ctx.fillText(d.value, x + barW / 2, y - 6);
    });
  } else {
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    let angle = -Math.PI / 2;
    const cx = cw / 2, cy = ch / 2, r = Math.min(cx, cy) - 30;
    data.forEach(d => {
      const slice = (d.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, angle, angle + slice);
      ctx.closePath();
      ctx.fillStyle = d.color;
      ctx.fill();
      const mid = angle + slice / 2;
      const lx = cx + Math.cos(mid) * (r * 0.65);
      const ly = cy + Math.sin(mid) * (r * 0.65);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(d.value, lx, ly + 4);
      angle += slice;
    });
    ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.font = '11px system-ui';
    let ly = 14;
    data.forEach(d => {
      ctx.fillStyle = d.color;
      ctx.fillRect(cw - 90, ly - 8, 10, 10);
      ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
      ctx.textAlign = 'left';
      ctx.fillText(d.label, cw - 74, ly);
      ly += 16;
    });
  }
}

// Redraw chart when data/type/theme changes
effect(() => {
  chartData(); chartType(); theme(); chartTick();
  setTimeout(drawChart, 50);
});

// ═══════════════════════════════════════════════════════════════
//  COMMAND PALETTE
// ═══════════════════════════════════════════════════════════════
const commands = [
  { id: 'dash', label: 'Go to Dashboard', action: () => view.set('dashboard') },
  { id: 'kanban', label: 'Go to Kanban Board', action: () => view.set('kanban') },
  { id: 'sheet', label: 'Go to Spreadsheet', action: () => view.set('spreadsheet') },
  { id: 'pomo', label: 'Go to Pomodoro', action: () => view.set('pomodoro') },
  { id: 'theme', label: 'Toggle Theme', action: () => theme.update(t => t === 'dark' ? 'light' : 'dark') },
  { id: 'undo', label: 'Undo Board Change', action: undo },
  { id: 'redo', label: 'Redo Board Change', action: redo },
  { id: 'reset', label: 'Reset Board', action: () => { board.set(defaultBoard()); pushSnap(); toast('Board reset', 'info'); } },
  { id: 'pstart', label: 'Start/Pause Pomodoro', action: pomoToggle },
  { id: 'preset', label: 'Reset Pomodoro', action: pomoReset },
];

const filteredCmds = computed(() => {
  const q = cmdQuery().toLowerCase();
  if (!q) return commands;
  return commands.filter(c => c.label.toLowerCase().includes(q));
});

function runCmd(cmd) { cmd.action(); batch(() => { cmdOpen.set(false); cmdQuery.set(''); }); toast(cmd.label, 'info'); }

// ═══════════════════════════════════════════════════════════════
//  KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════════════════════
effect(() => {
  const handler = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); batch(() => { cmdOpen.update(v => !v); cmdQuery.set(''); }); return; }
    if (e.key === 'Escape') { cmdOpen.set(false); return; }
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    if (e.key === '1') view.set('dashboard');
    if (e.key === '2') view.set('kanban');
    if (e.key === '3') view.set('spreadsheet');
    if (e.key === '4') view.set('pomodoro');
  };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
});

// ═══════════════════════════════════════════════════════════════
//  MULTI-TAB SYNC
// ═══════════════════════════════════════════════════════════════
const ch = new BroadcastChannel('akash-sync');
let syncing = true;
effect(() => { const d = board(); if (syncing) ch.postMessage({ type: 'board', data: d }); });
effect(() => {
  ch.onmessage = (e) => { if (e.data.type === 'board') { syncing = false; board.set(e.data.data); syncing = true; } };
  return () => ch.close();
});
</script>

<template>
  <div class="app" class:dark={theme() === 'dark'}>
    <!-- SIDEBAR -->
    <nav class="sidebar">
      <div class="sb-logo">Akash</div>
      <button class="sb-item" class:active={view() === 'dashboard'} onClick={() => { view.set('dashboard'); setTimeout(() => chartTick.update(v => v + 1), 100); }}>
        <span class="sb-icon">&#9632;</span><span class="sb-text">Dashboard</span>
      </button>
      <button class="sb-item" class:active={view() === 'kanban'} onClick={() => view.set('kanban')}>
        <span class="sb-icon">&#9776;</span><span class="sb-text">Kanban</span>
      </button>
      <button class="sb-item" class:active={view() === 'spreadsheet'} onClick={() => view.set('spreadsheet')}>
        <span class="sb-icon">&#9638;</span><span class="sb-text">Sheets</span>
      </button>
      <button class="sb-item" class:active={view() === 'pomodoro'} onClick={() => view.set('pomodoro')}>
        <span class="sb-icon">&#9201;</span><span class="sb-text">Pomodoro</span>
      </button>
      <div class="sb-spacer"></div>
      <div class="sb-clock">{timeStr()}</div>
      <button class="sb-item" onClick={() => theme.update(t => t === 'dark' ? 'light' : 'dark')}>
        <span class="sb-icon">{theme() === 'dark' ? '\\u2600' : '\\u263E'}</span><span class="sb-text">Theme</span>
      </button>
      <div class="sb-hint">Ctrl+K = commands</div>
    </nav>

    <!-- MAIN -->
    <main class="main">

      <!-- ═══ DASHBOARD ═══ -->
      <For each={view() === 'dashboard' ? [1] : []} key={() => 'dash'}>
        {() =>
          <div class="page">
            <h2 class="page-title">Dashboard</h2>
            <div class="dash-stats">
              <div class="stat-card"><div class="stat-val">{boardStats().total}</div><div class="stat-lbl">Total Tasks</div></div>
              <div class="stat-card red"><div class="stat-val">{boardStats().hi}</div><div class="stat-lbl">High Priority</div></div>
              <div class="stat-card green"><div class="stat-val">{boardStats().done}</div><div class="stat-lbl">Completed</div></div>
              <div class="stat-card purple"><div class="stat-val">{pomoDone()}</div><div class="stat-lbl">Pomodoros</div></div>
            </div>
            <div class="dash-row">
              <div class="chart-panel">
                <div class="chart-head">
                  <h3>Task Distribution</h3>
                  <div class="chart-toggle">
                    <button class="ct-btn" class:active={chartType() === 'bar'} onClick={() => chartType.set('bar')}>Bar</button>
                    <button class="ct-btn" class:active={chartType() === 'pie'} onClick={() => chartType.set('pie')}>Pie</button>
                  </div>
                </div>
                <canvas id="akash-chart" class="chart-canvas"></canvas>
              </div>
              <div class="pomo-mini">
                <h3>Pomodoro</h3>
                <div class="pomo-ring">
                  <svg viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" stroke-width="4" opacity="0.1"/>
                    <circle cx="60" cy="60" r="52" fill="none" stroke={pomoMode() === 'work' ? '#6366f1' : '#10b981'} stroke-width="4" stroke-dasharray="327" stroke-dashoffset={327 - (pomoProgress() / 100) * 327} stroke-linecap="round" transform="rotate(-90 60 60)"/>
                  </svg>
                  <span class="pomo-time">{pomoDisplay()}</span>
                </div>
                <div class="pomo-label">{pomoMode() === 'work' ? 'Focus Time' : 'Break Time'}</div>
                <div class="pomo-btns">
                  <button class="btn sm" onClick={pomoToggle}>{pomoRunning() ? 'Pause' : 'Start'}</button>
                  <button class="btn sm" onClick={pomoReset}>Reset</button>
                </div>
              </div>
            </div>
          </div>
        }
      </For>

      <!-- ═══ KANBAN ═══ -->
      <For each={view() === 'kanban' ? [1] : []} key={() => 'kanban'}>
        {() =>
          <div class="page">
            <div class="kb-head">
              <h2 class="page-title">Kanban Board</h2>
              <div class="kb-actions">
                <button class="btn sm" class:disabled={!canUndo()} onClick={undo}>Undo</button>
                <button class="btn sm" class:disabled={!canRedo()} onClick={redo}>Redo</button>
              </div>
            </div>
            <div class="kb-board">
              <For each={board()} key={(c) => c.id}>
                {(col) =>
                  <div class="kb-col" class:drag-over={dragOverCol() === col.id}
                    onDragover={(e) => { e.preventDefault(); dragOverCol.set(col.id); }}
                    onDragleave={() => dragOverCol.set(null)}
                    onDrop={(e) => onDrop(col.id, e)}
                  >
                    <div class="kb-col-head">
                      <span class="kb-dot" style={'background:' + col.color}></span>
                      <span>{col.title}</span>
                      <span class="kb-cnt">{col.cards.length}</span>
                      <button class="kb-add" onClick={() => addCard(col.id)}>+</button>
                    </div>
                    <div class="kb-col-body">
                      <For each={col.cards} key={(c) => c.id}>
                        {(card) =>
                          <div class="kb-card" draggable="true"
                            onDragstart={(e) => onDragStart(col.id, card, e)}
                            onDragend={onDragEnd}
                          >
                            <div class="kb-card-r1">
                              <span class="kb-pri" style={'background:' + (priCol[card.pri] || '#94a3b8')}></span>
                              <span class="kb-card-t">{card.title}</span>
                              <button class="kb-del" onClick={() => delCard(col.id, card.id)}>x</button>
                            </div>
                            <span class="kb-tag" style={'background:' + (tagCol[card.tag] || '#6b7280')}>{card.tag}</span>
                          </div>
                        }
                      </For>
                    </div>
                  </div>
                }
              </For>
            </div>
          </div>
        }
      </For>

      <!-- ═══ SPREADSHEET ═══ -->
      <For each={view() === 'spreadsheet' ? [1] : []} key={() => 'sheet'}>
        {() =>
          <div class="page">
            <h2 class="page-title">Spreadsheet</h2>
            <p class="sheet-hint">Supports formulas: =SUM(A1:A5), =AVG(B2:B4), =B2+C2*2, cell references</p>
            <div class="sheet-wrap">
              <table class="sheet">
                <thead>
                  <tr>
                    <th class="row-num"></th>
                    <For each={colLabels} key={(c) => c}>
                      {(col) => <th>{col}</th>}
                    </For>
                  </tr>
                </thead>
                <tbody>
                  <For each={Array.from({length: ROWS}, (_, i) => i)} key={(i) => i}>
                    {(row) =>
                      <tr>
                        <td class="row-num">{row + 1}</td>
                        <For each={Array.from({length: COLS}, (_, i) => i)} key={(i) => i}>
                          {(col) =>
                            <td
                              class="cell"
                              class:active={activeCell() === cellKey(row, col)}
                              class:editing={editingCell() === cellKey(row, col)}
                              class:formula={typeof getCellVal(cellKey(row, col)) === 'string' && getCellVal(cellKey(row, col)).startsWith('=')}
                              onClick={() => activeCell.set(cellKey(row, col))}
                              onDblclick={() => startEdit(row, col)}
                            >
                              <For each={editingCell() === cellKey(row, col) ? [1] : []} key={() => 'e'}>
                                {() =>
                                  <input
                                    class="cell-input"
                                    value={editValue()}
                                    onInput={(e) => editValue.set(e.target.value)}
                                    onKeydown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') cancelEdit(); }}
                                    onBlur={commitEdit}
                                  />
                                }
                              </For>
                              <For each={editingCell() !== cellKey(row, col) ? [1] : []} key={() => 'v'}>
                                {() => <span class="cell-val">{getCellDisplay(cellKey(row, col))}</span>}
                              </For>
                            </td>
                          }
                        </For>
                      </tr>
                    }
                  </For>
                </tbody>
              </table>
            </div>
          </div>
        }
      </For>

      <!-- ═══ POMODORO ═══ -->
      <For each={view() === 'pomodoro' ? [1] : []} key={() => 'pomo'}>
        {() =>
          <div class="page pomo-page">
            <div class="pomo-big">
              <div class="pomo-ring-big">
                <svg viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" stroke-width="6" opacity="0.1"/>
                  <circle cx="100" cy="100" r="88" fill="none" stroke={pomoMode() === 'work' ? '#6366f1' : '#10b981'} stroke-width="6" stroke-dasharray="553" stroke-dashoffset={553 - (pomoProgress() / 100) * 553} stroke-linecap="round" transform="rotate(-90 100 100)"/>
                </svg>
                <div class="pomo-center">
                  <div class="pomo-big-time">{pomoDisplay()}</div>
                  <div class="pomo-big-mode">{pomoMode() === 'work' ? 'FOCUS' : 'BREAK'}</div>
                </div>
              </div>
              <div class="pomo-big-btns">
                <button class="btn lg" onClick={pomoToggle}>{pomoRunning() ? 'Pause' : 'Start'}</button>
                <button class="btn lg" onClick={pomoReset}>Reset</button>
                <button class="btn lg" onClick={pomoSkip}>Skip</button>
              </div>
              <div class="pomo-score">Sessions completed: <strong>{pomoDone()}</strong></div>
            </div>
          </div>
        }
      </For>
    </main>

    <!-- COMMAND PALETTE -->
    <For each={cmdOpen() ? [1] : []} key={() => 'cmd'}>
      {() =>
        <div class="cmd-overlay" onClick={() => cmdOpen.set(false)}>
          <div class="cmd-box" onClick={(e) => e.stopPropagation()}>
            <input ref={cmdRef} class="cmd-input" placeholder="Type a command..." value={cmdQuery()} onInput={(e) => cmdQuery.set(e.target.value)} onKeydown={(e) => { if (e.key === 'Enter' && filteredCmds().length) runCmd(filteredCmds()[0]); if (e.key === 'Escape') cmdOpen.set(false); }} />
            <div class="cmd-list">
              <For each={filteredCmds()} key={(c) => c.id}>
                {(cmd) => <button class="cmd-item" onClick={() => runCmd(cmd)}>{cmd.label}</button>}
              </For>
            </div>
          </div>
        </div>
      }
    </For>

    <!-- TOASTS -->
    <div class="toast-area">
      <For each={toasts()} key={(t) => t.id}>
        {(t) => <div class="toast" class:t-ok={t.type === 'success'} class:t-err={t.type === 'error'} class:t-info={t.type === 'info'}>{t.text}</div>}
      </For>
    </div>
  </div>
</template>

<style>
* { box-sizing: border-box; margin: 0; }
.app { font-family: system-ui, sans-serif; height: 100vh; display: flex; background: #f1f5f9; color: #1e293b; }
.app.dark { background: #0f172a; color: #e2e8f0; }

/* Sidebar */
.sidebar { width: 64px; background: #1e293b; display: flex; flex-direction: column; align-items: center; padding: 10px 0; gap: 2px; flex-shrink: 0; }
.dark .sidebar { background: #0a0f1a; }
.sb-logo { color: #6366f1; font-weight: 800; font-size: 13px; margin-bottom: 12px; }
.sb-item { width: 48px; height: 42px; border: none; background: none; color: #94a3b8; cursor: pointer; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; font-size: 9px; }
.sb-item:hover { background: rgba(255,255,255,0.06); color: #e2e8f0; }
.sb-item.active { background: rgba(99,102,241,0.15); color: #818cf8; }
.sb-icon { font-size: 16px; }
.sb-text { font-size: 9px; }
.sb-spacer { flex: 1; }
.sb-clock { font-size: 9px; color: #64748b; font-family: monospace; margin-bottom: 8px; font-variant-numeric: tabular-nums; }
.sb-hint { font-size: 7px; color: #475569; margin-top: 4px; text-align: center; padding: 0 4px; }

/* Main */
.main { flex: 1; overflow-y: auto; }
.page { padding: 16px; height: 100%; display: flex; flex-direction: column; }
.page-title { font-size: 18px; margin-bottom: 14px; }

/* Buttons */
.btn { padding: 5px 12px; border: 1px solid #e2e8f0; border-radius: 6px; background: white; cursor: pointer; font-size: 11px; color: #64748b; }
.dark .btn { background: #1e293b; border-color: #334155; color: #94a3b8; }
.btn:hover { border-color: #6366f1; color: #6366f1; }
.btn.sm { padding: 3px 8px; font-size: 10px; }
.btn.lg { padding: 10px 24px; font-size: 14px; }
.btn.disabled { opacity: 0.3; pointer-events: none; }

/* Dashboard */
.dash-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; }
.stat-card { background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; text-align: center; }
.dark .stat-card { background: #1e293b; border-color: #334155; }
.stat-card.red { border-left: 3px solid #ef4444; }
.stat-card.green { border-left: 3px solid #10b981; }
.stat-card.purple { border-left: 3px solid #8b5cf6; }
.stat-val { font-size: 28px; font-weight: 700; color: #6366f1; }
.stat-lbl { font-size: 11px; color: #94a3b8; margin-top: 2px; }
.dash-row { display: flex; gap: 14px; flex: 1; min-height: 0; }
.chart-panel { flex: 2; background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; display: flex; flex-direction: column; }
.dark .chart-panel { background: #1e293b; border-color: #334155; }
.chart-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.chart-head h3 { font-size: 13px; }
.chart-toggle { display: flex; gap: 2px; }
.ct-btn { padding: 3px 10px; border: 1px solid #e2e8f0; border-radius: 4px; background: none; cursor: pointer; font-size: 10px; color: #64748b; }
.dark .ct-btn { border-color: #334155; color: #94a3b8; }
.ct-btn.active { background: #6366f1; color: white; border-color: #6366f1; }
.chart-canvas { flex: 1; width: 100%; min-height: 0; }

/* Pomo mini */
.pomo-mini { flex: 1; background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; display: flex; flex-direction: column; align-items: center; }
.dark .pomo-mini { background: #1e293b; border-color: #334155; }
.pomo-mini h3 { font-size: 13px; margin-bottom: 10px; }
.pomo-ring { position: relative; width: 100px; height: 100px; }
.pomo-ring svg { width: 100%; height: 100%; }
.pomo-time { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; font-variant-numeric: tabular-nums; }
.pomo-label { font-size: 11px; color: #94a3b8; margin: 6px 0; }
.pomo-btns { display: flex; gap: 6px; }

/* Pomo full */
.pomo-page { align-items: center; justify-content: center; }
.pomo-big { text-align: center; }
.pomo-ring-big { position: relative; width: 220px; height: 220px; margin: 0 auto; }
.pomo-ring-big svg { width: 100%; height: 100%; }
.pomo-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.pomo-big-time { font-size: 42px; font-weight: 700; font-variant-numeric: tabular-nums; }
.pomo-big-mode { font-size: 12px; color: #94a3b8; letter-spacing: 3px; margin-top: 2px; }
.pomo-big-btns { display: flex; gap: 10px; justify-content: center; margin-top: 20px; }
.pomo-score { margin-top: 16px; font-size: 13px; color: #94a3b8; }

/* Kanban */
.kb-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.kb-actions { display: flex; gap: 4px; }
.kb-board { flex: 1; display: flex; gap: 8px; overflow-x: auto; min-height: 0; }
.kb-col { flex: 1; min-width: 180px; max-width: 260px; background: white; border-radius: 10px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; transition: border-color 0.2s; }
.dark .kb-col { background: #1e293b; border-color: #334155; }
.kb-col.drag-over { border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99,102,241,0.2); }
.kb-col-head { display: flex; align-items: center; gap: 6px; padding: 8px 10px; border-bottom: 1px solid #f1f5f9; font-size: 12px; font-weight: 600; }
.dark .kb-col-head { border-color: #334155; }
.kb-dot { width: 8px; height: 8px; border-radius: 50%; }
.kb-cnt { font-size: 10px; color: #94a3b8; background: #f1f5f9; padding: 1px 6px; border-radius: 6px; margin-left: auto; }
.dark .kb-cnt { background: #334155; }
.kb-add { width: 18px; height: 18px; border: 1px dashed #cbd5e1; border-radius: 4px; background: none; cursor: pointer; font-size: 12px; color: #94a3b8; }
.kb-add:hover { border-color: #6366f1; color: #6366f1; }
.kb-col-body { flex: 1; overflow-y: auto; padding: 4px; display: flex; flex-direction: column; gap: 4px; }
.kb-card { padding: 8px; background: #fafbfc; border: 1px solid #e2e8f0; border-radius: 6px; cursor: grab; transition: transform 0.15s; }
.dark .kb-card { background: #0f172a; border-color: #334155; }
.kb-card:hover { transform: translateY(-1px); }
.kb-card-r1 { display: flex; align-items: center; gap: 5px; }
.kb-pri { width: 6px; height: 6px; border-radius: 50%; }
.kb-card-t { flex: 1; font-size: 11px; font-weight: 500; }
.kb-del { background: none; border: none; color: #ef4444; cursor: pointer; opacity: 0; font-size: 11px; }
.kb-card:hover .kb-del { opacity: 0.5; }
.kb-tag { font-size: 9px; color: white; padding: 1px 6px; border-radius: 4px; margin-top: 5px; display: inline-block; }

/* Spreadsheet */
.sheet-hint { font-size: 11px; color: #94a3b8; margin-bottom: 10px; }
.sheet-wrap { flex: 1; overflow: auto; border: 1px solid #e2e8f0; border-radius: 8px; }
.dark .sheet-wrap { border-color: #334155; }
.sheet { border-collapse: collapse; width: 100%; font-size: 12px; }
.sheet th { background: #f1f5f9; padding: 6px 10px; font-weight: 600; font-size: 11px; color: #64748b; border: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 1; }
.dark .sheet th { background: #1e293b; border-color: #334155; color: #94a3b8; }
.sheet td { border: 1px solid #e2e8f0; padding: 0; height: 28px; min-width: 80px; }
.dark .sheet td { border-color: #334155; }
.row-num { width: 36px; text-align: center; background: #f8fafc; color: #94a3b8; font-size: 10px; padding: 6px !important; }
.dark .row-num { background: #1e293b; }
.cell { cursor: cell; position: relative; }
.cell.active { outline: 2px solid #6366f1; outline-offset: -1px; z-index: 1; }
.cell.formula .cell-val { color: #6366f1; }
.cell-val { display: block; padding: 4px 8px; min-height: 20px; font-size: 12px; }
.cell-input { width: 100%; height: 100%; border: none; padding: 4px 8px; font-size: 12px; background: #eff6ff; outline: none; font-family: inherit; }
.dark .cell-input { background: #1e3a5f; color: #e2e8f0; }

/* Command palette */
.cmd-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: flex-start; justify-content: center; padding-top: 100px; z-index: 300; animation: fadeIn 0.1s; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.cmd-box { width: 420px; max-width: 90vw; background: white; border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden; animation: slideDown 0.15s; }
.dark .cmd-box { background: #1e293b; }
@keyframes slideDown { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.cmd-input { width: 100%; padding: 14px 16px; border: none; border-bottom: 1px solid #e2e8f0; font-size: 15px; outline: none; }
.dark .cmd-input { background: #1e293b; border-color: #334155; color: #e2e8f0; }
.cmd-list { max-height: 260px; overflow-y: auto; }
.cmd-item { display: block; width: 100%; text-align: left; padding: 10px 16px; border: none; background: none; cursor: pointer; font-size: 13px; color: #334155; }
.dark .cmd-item { color: #e2e8f0; }
.cmd-item:hover { background: #f1f5f9; }
.dark .cmd-item:hover { background: #334155; }

/* Toasts */
.toast-area { position: fixed; bottom: 16px; right: 16px; display: flex; flex-direction: column; gap: 4px; z-index: 400; }
.toast { padding: 6px 16px; border-radius: 6px; font-size: 12px; color: white; animation: toastIn 0.3s, toastOut 0.3s 2.2s forwards; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
.t-ok { background: #10b981; } .t-err { background: #ef4444; } .t-info { background: #6366f1; }
@keyframes toastIn { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
@keyframes toastOut { from { opacity: 1; } to { opacity: 0; } }
</style>
`,
  },
];
