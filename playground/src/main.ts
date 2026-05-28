import './styles.css';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, highlightActiveLine, rectangularSelection, crosshairCursor } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle, indentOnInput, bracketMatching, foldGutter, foldKeymap } from '@codemirror/language';
import { html } from '@codemirror/lang-html';
import { oneDark } from '@codemirror/theme-one-dark';
import { closeBrackets, closeBracketsKeymap, autocompletion, completionKeymap } from '@codemirror/autocomplete';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { lintKeymap } from '@codemirror/lint';
import { examples } from './examples';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { CompileResponse } from './compiler.worker';

// ── State ──────────────────────────────────────────────────────────
let currentSource = '';
let compiledJS = '';
let compiledCSS = '';
let compileError = '';
let compileRequestId = 0;
let activeOutputTab: 'result' | 'js' | 'css' | 'console' = 'result';
let consoleLog: { type: string; text: string }[] = [];
let debounceTimer: number | null = null;

// ── Compiler Worker ────────────────────────────────────────────────
const worker = new Worker(
  new URL('./compiler.worker.ts', import.meta.url),
  { type: 'module' }
);

worker.onmessage = (e: MessageEvent<CompileResponse>) => {
  const { id, code, css: cssOutput, error } = e.data;
  if (id < compileRequestId) return;

  if (error) {
    compileError = error;
    compiledJS = '';
    compiledCSS = '';
  } else {
    compileError = '';
    compiledJS = code || '';
    compiledCSS = cssOutput || '';
  }

  updateOutput();
};

function requestCompile(source: string) {
  compileRequestId++;
  worker.postMessage({
    id: compileRequestId,
    source,
    filename: 'App.akash',
  });
}

// ── URL Sharing ────────────────────────────────────────────────────
function getSourceFromURL(): string | null {
  const hash = window.location.hash.slice(1);
  if (!hash) return null;
  try {
    return decompressFromEncodedURIComponent(hash);
  } catch {
    return null;
  }
}

function shareURL() {
  const compressed = compressToEncodedURIComponent(currentSource);
  const url = window.location.origin + window.location.pathname + '#' + compressed;
  window.history.replaceState(null, '', '#' + compressed);
  navigator.clipboard.writeText(url).then(() => {
    showToast('Link copied to clipboard!');
  }).catch(() => {
    showToast('URL updated — copy from address bar');
  });
}

function showToast(message: string) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

// ── DOM Construction ───────────────────────────────────────────────
const app = document.getElementById('app')!;

// Header
const header = document.createElement('div');
header.className = 'header';

const headerLeft = document.createElement('div');
headerLeft.className = 'header-left';

const logo = document.createElement('a');
logo.className = 'logo';
logo.href = 'https://akash.js.org';
logo.target = '_blank';
logo.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 32 32" style="vertical-align: middle; margin-right: 6px;"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#6750A4"/><stop offset="50%" style="stop-color:#3b82f6"/><stop offset="100%" style="stop-color:#10b981"/></linearGradient></defs><rect width="32" height="32" rx="8" fill="url(#g)"/><text x="16" y="22" font-family="Inter, sans-serif" font-weight="800" font-size="18" fill="white" text-anchor="middle">A</text></svg>AkashJS <span>Playground</span>';

const select = document.createElement('select');
select.className = 'example-select';
examples.forEach((ex, i) => {
  const opt = document.createElement('option');
  opt.value = String(i);
  opt.textContent = ex.name;
  select.appendChild(opt);
});
select.addEventListener('change', () => {
  const ex = examples[parseInt(select.value)];
  setSource(ex.source);
  window.location.hash = '';
});

headerLeft.appendChild(logo);
headerLeft.appendChild(select);

const headerRight = document.createElement('div');
headerRight.className = 'header-right';

const shareBtn = document.createElement('button');
shareBtn.className = 'btn';
shareBtn.textContent = 'Share';
shareBtn.addEventListener('click', shareURL);

