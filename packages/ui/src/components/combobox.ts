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
    if (!term) return ctx.props.options ?? [];
    return (ctx.props.options ?? []).filter((item) => filter(item, term));
  });

  function selectItem(item: unknown): void {
    ctx.props.onSelect?.(item);
    searchTerm.set(display(item));
    isOpen.set(false);
  }

  return () => {
    const container = document.createElement('div');
    container.style.cssText = `position: relative; display: inline-block; width: ${ctx.props.width ?? '100%'};`;

    // --- Input ---
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = ctx.props.placeholder ?? 'Search...';
    input.disabled = ctx.props.disabled ?? false;
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

    // Set initial display value
    if (ctx.props.value != null) {
      input.value = display(ctx.props.value);
    }

    input.addEventListener('focus', () => {
      isOpen.set(true);
      input.style.borderColor = 'var(--md-sys-color-primary, #6750a4)';
    });

    input.addEventListener('blur', () => {
      // Delay close to allow click on options
      setTimeout(() => {
        isOpen.set(false);
        input.style.borderColor = 'var(--md-sys-color-outline, #79747e)';
      }, 200);
    });

    input.addEventListener('input', () => {
      searchTerm.set(input.value);
      isOpen.set(true);
      highlightIndex.set(0);
    });

    input.addEventListener('keydown', (e) => {
      const items = filtered();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        highlightIndex.update(i => Math.min(i + 1, items.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        highlightIndex.update(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const idx = highlightIndex();
        if (idx >= 0 && idx < items.length) {
          selectItem(items[idx]);
        }
      } else if (e.key === 'Escape') {
        isOpen.set(false);
        input.blur();
      }
    });

    container.appendChild(input);

    // --- Dropdown panel ---
    const panel = document.createElement('div');
    panel.setAttribute('role', 'listbox');
    panel.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      width: ${ctx.props.panelWidth ?? '100%'};
      z-index: 3000;
      background: var(--md-sys-color-surface-container, #fff);
      border-radius: 0 0 4px 4px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      max-height: 240px;
      overflow: auto;
      display: none;
    `;

    // Reactively update panel content
    effect(() => {
      const open = isOpen();
      const items = filtered();
      const idx = highlightIndex();

      panel.style.display = open ? 'block' : 'none';
      panel.innerHTML = '';

      if (items.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'padding: 12px 16px; color: var(--md-sys-color-on-surface-variant, #888); font-size: 14px;';
        empty.textContent = ctx.props.emptyMessage ?? 'No results';
        panel.appendChild(empty);
        return;
      }

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const option = document.createElement('div');
        option.setAttribute('role', 'option');
        option.textContent = display(item);
        const isHighlighted = i === idx;
        const isSelected = ctx.props.value != null && display(item) === display(ctx.props.value);
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

        panel.appendChild(option);
      }
    }, { render: true });

    container.appendChild(panel);
    return container;
  };
});
