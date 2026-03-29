/**
 * Accessibility composables.
 *
 * Built-in a11y primitives that no other framework ships natively.
 * Focus management, screen reader announcements, and keyboard shortcuts.
 */

import { signal } from './signals.js';
import type { ReadonlySignal } from './signals.js';

// =========================================================================
// useFocusTrap
// =========================================================================

export interface FocusTrapOptions {
  /** CSS selector or element to focus initially (default: first focusable) */
  initialFocus?: string | HTMLElement;
  /** Return focus to the previously focused element on deactivate */
  returnFocus?: boolean;
  /** Escape key deactivates the trap (default: true) */
  escapeDeactivates?: boolean;
  /** Allow clicks outside the trap container (default: false) */
  allowOutsideClick?: boolean;
  /** Callback when Escape deactivates */
  onDeactivate?: () => void;
}

export interface FocusTrap {
  /** Activate the focus trap */
  activate(): void;
  /** Deactivate the focus trap */
  deactivate(): void;
  /** Whether the trap is currently active */
  active: ReadonlySignal<boolean>;
}

const FOCUSABLE_SELECTOR = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])', '[contenteditable]',
].join(', ');

/**
 * Trap focus inside a container element.
 *
 * ```ts
 * const trap = useFocusTrap(dialogRef, {
 *   initialFocus: '#first-input',
 *   returnFocus: true,
 *   escapeDeactivates: true,
 * });
 * trap.activate();   // on open
 * trap.deactivate(); // on close
 * ```
 */
export function useFocusTrap(
  container: HTMLElement | (() => HTMLElement | null),
  options: FocusTrapOptions = {},
): FocusTrap {
  const {
    initialFocus,
    returnFocus = true,
    escapeDeactivates = true,
    allowOutsideClick = false,
    onDeactivate,
  } = options;

  const active = signal(false);
  let previouslyFocused: HTMLElement | null = null;

  function getContainer(): HTMLElement | null {
    return typeof container === 'function' ? container() : container;
  }

  function getFocusableElements(): HTMLElement[] {
    const el = getContainer();
    if (!el) return [];
    return Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  }

  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && escapeDeactivates) {
      e.preventDefault();
      deactivate();
      onDeactivate?.();
      return;
    }

    if (e.key !== 'Tab') return;

    const focusable = getFocusableElements();
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      // Shift+Tab: wrap from first to last
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      // Tab: wrap from last to first
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function handleFocusOut(e: FocusEvent): void {
    if (!active() || allowOutsideClick) return;
    const el = getContainer();
    if (!el) return;

    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (relatedTarget && !el.contains(relatedTarget)) {
      // Focus escaped — pull it back
      const focusable = getFocusableElements();
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    }
  }

  function activate(): void {
    if (active()) return;
    active.set(true);

    previouslyFocused = document.activeElement as HTMLElement | null;

    document.addEventListener('keydown', handleKeyDown, true);

    const el = getContainer();
    if (el) {
      el.addEventListener('focusout', handleFocusOut);
    }

    // Focus the initial element
    requestAnimationFrame(() => {
      if (initialFocus) {
        const target = typeof initialFocus === 'string'
          ? getContainer()?.querySelector<HTMLElement>(initialFocus)
          : initialFocus;
        target?.focus();
      } else {
        const focusable = getFocusableElements();
        if (focusable.length > 0) focusable[0].focus();
      }
    });
  }

  function deactivate(): void {
    if (!active()) return;
    active.set(false);

    document.removeEventListener('keydown', handleKeyDown, true);

    const el = getContainer();
    if (el) {
      el.removeEventListener('focusout', handleFocusOut);
    }

    if (returnFocus && previouslyFocused) {
      previouslyFocused.focus();
      previouslyFocused = null;
    }
  }

  return {
    activate,
    deactivate,
    active: () => active(),
  };
}

// =========================================================================
// useAnnounce
// =========================================================================

export type AriaLive = 'polite' | 'assertive' | 'off';

let announceRegion: HTMLElement | null = null;

function ensureAnnounceRegion(): HTMLElement {
  if (announceRegion && document.body.contains(announceRegion)) {
    return announceRegion;
  }

  const el = document.createElement('div');
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-atomic', 'true');
  el.style.cssText = [
    'position: absolute',
    'width: 1px',
    'height: 1px',
    'padding: 0',
    'margin: -1px',
    'overflow: hidden',
    'clip: rect(0,0,0,0)',
    'white-space: nowrap',
    'border: 0',
  ].join('; ');

  document.body.appendChild(el);
  announceRegion = el;
  return el;
}

/**
 * Screen reader announcements via ARIA live regions.
 *
 * ```ts
 * const announce = useAnnounce();
 * announce('Page loaded: Dashboard');
 * announce('Error: Invalid email', 'assertive');
 * ```
 */