const resetBtn = document.createElement('button');
resetBtn.className = 'btn';
resetBtn.textContent = 'Reset';
resetBtn.addEventListener('click', () => {
  setSource(examples[parseInt(select.value)].source);
  window.location.hash = '';
});

headerRight.appendChild(shareBtn);
headerRight.appendChild(resetBtn);

header.appendChild(headerLeft);
header.appendChild(headerRight);

// Panels
const panels = document.createElement('div');
panels.className = 'panels';

// Left panel — Editor
const leftPanel = document.createElement('div');
leftPanel.className = 'panel';

const editorTabs = document.createElement('div');
editorTabs.className = 'tabs';
const editorTab = document.createElement('button');
editorTab.className = 'tab active';
editorTab.textContent = 'App.akash';
editorTabs.appendChild(editorTab);

const editorContainer = document.createElement('div');
editorContainer.className = 'editor-container';

const errorBanner = document.createElement('div');
errorBanner.className = 'error-banner';
errorBanner.style.display = 'none';

leftPanel.appendChild(editorTabs);
leftPanel.appendChild(editorContainer);
leftPanel.appendChild(errorBanner);

// Right panel — Output
const rightPanel = document.createElement('div');
rightPanel.className = 'panel';

const outputTabs = document.createElement('div');
outputTabs.className = 'tabs';

const tabNames: { id: typeof activeOutputTab; label: string }[] = [
  { id: 'result', label: 'Result' },
  { id: 'js', label: 'JS Output' },
  { id: 'css', label: 'CSS Output' },
  { id: 'console', label: 'Console' },
];

const tabButtons: Record<string, HTMLButtonElement> = {};
tabNames.forEach(({ id, label }) => {
  const btn = document.createElement('button');
  btn.className = 'tab' + (id === 'result' ? ' active' : '');
  btn.textContent = label;
  btn.addEventListener('click', () => {
    activeOutputTab = id;
    Object.values(tabButtons).forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateOutput();
  });
  tabButtons[id] = btn;
  outputTabs.appendChild(btn);
});

const outputContent = document.createElement('div');
outputContent.style.flex = '1';
outputContent.style.display = 'flex';
outputContent.style.flexDirection = 'column';
outputContent.style.minHeight = '0';

rightPanel.appendChild(outputTabs);
rightPanel.appendChild(outputContent);

panels.appendChild(leftPanel);
panels.appendChild(rightPanel);

app.appendChild(header);
app.appendChild(panels);

// ── CodeMirror Editor ──────────────────────────────────────────────
const editor = new EditorView({
  state: EditorState.create({
    doc: '',
    extensions: [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      history(),
      foldGutter(),
      drawSelection(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      bracketMatching(),
      closeBrackets(),
      autocompletion(),
      rectangularSelection(),
      crosshairCursor(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
        ...lintKeymap,
        indentWithTab,
      ]),
      html(),
      oneDark,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          currentSource = update.state.doc.toString();
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = window.setTimeout(() => {
            requestCompile(currentSource);
          }, 300);
        }
      }),
    ],
  }),
  parent: editorContainer,
});

