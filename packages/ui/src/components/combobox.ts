/**
 * Material Design 3 Combobox / Autocomplete component.
 *
 * Searchable dropdown with text input, filtered results panel,
 * keyboard navigation, and async option support.
 *
 * ```ts
 * Combobox({
 *   options: items(),
 *   value: selected(),
 *   displayFn: (item) => item.name,
 *   filterFn: (item, term) => item.name.toLowerCase().includes(term),
 *   onSelect: (item) => selected.set(item),
 *   placeholder: 'Search...',
 * })
 * ```
 */

import { defineComponent, signal, computed, effect } from '@akashjs/runtime';
import type { AkashNode } from '@akashjs/runtime';

export interface ComboboxProps<T = unknown> {
  options: T[];
  value?: T | null;
  displayFn?: (item: T) => string;
  filterFn?: (item: T, searchTerm: string) => boolean;
  onSelect?: (item: T) => void;
  placeholder?: string;
  disabled?: boolean;
  width?: string;
  panelWidth?: string;
  emptyMessage?: string;
  /** Anchor the dropdown to an external element instead of the built-in input. Can be an element or a function returning one. */
  triggerEl?: HTMLElement | (() => HTMLElement | null) | null;
  /** Whether the dropdown is open (for external trigger control) */
  open?: boolean;
  /** Called when the dropdown should close */
  onClose?: () => void;
  searchable?: boolean;
}

