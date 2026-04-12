/**
 * DevTools visual overlay panel.
 *
 * Toggled with Ctrl+Shift+D. Self-contained DOM — no .akash components.
 * Reads store state via __getStoreInstances(), live-updates via effects.
 *
 * Dev-only: tree-shaken in production builds.
 */

import { effect } from './signals.js';
import { __getStoreInstances } from './store.js';

const PANEL_ID = '__akash-devtools-panel';
const BADGE_ID = '__akash-devtools-badge';

// --- Styles ---

const STYLES = `
#${PANEL_ID} {
  position: fixed; bottom: 0; right: 0; width: 420px; height: 360px;
  background: #1e1e2e; color: #cdd6f4; font-family: 'SF Mono', Consolas, monospace;
  font-size: 12px; border-top: 2px solid #7c3aed; border-left: 2px solid #7c3aed;
  z-index: 999999; display: flex; flex-direction: column; overflow: hidden;
  border-radius: 8px 0 0 0; box-shadow: -4px -4px 20px rgba(0,0,0,0.4);
}
#${PANEL_ID} .dt-header {
  display: flex; align-items: center; padding: 6px 10px;
  background: #181825; border-bottom: 1px solid #313244; user-select: none;
}
#${PANEL_ID} .dt-header span { font-weight: 600; color: #7c3aed; flex: 1; }
#${PANEL_ID} .dt-tabs { display: flex; gap: 2px; }
#${PANEL_ID} .dt-tab {
  padding: 3px 8px; border-radius: 4px; cursor: pointer; color: #6c7086;
  background: transparent; border: none; font-size: 11px; font-family: inherit;
}
#${PANEL_ID} .dt-tab:hover { color: #cdd6f4; background: #313244; }
#${PANEL_ID} .dt-tab.active { color: #cdd6f4; background: #7c3aed; }
#${PANEL_ID} .dt-close {
  background: none; border: none; color: #6c7086; cursor: pointer;
  font-size: 14px; padding: 2px 6px; margin-left: 4px;
}
#${PANEL_ID} .dt-close:hover { color: #f38ba8; }
#${PANEL_ID} .dt-body { flex: 1; overflow: auto; padding: 8px 10px; }
#${PANEL_ID} .dt-store-list { display: flex; flex-direction: column; gap: 6px; }
#${PANEL_ID} .dt-store {
  background: #313244; border-radius: 4px; padding: 6px 8px; cursor: pointer;
}
#${PANEL_ID} .dt-store:hover { background: #45475a; }
#${PANEL_ID} .dt-store-id { color: #89b4fa; font-weight: 600; margin-bottom: 4px; }
#${PANEL_ID} .dt-kv { display: flex; gap: 6px; padding: 1px 0; }
#${PANEL_ID} .dt-key { color: #a6adc8; }
#${PANEL_ID} .dt-val { color: #a6e3a1; }
#${PANEL_ID} .dt-val.str { color: #f9e2af; }
#${PANEL_ID} .dt-val.bool { color: #fab387; }
#${PANEL_ID} .dt-val.null { color: #6c7086; font-style: italic; }
#${PANEL_ID} .dt-section { color: #6c7086; font-size: 10px; text-transform: uppercase; margin: 8px 0 4px; }
#${PANEL_ID} .dt-empty { color: #6c7086; font-style: italic; padding: 20px; text-align: center; }
#${BADGE_ID} {
  position: fixed; bottom: 12px; right: 12px; width: 36px; height: 36px;
  background: #7c3aed; color: white; border-radius: 50%; display: flex;
  align-items: center; justify-content: center; cursor: pointer;
  z-index: 999998; font-size: 16px; box-shadow: 0 2px 8px rgba(124,58,237,0.4);
  border: none; font-family: inherit;
}
#${BADGE_ID}:hover { background: #6d28d9; transform: scale(1.1); }
`;

// --- Value formatting ---

function formatValue(val: unknown): { text: string; cls: string } {
  if (val === null) return { text: 'null', cls: 'null' };
  if (val === undefined) return { text: 'undefined', cls: 'null' };
  if (typeof val === 'boolean') return { text: String(val), cls: 'bool' };
  if (typeof val === 'string') return { text: `"${val.length > 40 ? val.slice(0, 40) + '...' : val}"`, cls: 'str' };
  if (typeof val === 'number') return { text: String(val), cls: '' };
  if (Array.isArray(val)) return { text: `Array(${val.length})`, cls: '' };
  if (typeof val === 'object') {
    try {
      const keys = Object.keys(val);
      return { text: `{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ', ...' : ''}}`, cls: '' };
    } catch { return { text: '[Object]', cls: '' }; }
  }
  return { text: String(val), cls: '' };
}

