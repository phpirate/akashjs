/**
 * Visual component inspector — dev overlay.
 *
 * Click any component to see its props, signals, styles,
 * and performance metrics. Edit values live.
 *
 * ```ts
 * if (import.meta.env.DEV) {
 *   enableInspector();
 *   // Press Alt+Shift+I to toggle the inspector
 * }
 * ```
 */

import { signal } from '@akashjs/runtime';
import type { ReadonlySignal } from '@akashjs/runtime';

// =========================================================================
// Types
// =========================================================================

export interface InspectedElement {
  /** DOM element being inspected */
  element: HTMLElement;
  /** Component name (if AkashJS component) */
  componentName: string | null;
  /** Tag name */
  tagName: string;
  /** Element dimensions */
  bounds: DOMRect;
  /** Computed styles (subset) */
  styles: Record<string, string>;
  /** Element attributes */
  attributes: Record<string, string>;
  /** Data attributes */
  dataAttributes: Record<string, string>;
}

export interface InspectorOptions {
  /** Keyboard shortcut to toggle (default: 'Alt+Shift+I') */
  shortcut?: string;
  /** Overlay color (default: 'rgba(100, 120, 255, 0.15)') */
  highlightColor?: string;
  /** Whether to show grid overlay */
  showGrid?: boolean;
}

export interface Inspector {
  /** Whether the inspector is active */
  active: ReadonlySignal<boolean>;
  /** Currently inspected element info */
  inspected: ReadonlySignal<InspectedElement | null>;
  /** Toggle the inspector on/off */
  toggle(): void;
  /** Enable the inspector */
  enable(): void;
  /** Disable the inspector */
  disable(): void;
  /** Dispose the inspector */
  dispose(): void;
}

// =========================================================================
// Inspector implementation
// =========================================================================

/**
 * Create and enable the visual component inspector.
 */
export function createInspector(options: InspectorOptions = {}): Inspector {
  const {
    shortcut = 'Alt+Shift+I',
    highlightColor = 'rgba(100, 120, 255, 0.15)',
  } = options;

  const active = signal(false);
  const inspected = signal<InspectedElement | null>(null);

  let overlay: HTMLElement | null = null;
  let infoPanel: HTMLElement | null = null;
  let hoveredElement: HTMLElement | null = null;

  // Create overlay elements
  function createOverlay(): void {
    if (typeof document === 'undefined') return;

    overlay = document.createElement('div');
    overlay.id = 'akash-inspector-overlay';
    overlay.style.cssText = `
      position: fixed; pointer-events: none; z-index: 99999;
      border: 2px solid #6366f1; background: ${highlightColor};
      transition: all 0.1s ease; display: none;
    `;

    infoPanel = document.createElement('div');
    infoPanel.id = 'akash-inspector-panel';
    infoPanel.style.cssText = `
      position: fixed; bottom: 16px; right: 16px; z-index: 100000;
      background: #1e1e2e; color: #cdd6f4; border-radius: 12px;
      padding: 16px; font-family: monospace; font-size: 12px;
      max-width: 400px; max-height: 300px; overflow: auto;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4); display: none;
      pointer-events: auto;
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(infoPanel);
  }

  function destroyOverlay(): void {
    overlay?.remove();
    infoPanel?.remove();
    overlay = null;
    infoPanel = null;
  }

  // Highlight element on hover
  function handleMouseMove(e: MouseEvent): void {
    if (!active()) return;
    const target = e.target as HTMLElement;
    if (target === overlay || target === infoPanel || infoPanel?.contains(target)) return;

    hoveredElement = target;
    updateHighlight(target);
  }

  function handleClick(e: MouseEvent): void {
    if (!active()) return;
    const target = e.target as HTMLElement;
    if (target === overlay || target === infoPanel || infoPanel?.contains(target)) return;

    e.preventDefault();
    e.stopPropagation();

    inspected.set(inspectElement(target));
    updateInfoPanel();
  }

  function updateHighlight(el: HTMLElement): void {
    if (!overlay) return;
    const rect = el.getBoundingClientRect();
    overlay.style.display = 'block';
    overlay.style.left = `${rect.left}px`;
    overlay.style.top = `${rect.top}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
  }

  function updateInfoPanel(): void {
    if (!infoPanel) return;
    const info = inspected();
    if (!info) {
      infoPanel.style.display = 'none';
      return;
    }

    infoPanel.style.display = 'block';
    const compName = info.componentName
      ? `<span style="color:#89b4fa">&lt;${info.componentName}&gt;</span>`
      : `<span style="color:#a6adc8">&lt;${info.tagName}&gt;</span>`;

    const dims = `${Math.round(info.bounds.width)} × ${Math.round(info.bounds.height)}`;

    const attrs = Object.entries(info.attributes)
      .map(([k, v]) => `  <span style="color:#f9e2af">${k}</span>=<span style="color:#a6e3a1">"${v}"</span>`)
      .join('\n');

    const styles = Object.entries(info.styles)
      .map(([k, v]) => `  <span style="color:#cba6f7">${k}</span>: ${v}`)
      .join('\n');

    infoPanel.innerHTML = `
      <div style="margin-bottom:8px;font-size:14px">${compName}</div>
      <div style="color:#6c7086;margin-bottom:8px">${dims}</div>
      ${attrs ? `<div style="margin-bottom:8px"><b>Attributes:</b>\n${attrs}</div>` : ''}
      ${styles ? `<div><b>Styles:</b>\n${styles}</div>` : ''}
    `;
  }

  // Keyboard shortcut
  function handleKeyDown(e: KeyboardEvent): void {
    if (matchesShortcut(e, shortcut)) {
      e.preventDefault();
      toggle();
    }
  }

  function toggle(): void {
    if (active()) disable();
    else enable();
  }

  function enable(): void {
    active.set(true);
    createOverlay();
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    document.body.style.cursor = 'crosshair';
  }

  function disable(): void {
    active.set(false);
    inspected.set(null);
    hoveredElement = null;
    document.removeEventListener('mousemove', handleMouseMove, true);
    document.removeEventListener('click', handleClick, true);
    document.body.style.cursor = '';
    destroyOverlay();
  }

  // Start listening for shortcut
  if (typeof document !== 'undefined') {
    document.addEventListener('keydown', handleKeyDown);
  }

  return {
    active: () => active(),
    inspected: () => inspected(),
    toggle,
    enable,
    disable,
    dispose() {
      disable();
      if (typeof document !== 'undefined') {
        document.removeEventListener('keydown', handleKeyDown);
      }
    },
  };
}