export const Combobox = defineComponent<ComboboxProps>((ctx) => {
  const searchTerm = signal('');
  const isOpen = signal(false);
  const highlightIndex = signal(-1);

  const display = ctx.props.displayFn ?? String;
  const filter = ctx.props.filterFn ?? ((item: unknown, term: string) =>
    String(display(item)).toLowerCase().includes(term.toLowerCase())
  );

  const filtered = computed(() => {
    const term = searchTerm().trim();
    const opts = readProp(ctx.props.options) ?? [];
    if (!term) return opts;
    return opts.filter((item: unknown) => filter(item, term));
  });

  const hasCustomTrigger = ctx.props.triggerEl !== undefined;

  /** Resolve triggerEl — supports both direct element and function returning element */
  function getTriggerEl(): HTMLElement | null {
    const t = ctx.props.triggerEl;
    if (typeof t === 'function') return t();
    return t ?? null;
  }

  function selectItem(item: unknown): void {
    ctx.props.onSelect?.(item);
    searchTerm.set(display(item));
    isOpen.set(false);
    ctx.props.onClose?.();
  }

  function closePanel(): void {
    isOpen.set(false);
    ctx.props.onClose?.();
  }

  /** Unwrap a prop that may be a __getter function or a plain value */
  function readProp<T>(val: T | (() => T)): T {
    return typeof val === 'function' ? (val as () => T)() : val as T;
  }

  // Sync external open prop with internal state
  if (hasCustomTrigger) {
    effect(() => {
      const externalOpen = readProp(ctx.props.open) ?? false;
      isOpen.set(!!externalOpen);
    });
  }

  return () => {
    const container = document.createElement('div');
    container.style.cssText = hasCustomTrigger
      ? 'position: relative; display: inline-block;'
      : `position: relative; display: inline-block; width: ${ctx.props.width ?? '100%'};`;

    // --- Search input (inside panel for custom trigger, standalone otherwise) ---
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = ctx.props.placeholder ?? 'Search...';
    input.disabled = ctx.props.disabled ?? false;

    if (!hasCustomTrigger) {
      // Standalone mode: input is the trigger
      input.style.cssText = `
        width: 100%;
        padding: 12px 16px;
        border: 1px solid var(--md-sys-color-outline, #79747e);
        border-radius: 4px;
        font-size: 14px;
        font-family: inherit;
        background: var(--md-sys-color-surface, #fff);
        color: var(--md-sys-color-on-surface, #1c1b1f);
        outline: none;
        box-sizing: border-box;
      `;
      const initVal = readProp(ctx.props.value);
      if (initVal != null) input.value = display(initVal);
      input.addEventListener('focus', () => { isOpen.set(true); input.style.borderColor = 'var(--md-sys-color-primary, #6750a4)'; });
      input.addEventListener('blur', () => { setTimeout(() => { closePanel(); input.style.borderColor = 'var(--md-sys-color-outline, #79747e)'; }, 200); });
      container.appendChild(input);
    } else {
      // Custom trigger mode: search input goes inside the panel
      input.style.cssText = `
        width: 100%;
        padding: 8px 12px;
        border: none;
        border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
        font-size: 14px;
        font-family: inherit;
        background: transparent;
        color: var(--md-sys-color-on-surface, #1c1b1f);
        outline: none;
        box-sizing: border-box;
      `;
    }

    input.addEventListener('input', () => { searchTerm.set(input.value); isOpen.set(true); highlightIndex.set(0); });
    input.addEventListener('keydown', (e) => {
      const items = filtered();
      if (e.key === 'ArrowDown') { e.preventDefault(); highlightIndex.update(i => Math.min(i + 1, items.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); highlightIndex.update(i => Math.max(i - 1, 0)); }
      else if (e.key === 'Enter') { e.preventDefault(); const idx = highlightIndex(); if (idx >= 0 && idx < items.length) selectItem(items[idx]); }
      else if (e.key === 'Escape') closePanel();
    });

    // --- Dropdown panel ---
    const panel = document.createElement('div');
    panel.setAttribute('role', 'listbox');
    // Always use position:fixed + body portal to avoid overflow:hidden clipping
    panel.style.cssText = `
      position: fixed;
      z-index: 3000;
      width: ${ctx.props.panelWidth ?? (hasCustomTrigger ? '240px' : '100%')};
      background: var(--md-sys-color-surface-container, #fff);
      border-radius: ${hasCustomTrigger ? '4px' : '0 0 4px 4px'};
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      max-height: ${hasCustomTrigger ? '280px' : '240px'};
      overflow: auto;
      display: none;
    `;

    // In custom trigger mode, add search input at top of panel
    if (hasCustomTrigger) {
      panel.appendChild(input);
    }

    // Options container (separate from search input so we can clear it without losing input)
    const optionsContainer = document.createElement('div');
    panel.appendChild(optionsContainer);

    // Reactively update panel content + positioning
    effect(() => {
      const open = isOpen();
      const items = filtered();
      const idx = highlightIndex();

      // Position panel below anchor element (trigger or input)
      if (open) {
        const anchor = hasCustomTrigger ? getTriggerEl() : input;
        if (anchor) {
          const rect = anchor.getBoundingClientRect();
          panel.style.top = `${rect.bottom + 2}px`;
          panel.style.left = `${rect.left}px`;
          if (!hasCustomTrigger) panel.style.width = `${rect.width}px`;
        }
        if (hasCustomTrigger) setTimeout(() => input.focus(), 0);
      }

      panel.style.display = open ? 'block' : 'none';
      optionsContainer.innerHTML = '';

      if (items.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'padding: 12px 16px; color: var(--md-sys-color-on-surface-variant, #888); font-size: 14px;';
        empty.textContent = ctx.props.emptyMessage ?? 'No results';
        optionsContainer.appendChild(empty);
        return;
      }

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const option = document.createElement('div');
        option.setAttribute('role', 'option');
        option.textContent = display(item);
        const isHighlighted = i === idx;
        const curValue = readProp(ctx.props.value);
        const isSelected = curValue != null && display(item) === display(curValue);
        option.style.cssText = `
          padding: 10px 16px;
          cursor: pointer;
          font-size: 14px;
          background: ${isHighlighted ? 'var(--md-sys-color-surface-container-highest, #f0f0f0)' : ''};
          font-weight: ${isSelected ? '600' : 'normal'};
          display: flex;
          align-items: center;
          gap: 8px;
        `;

        if (isSelected) {
          const check = document.createElement('span');
          check.textContent = '✓';
          check.style.cssText = 'color: var(--md-sys-color-primary, #6750a4); font-size: 16px;';
          option.prepend(check);
        }

        option.addEventListener('mousedown', (e) => {
          e.preventDefault(); // prevent blur
          selectItem(item);
        });
        option.addEventListener('mouseenter', () => {
          highlightIndex.set(i);
        });

        optionsContainer.appendChild(option);
      }
    }, { render: true });

    // Always append panel to document.body — avoids overflow:hidden clipping
    if (typeof document !== 'undefined') {
      document.body.appendChild(panel);
    }

    // Outside click handler — deferred to avoid catching the same click that opened the panel
    let outsideClickActive = false;
    effect(() => {
      const open = isOpen();
      if (open) {
        // Enable outside-click on next frame (after the opening click finishes bubbling)
        outsideClickActive = false;
        requestAnimationFrame(() => { outsideClickActive = true; });
      } else {
        outsideClickActive = false;
      }
    });
    document.addEventListener('click', (e) => {
      if (!outsideClickActive) return;
      const trigger = getTriggerEl();
      const isInsidePanel = panel.contains(e.target as Node);
      const isInsideContainer = container.contains(e.target as Node);
      const isOnTrigger = trigger ? trigger.contains(e.target as Node) : false;
      if (!isInsidePanel && !isInsideContainer && !isOnTrigger) {
        closePanel();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen()) closePanel();
    });

    return container;
  };
});