// --- Panel rendering ---

let panelEl: HTMLElement | null = null;
let badgeEl: HTMLElement | null = null;
let isOpen = false;
let activeTab = 'stores';
let disposeUpdate: (() => void) | null = null;

function renderKV(key: string, val: unknown): string {
  const { text, cls } = formatValue(val);
  return `<div class="dt-kv"><span class="dt-key">${key}:</span><span class="dt-val ${cls}">${text}</span></div>`;
}

function renderStoresTab(): string {
  const instances = __getStoreInstances();
  const ids = Object.keys(instances);
  if (ids.length === 0) return '<div class="dt-empty">No stores registered</div>';

  let html = '<div class="dt-store-list">';
  for (const id of ids) {
    const store = instances[id];
    const snap = store.$snapshot();
    html += `<div class="dt-store"><div class="dt-store-id">${id}</div>`;
    for (const [key, val] of Object.entries(snap)) {
      html += renderKV(key, val);
    }
    html += '</div>';
  }
  html += '</div>';
  return html;
}

function renderRoutesTab(): string {
  const devtools = (globalThis as any).__AKASH_DEVTOOLS__;
  if (!devtools) return '<div class="dt-empty">DevTools API not installed</div>';
  // Route info not directly available here — show what we can
  return '<div class="dt-empty">Route info available via __AKASH_DEVTOOLS__</div>';
}

function renderBody(): string {
  switch (activeTab) {
    case 'stores': return renderStoresTab();
    case 'routes': return renderRoutesTab();
    default: return '<div class="dt-empty">Tab not implemented</div>';
  }
}

function updatePanel(): void {
  if (!panelEl || !isOpen) return;
  const body = panelEl.querySelector('.dt-body');
  if (body) body.innerHTML = renderBody();
}

function createPanel(): HTMLElement {
  const el = document.createElement('div');
  el.id = PANEL_ID;

  const tabs = ['stores', 'routes'];
  const tabHtml = tabs.map(t =>
    `<button class="dt-tab ${t === activeTab ? 'active' : ''}" data-tab="${t}">${t}</button>`
  ).join('');

  el.innerHTML = `
    <div class="dt-header">
      <span>AkashJS DevTools</span>
      <div class="dt-tabs">${tabHtml}</div>
      <button class="dt-close" title="Close">&times;</button>
    </div>
    <div class="dt-body">${renderBody()}</div>
  `;

  // Tab switching
  el.querySelectorAll('.dt-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = (btn as HTMLElement).dataset.tab ?? 'stores';
      el.querySelectorAll('.dt-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updatePanel();
    });
  });

  // Close button
  el.querySelector('.dt-close')?.addEventListener('click', () => togglePanel());

  return el;
}

function createBadge(): HTMLElement {
  const el = document.createElement('button');
  el.id = BADGE_ID;
  el.textContent = '\u{1f527}';
  el.title = 'AkashJS DevTools (Ctrl+Shift+D)';
  el.addEventListener('click', () => togglePanel());
  return el;
}

function togglePanel(): void {
  if (isOpen) {
    panelEl?.remove();
    panelEl = null;
    if (disposeUpdate) { disposeUpdate(); disposeUpdate = null; }
    badgeEl!.style.display = '';
    isOpen = false;
  } else {
    panelEl = createPanel();
    document.body.appendChild(panelEl);
    badgeEl!.style.display = 'none';
    isOpen = true;

    // Live update every time any store signal changes
    disposeUpdate = effect(() => {
      // Read all store signals to track them
      const instances = __getStoreInstances();
      for (const store of Object.values(instances)) {
        try { store.$snapshot(); } catch { /* ignore */ }
      }
      // Update DOM
      updatePanel();
    });
  }
}

// --- Public API ---

export function mountDevtoolsOverlay(): void {
  if (typeof document === 'undefined' || !document.head || !document.body) return;

  // Inject styles
  const style = document.createElement('style');
  style.textContent = STYLES;
  document.head.appendChild(style);

  // Create badge
  badgeEl = createBadge();
  document.body.appendChild(badgeEl);

  // Keyboard shortcut: Ctrl+Shift+D
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      togglePanel();
    }
  });
}