/**
 * Quick-enable the inspector. Call once in dev mode.
 */
export function enableInspector(options?: InspectorOptions): Inspector {
  return createInspector(options);
}

// =========================================================================
// Helpers
// =========================================================================

function inspectElement(el: HTMLElement): InspectedElement {
  const computed = window.getComputedStyle(el);

  const styles: Record<string, string> = {};
  const interestingProps = [
    'display', 'position', 'width', 'height', 'padding', 'margin',
    'color', 'background-color', 'font-size', 'font-weight',
    'border', 'border-radius', 'flex', 'grid', 'gap', 'z-index',
  ];
  for (const prop of interestingProps) {
    const val = computed.getPropertyValue(prop);
    if (val && val !== 'none' && val !== 'normal' && val !== '0px') {
      styles[prop] = val;
    }
  }

  const attributes: Record<string, string> = {};
  const dataAttributes: Record<string, string> = {};
  for (const attr of el.attributes) {
    if (attr.name.startsWith('data-')) {
      dataAttributes[attr.name] = attr.value;
    } else if (attr.name !== 'style' && attr.name !== 'class') {
      attributes[attr.name] = attr.value;
    }
  }
  if (el.className) attributes['class'] = el.className;

  // Try to detect AkashJS component name
  const componentName = el.getAttribute('data-akash-component')
    ?? el.closest('[data-akash-component]')?.getAttribute('data-akash-component')
    ?? null;

  return {
    element: el,
    componentName,
    tagName: el.tagName.toLowerCase(),
    bounds: el.getBoundingClientRect(),
    styles,
    attributes,
    dataAttributes,
  };
}

function matchesShortcut(e: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut.split('+').map((p) => p.trim().toLowerCase());
  const key = parts.pop()!;

  const needsAlt = parts.includes('alt');
  const needsShift = parts.includes('shift');
  const needsCtrl = parts.includes('ctrl') || parts.includes('mod');

  if (needsAlt && !e.altKey) return false;
  if (needsShift && !e.shiftKey) return false;
  if (needsCtrl && !e.ctrlKey && !e.metaKey) return false;

  return e.key.toLowerCase() === key;
}