export function useAnnounce(): (message: string, politeness?: AriaLive) => void {
  return (message: string, politeness: AriaLive = 'polite') => {
    if (typeof document === 'undefined') return;

    const region = ensureAnnounceRegion();
    region.setAttribute('aria-live', politeness);

    // Clear then set to trigger announcement
    region.textContent = '';
    requestAnimationFrame(() => {
      region.textContent = message;
    });
  };
}

// =========================================================================
// useKeyboard
// =========================================================================

export interface KeyBinding {
  /** Key combo: 'mod+k', 'Escape', 'ArrowDown', 'shift+Enter' */
  key: string;
  /** Handler function */
  handler: (e: KeyboardEvent) => void;
  /** Optional scope (only active when scope is enabled) */
  scope?: string;
  /** Description for help dialog */
  description?: string;
  /** Prevent default browser behavior (default: true) */
  preventDefault?: boolean;
}

export interface KeyboardManager {
  /** Register a binding */
  bind(key: string, handler: (e: KeyboardEvent) => void, options?: {
    scope?: string;
    description?: string;
    preventDefault?: boolean;
  }): () => void;
  /** Enable a scope */
  enableScope(scope: string): void;
  /** Disable a scope */
  disableScope(scope: string): void;
  /** Get all bindings (for help dialog) */
  getBindings(): Array<{ key: string; description: string; scope?: string }>;
  /** Dispose all bindings */
  dispose(): void;
}

/**
 * Keyboard shortcut manager with scope support.
 *
 * ```ts
 * const kb = useKeyboard();
 * kb.bind('mod+k', () => openSearch(), { description: 'Open search' });
 * kb.bind('Escape', () => close(), { scope: 'modal' });
 * kb.enableScope('modal');
 * ```
 */
export function useKeyboard(): KeyboardManager {
  const bindings: KeyBinding[] = [];
  const activeScopes = new Set<string>();
  let listening = false;

  function handleKeyDown(e: KeyboardEvent): void {
    for (const binding of bindings) {
      if (binding.scope && !activeScopes.has(binding.scope)) continue;
      if (matchesKey(e, binding.key)) {
        if (binding.preventDefault !== false) {
          e.preventDefault();
        }
        binding.handler(e);
        return;
      }
    }
  }

  function startListening(): void {
    if (listening) return;
    if (typeof document === 'undefined') return;
    document.addEventListener('keydown', handleKeyDown);
    listening = true;
  }

  function bind(
    key: string,
    handler: (e: KeyboardEvent) => void,
    options?: { scope?: string; description?: string; preventDefault?: boolean },
  ): () => void {
    const binding: KeyBinding = {
      key,
      handler,
      scope: options?.scope,
      description: options?.description ?? '',
      preventDefault: options?.preventDefault,
    };
    bindings.push(binding);
    startListening();

    return () => {
      const idx = bindings.indexOf(binding);
      if (idx !== -1) bindings.splice(idx, 1);
    };
  }

  return {
    bind,
    enableScope(scope: string) { activeScopes.add(scope); },
    disableScope(scope: string) { activeScopes.delete(scope); },
    getBindings() {
      return bindings.map((b) => ({
        key: formatKeyCombo(b.key),
        description: b.description ?? '',
        scope: b.scope,
      }));
    },
    dispose() {
      bindings.length = 0;
      if (typeof document !== 'undefined') {
        document.removeEventListener('keydown', handleKeyDown);
      }
      listening = false;
    },
  };
}

// --- Key matching ---

function matchesKey(e: KeyboardEvent, combo: string): boolean {
  const parts = combo.toLowerCase().split('+');
  const key = parts.pop()!;

  const needsMod = parts.includes('mod');
  const needsCtrl = parts.includes('ctrl');
  const needsShift = parts.includes('shift');
  const needsAlt = parts.includes('alt');

  // mod = Cmd on Mac, Ctrl elsewhere
  const isMac = typeof navigator !== 'undefined' && navigator.platform?.includes('Mac');
  const modPressed = isMac ? e.metaKey : e.ctrlKey;

  if (needsMod && !modPressed) return false;
  if (needsCtrl && !e.ctrlKey) return false;
  if (needsShift && !e.shiftKey) return false;
  if (needsAlt && !e.altKey) return false;

  return e.key.toLowerCase() === key || e.code.toLowerCase() === key;
}

function formatKeyCombo(combo: string): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform?.includes('Mac');
  return combo
    .replace(/mod/gi, isMac ? '⌘' : 'Ctrl')
    .replace(/shift/gi, isMac ? '⇧' : 'Shift')
    .replace(/alt/gi, isMac ? '⌥' : 'Alt')
    .replace(/\+/g, isMac ? '' : '+');
}
