/**
 * Material Design 3 Expansion Panel / Accordion components.
 *
 * - <Accordion> — groups panels, optionally restricts to one open at a time
 * - <ExpansionPanel> — collapsible panel with header and content
 *
 * Supports:
 * - Single-open (default) and multi-open modes
 * - Controlled expanded state
 * - Custom headers with title + description
 * - Disabled / hideToggle
 * - Smooth height animation
 * - Keyboard: Enter/Space to toggle
 * - Transparent/flat variant
 * - Custom CSS class per panel
 * - Programmatic open/close via onOpen/onClose callbacks
 * - Nested/recursive panels
 */

import { defineComponent, effect, signal } from '@akashjs/runtime';
import type { AkashNode } from '@akashjs/runtime';

// --- Types ---

export interface AccordionProps {
  /** Allow multiple panels open simultaneously */
  multi?: boolean;
  /** Children — ExpansionPanel nodes */
  children?: () => AkashNode;
}

export interface ExpansionPanelProps {
  /** Controlled expanded state */
  expanded?: boolean;
  /** Callback when panel opens */
  onOpen?: () => void;
  /** Callback when panel closes */
  onClose?: () => void;
  /** Prevent toggling */
  disabled?: boolean;
  /** Hide the expand/collapse arrow */
  hideToggle?: boolean;
  /** Title text (simple API — or use children for custom header) */
  title?: string;
  /** Description text shown below title */
  description?: string;
  /** Visual variant */
  variant?: 'elevated' | 'flat';
  /** Custom CSS class */
  panelClass?: string;
  /** Header content (first child or explicit) */
  header?: () => AkashNode;
  /** Panel body content */
  content?: () => AkashNode;
}

// --- Helpers ---

function readProp<T>(val: T | (() => T)): T {
  return typeof val === 'function' ? (val as () => T)() : val as T;
}

function nodeToDOM(node: AkashNode): Node {
  if (node == null || typeof node === 'boolean') return document.createTextNode('');
  if (typeof node === 'string' || typeof node === 'number') return document.createTextNode(String(node));
  if (node instanceof Node) return node;
  if (Array.isArray(node)) {
    const frag = document.createDocumentFragment();
    for (const child of node) frag.appendChild(nodeToDOM(child));
    return frag;
  }
  return document.createTextNode(String(node));
}

// Inject animation styles once
function injectStyles() {
  if (document.getElementById('akash-expansion-styles')) return;
  const style = document.createElement('style');
  style.id = 'akash-expansion-styles';
  style.textContent = `
    .akash-expansion-body {
      overflow: hidden;
      transition: height 200ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    .akash-expansion-arrow {
      transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
      display: inline-flex; align-items: center; justify-content: center;
      width: 24px; height: 24px; flex-shrink: 0;
    }
  `;
  document.head.appendChild(style);
}

/** Resolve children from ctx — handles both JSX and plain function call patterns */
function resolveChildren(ctx: { children: () => AkashNode; props: any }): AkashNode {
  let children = ctx.children();
  if (children == null || (Array.isArray(children) && children.length === 0)) {
    const pc = ctx.props.children;
    if (typeof pc === 'function') children = pc();
    else if (pc != null) children = pc;
  }
  return children;
}

// --- Accordion registry ---
// Panels register with parent accordion for single-open coordination.
// Uses a simple DOM-data approach: accordion element stores a callback array.

const ACCORDION_KEY = '__akash_accordion';

interface AccordionRegistry {
  multi: boolean;
  panels: Set<{ collapse: () => void; el: HTMLElement }>;
  notifyOpen: (panel: { collapse: () => void; el: HTMLElement }) => void;
}

// --- Accordion Component ---

export const Accordion = defineComponent<AccordionProps>((ctx) => {
  return () => {
    const multi = ctx.props.multi ?? false;

    const wrapper = document.createElement('div');
    wrapper.className = 'akash-accordion';
    wrapper.setAttribute('role', 'presentation');
    wrapper.style.cssText = 'display: flex; flex-direction: column; gap: 0;';

    const registry: AccordionRegistry = {
      multi,
      panels: new Set(),
      notifyOpen(openedPanel) {
        if (!multi) {
          for (const p of registry.panels) {
            if (p !== openedPanel) p.collapse();
          }
        }
      },
    };
    (wrapper as any)[ACCORDION_KEY] = registry;

    // Render children
    const children = resolveChildren(ctx);
    if (children != null) {
      const items = Array.isArray(children) ? children : [children];
      for (const child of items) {
        if (child instanceof Node) wrapper.appendChild(child);
        else if (child != null) wrapper.appendChild(nodeToDOM(child));
      }
    }

    return wrapper;
  };
});