// ── Runtime shim for preview iframe ────────────────────────────────
const RUNTIME_SHIM = `
let __batchDepth = 0;
const __pendingEffects = new Set();

function __flush() {
  if (__batchDepth > 0) return;
  const effs = [...__pendingEffects];
  __pendingEffects.clear();
  for (const e of effs) e._run();
}

let __currentEffect = null;

function signal(initial) {
  let value = initial;
  const subs = new Set();
  const read = () => {
    if (__currentEffect) subs.add(__currentEffect);
    return value;
  };
  read.set = (v) => {
    if (Object.is(value, v)) return;
    value = v;
    for (const s of subs) __pendingEffects.add(s);
    __flush();
  };
  read.update = (fn) => read.set(fn(value));
  read.peek = () => value;
  read._subs = subs;
  return read;
}

function computed(fn) {
  let cached, dirty = true;
  const subs = new Set();
  const eff = { _run() { dirty = true; for (const s of subs) __pendingEffects.add(s); __flush(); } };
  const read = () => {
    if (__currentEffect) subs.add(__currentEffect);
    if (dirty) {
      const prev = __currentEffect;
      __currentEffect = eff;
      try { cached = fn(); } finally { __currentEffect = prev; }
      dirty = false;
    }
    return cached;
  };
  read.peek = () => { read(); return cached; };
  return read;
}

function effect(fn) {
  const eff = {
    _run() {
      if (eff._cleanup) { try { eff._cleanup(); } catch(e) {} eff._cleanup = null; }
      const prev = __currentEffect;
      __currentEffect = eff;
      try {
        const cleanup = fn();
        if (typeof cleanup === 'function') eff._cleanup = cleanup;
      } finally { __currentEffect = prev; }
    },
    _cleanup: null
  };
  eff._run();
  return () => { if (eff._cleanup) { try { eff._cleanup(); } catch(e) {} } };
}

function batch(fn) {
  __batchDepth++;
  try { return fn(); }
  finally { __batchDepth--; __flush(); }
}

function untrack(fn) {
  const prev = __currentEffect;
  __currentEffect = null;
  try { return fn(); }
  finally { __currentEffect = prev; }
}

function defineComponent(setup) {
  const comp = (props) => {
    const ctx = { props: props || {}, children: () => null };
    const render = setup(ctx);
    return typeof render === 'function' ? render() : render;
  };
  comp._akash = true;
  return comp;
}

function onMount(fn) { queueMicrotask(fn); }
function onUnmount() {}
function provide() {}
function inject() {}
function createContext() { return {}; }
function ref(el) { return { current: el }; }

// __getter — marks a function as reactive (used by compiler for <For each={...}>)
function __getter(fn) {
  fn.__reactive = true;
  return fn;
}

// For component — renders a keyed list
// The compiler replaces a <!--$--> comment with the return value of For().
// We return a container div (display:contents) with an anchor comment inside.
// On each reactive update we clear old nodes and re-render before the anchor.
function For(props) {
  const wrapper = document.createDocumentFragment();
  const startAnchor = document.createComment('for-start');
  const endAnchor = document.createComment('for-end');
  wrapper.appendChild(startAnchor);
  wrapper.appendChild(endAnchor);

  let nodes = [];

  // Use a microtask to defer the first render until the fragment is in the DOM
  // (replaceChild inserts the fragment's children, then we can find parentNode)
  queueMicrotask(() => {
    effect(() => {
      const eachProp = props.each;
      const items = typeof eachProp === 'function' ? eachProp() : eachProp;

      // Remove old nodes
      for (const n of nodes) { if (n.parentNode) n.parentNode.removeChild(n); }
      nodes = [];

      const parent = endAnchor.parentNode;
      if (!parent) return;

      if (items && items.length) {
        for (let i = 0; i < items.length; i++) {
          const el = props.children(items[i], i);
          parent.insertBefore(el, endAnchor);
          nodes.push(el);
        }
      }
    });
  });

  return wrapper;
}
`;

// ── Output Renderers ───────────────────────────────────────────────
function updateOutput() {
  if (compileError) {
    errorBanner.style.display = 'block';
    errorBanner.textContent = compileError;
  } else {
    errorBanner.style.display = 'none';
  }

  outputContent.innerHTML = '';

  switch (activeOutputTab) {
    case 'result': renderPreview(); break;
    case 'js': renderCode(compiledJS || '// Compile to see output'); break;
    case 'css': renderCode(compiledCSS || '/* No styles */'); break;
    case 'console': renderConsole(); break;
  }
}

function renderPreview() {
  if (compileError || !compiledJS) {
    const div = document.createElement('div');
    div.className = 'preview-container';
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.justifyContent = 'center';
    div.style.color = '#94a3b8';
    div.style.fontSize = '14px';
    div.textContent = compileError ? 'Fix errors to see preview' : 'Compiling...';
    outputContent.appendChild(div);
    return;
  }

  const container = document.createElement('div');
  container.className = 'preview-container';
  const iframe = document.createElement('iframe');
  container.appendChild(iframe);
  outputContent.appendChild(container);

  // Rewrite compiled code: remove import statements (runtime is inlined)
  const code = compiledJS
    .replace(/import\s*\{[^}]*\}\s*from\s*['"][^'"]*['"]\s*;?/g, '')
    .replace(/export\s+default\s+/, 'var __default__ = ')
    .replace(/export\s*\{[^}]*\}\s*;?/g, '');

  // Use a blob URL to avoid </script> escaping issues entirely.
  // The script content can contain any characters safely.
  const htmlContent = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
body { margin: 16px; font-family: system-ui, sans-serif; }
${compiledCSS || ''}
</style></head><body><div id="app"></div></body></html>`;

  const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
  const htmlURL = URL.createObjectURL(htmlBlob);
  iframe.src = htmlURL;

  iframe.onload = () => {
    URL.revokeObjectURL(htmlURL);
    const doc = iframe.contentDocument!;
    const win = iframe.contentWindow! as any;

    // Console intercept
    const origLog = win.console.log;
    const origWarn = win.console.warn;
    const origError = win.console.error;
    function send(level: string, args: any) {
      try {
        window.postMessage({ type: 'console', level, text: Array.from(args).map((a: any) => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') }, '*');
      } catch(e) {}
    }
    win.console.log = function() { send('log', arguments); origLog.apply(win.console, arguments); };
    win.console.warn = function() { send('warn', arguments); origWarn.apply(win.console, arguments); };
    win.console.error = function() { send('error', arguments); origError.apply(win.console, arguments); };

    // Create and inject script
    const script = doc.createElement('script');
    script.textContent = `
${RUNTIME_SHIM}
${code}

// Mount
var __comp = typeof App !== 'undefined' ? App : typeof __default__ !== 'undefined' ? __default__ : null;
if (__comp) document.getElementById('app').appendChild(__comp({}));
`;
    // Wrap in try/catch by using error event
    win.addEventListener('error', (e: any) => {
      doc.getElementById('app')!.innerHTML = '<pre style="color:red;white-space:pre-wrap">' + e.message + '</pre>';
      win.console.error(e.message);
    });
    doc.body.appendChild(script);
  };
}

function renderCode(code: string) {
  const container = document.createElement('div');
  container.className = 'output-container';
  const pre = document.createElement('pre');
  pre.textContent = code;
  container.appendChild(pre);
  outputContent.appendChild(container);
}

function renderConsole() {
  const container = document.createElement('div');
  container.className = 'console-container';
  if (consoleLog.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'console-entry';
    empty.textContent = 'Console output will appear here...';
    container.appendChild(empty);
  } else {
    for (const entry of consoleLog) {
      const div = document.createElement('div');
      div.className = 'console-entry' + (entry.type === 'error' ? ' error' : entry.type === 'warn' ? ' warn' : '');
      div.textContent = entry.text;
      container.appendChild(div);
    }
  }
  outputContent.appendChild(container);
}

// Console messages from iframe
window.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'console') {
    consoleLog.push({ type: e.data.level, text: e.data.text });
    if (consoleLog.length > 200) consoleLog = consoleLog.slice(-100);
    if (activeOutputTab === 'console') updateOutput();
  }
});

// ── Set source ─────────────────────────────────────────────────────
function setSource(source: string) {
  currentSource = source;
  consoleLog = [];
  editor.dispatch({
    changes: { from: 0, to: editor.state.doc.length, insert: source },
  });
  requestCompile(source);
}

// ── Init ───────────────────────────────────────────────────────────
const urlSource = getSourceFromURL();
if (urlSource) {
  setSource(urlSource);
  const idx = examples.findIndex(e => e.source.trim() === urlSource.trim());
  if (idx >= 0) select.value = String(idx);
} else {
  setSource(examples[0].source);
}