// --- ExpansionPanel Component ---

export const ExpansionPanel = defineComponent<ExpansionPanelProps>((ctx) => {
  return () => {
    injectStyles();

    const props = ctx.props;
    const disabled = props.disabled ?? false;
    const hideToggle = props.hideToggle ?? false;
    const variant = props.variant ?? 'elevated';
    const isFlat = variant === 'flat';

    const expanded = signal(readProp(props.expanded) ?? false);

    // --- Panel container ---
    const panel = document.createElement('div');
    panel.className = 'akash-expansion-panel';
    if (props.panelClass) panel.classList.add(props.panelClass);
    panel.setAttribute('role', 'region');
    panel.style.cssText = `
      background: var(--md-sys-color-surface, #fff);
      ${isFlat ? '' : 'box-shadow: 0 1px 3px rgba(0,0,0,0.08); border: 1px solid var(--md-sys-color-outline-variant, #c4c7c5);'}
      border-radius: ${isFlat ? '0' : '12px'};
      overflow: hidden;
      margin-bottom: ${isFlat ? '0' : '8px'};
      font-family: var(--md-sys-typescale-body-large-font, system-ui);
    `;

    // --- Header ---
    const header = document.createElement('div');
    header.className = 'akash-expansion-header';
    header.setAttribute('role', 'button');
    header.setAttribute('aria-expanded', String(expanded()));
    header.tabIndex = disabled ? -1 : 0;
    header.style.cssText = `
      display: flex; align-items: center; gap: 8px;
      padding: 12px 16px; min-height: 48px; box-sizing: border-box;
      cursor: ${disabled ? 'default' : 'pointer'};
      user-select: none;
      opacity: ${disabled ? '0.38' : '1'};
      transition: background 120ms;
    `;

    // Header content
    const headerContent = document.createElement('div');
    headerContent.style.cssText = 'flex: 1; display: flex; flex-direction: column; gap: 2px; overflow: hidden;';

    if (props.header) {
      // Custom header renderer
      headerContent.appendChild(nodeToDOM(props.header()));
    } else if (props.title) {
      // Simple title + optional description
      const titleEl = document.createElement('span');
      titleEl.style.cssText = `
        font-size: 14px; font-weight: 500;
        color: var(--md-sys-color-on-surface, #1c1b1f);
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      `;
      titleEl.textContent = props.title;
      headerContent.appendChild(titleEl);

      if (props.description) {
        const descEl = document.createElement('span');
        descEl.style.cssText = `
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant, #49454f);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        `;
        descEl.textContent = props.description;
        headerContent.appendChild(descEl);
      }
    } else {
      // Children-based header: first child is header content
      const children = resolveChildren(ctx);
      if (children != null) {
        if (Array.isArray(children) && children.length > 0) {
          headerContent.appendChild(nodeToDOM(children[0]));
        } else if (children instanceof Node) {
          // Single child — use as body, header is empty (programmatic panel)
        }
      }
    }

    header.appendChild(headerContent);

    // Arrow toggle
    if (!hideToggle) {
      const arrow = document.createElement('span');
      arrow.className = 'akash-expansion-arrow';
      arrow.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--md-sys-color-on-surface-variant, #49454f)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`;

      // Rotate arrow reactively
      effect(() => {
        arrow.style.transform = expanded() ? 'rotate(180deg)' : 'rotate(0deg)';
      });

      header.appendChild(arrow);
    }

    // Hover
    if (!disabled) {
      header.addEventListener('mouseenter', () => {
        header.style.background = 'var(--md-sys-color-surface-container-highest, #e6e0e9)';
      });
      header.addEventListener('mouseleave', () => {
        header.style.background = '';
      });
    }

    panel.appendChild(header);

    // --- Body wrapper (for animated height) ---
    const bodyWrapper = document.createElement('div');
    bodyWrapper.className = 'akash-expansion-body';

    const bodyInner = document.createElement('div');
    bodyInner.style.cssText = 'padding: 0 16px 16px;';

    // Render body content
    if (props.content) {
      bodyInner.appendChild(nodeToDOM(props.content()));
    } else {
      const children = resolveChildren(ctx);
      if (children != null) {
        if (Array.isArray(children)) {
          // Skip first child (used as header), rest is body
          for (let i = (props.title || props.header) ? 0 : 1; i < children.length; i++) {
            bodyInner.appendChild(nodeToDOM(children[i]));
          }
        } else if (children instanceof Node) {
          bodyInner.appendChild(children);
        }
      }
    }

    bodyWrapper.appendChild(bodyInner);
    panel.appendChild(bodyWrapper);

    // --- Animated expand/collapse ---
    // Track last known state to detect actual changes
    let currentlyOpen = expanded();

    const TRANSITION = 'height 200ms cubic-bezier(0.4, 0, 0.2, 1)';

    function animateExpand() {
      // Snap to 0px without transition
      bodyWrapper.style.transition = 'none';
      bodyWrapper.style.height = 'auto';
      const fullH = bodyWrapper.scrollHeight;
      bodyWrapper.style.height = '0px';
      // Double rAF: first commits the 0px frame, second starts the transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          bodyWrapper.style.transition = TRANSITION;
          bodyWrapper.style.height = `${fullH}px`;
          const onEnd = () => {
            bodyWrapper.style.height = 'auto';
            bodyWrapper.removeEventListener('transitionend', onEnd);
          };
          bodyWrapper.addEventListener('transitionend', onEnd);
        });
      });
    }

    function animateCollapse() {
      // Snap to explicit current height without transition
      bodyWrapper.style.transition = 'none';
      bodyWrapper.style.height = `${bodyWrapper.scrollHeight}px`;
      // Double rAF: first commits the explicit height, second starts the transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          bodyWrapper.style.transition = TRANSITION;
          bodyWrapper.style.height = '0px';
        });
      });
    }

    function applyExpanded(open: boolean, animate: boolean) {
      if (open) {
        if (animate) {
          animateExpand();
        } else {
          bodyWrapper.style.height = 'auto';
        }
      } else {
        if (animate) {
          animateCollapse();
        } else {
          bodyWrapper.style.height = '0px';
        }
      }
      header.setAttribute('aria-expanded', String(open));
    }

    // Initial state (no animation)
    applyExpanded(currentlyOpen, false);

    // React to signal changes — always animate after initial render
    effect(() => {
      const open = expanded();
      if (open === currentlyOpen) return; // no actual change
      currentlyOpen = open;
      applyExpanded(open, true);
    });

    // Sync from external prop only when it's reactive (a function/signal).
    // Static booleans like expanded: true are used only as initial value —
    // syncing them would fight the internal toggle on every click.
    const rawExpanded = props.expanded;
    if (typeof rawExpanded === 'function') {
      effect(() => {
        const ext = (rawExpanded as () => boolean)();
        if (ext !== expanded()) {
          expanded.set(ext);
        }
      });
    }

    // --- Toggle ---
    function toggle() {
      if (disabled) return;
      const next = !expanded();
      expanded.set(next);
      if (next) {
        props.onOpen?.();
        // Notify accordion to collapse siblings
        const accordion = findAccordion(panel);
        if (accordion) accordion.notifyOpen(panelHandle);
      } else {
        props.onClose?.();
      }
    }

    header.addEventListener('click', toggle);
    header.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });

    // --- Register with parent accordion ---
    const panelHandle = {
      collapse: () => {
        if (expanded()) {
          expanded.set(false);
          props.onClose?.();
        }
      },
      el: panel,
    };

    // Deferred registration (parent may not be in DOM yet)
    requestAnimationFrame(() => {
      const accordion = findAccordion(panel);
      if (accordion) {
        accordion.panels.add(panelHandle);
        // If initially expanded, notify accordion
        if (expanded()) accordion.notifyOpen(panelHandle);
      }
    });

    return panel;
  };
});

// Walk up DOM to find parent accordion
function findAccordion(el: HTMLElement): AccordionRegistry | null {
  let node: HTMLElement | null = el.parentElement;
  while (node) {
    if ((node as any)[ACCORDION_KEY]) return (node as any)[ACCORDION_KEY];
    node = node.parentElement;
  }
  return null;
}
