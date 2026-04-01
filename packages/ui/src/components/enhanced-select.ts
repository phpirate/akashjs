/**
 * Material Design 3 Enhanced Select component.
 *
 * Custom dropdown overlay (not native <select>) with:
 * - Single select and multi-select modes
 * - Built-in search/filter with debounce
 * - Option groups (<OptionGroup>)
 * - Custom option rendering
 * - Keyboard navigation (arrows, Enter, Escape, Home, End, type-ahead)
 * - Click outside to close
 * - Panel positioning (above/below based on viewport)
 * - Disabled state, disabled individual options
 * - compareWith for object equality
 * - MD3 styling with CSS custom properties
 *
 * ```ts
 * EnhancedSelect({
 *   value: selectedSite(),
 *   onChange: (v) => selectedSite.set(v),
 *   searchable: true,
 *   placeholder: 'Select site...',
 *   compareWith: (a, b) => a?.id === b?.id,
 *   options: sites().map(s => ({ value: s, label: s.name })),
 * })
 * ```
 */

import { defineComponent, effect, signal } from '@akashjs/runtime';
import type { AkashNode } from '@akashjs/runtime';

// --- Types ---

export interface EnhancedSelectOption<T = any> {
  /** The value associated with this option */
  value: T;
  /** Display label */
  label: string;
  /** Whether this option is disabled */
  disabled?: boolean;
  /** Optional group label (for ungrouped options API) */
  group?: string;
  /** Optional icon (Material Symbols name) */
  icon?: string;
}

export interface EnhancedSelectOptionGroup<T = any> {
  /** Group label */
  label: string;
  /** Options in this group */
  options: EnhancedSelectOption<T>[];
}

export interface EnhancedSelectProps<T = any> {
  /** Current value (single mode) or values (multi mode) */
  value?: T | T[];
  /** Options array */
  options?: EnhancedSelectOption<T>[];
  /** Grouped options */
  groups?: EnhancedSelectOptionGroup<T>[];
  /** Change handler — receives single value or array depending on multiple */
  onChange?: (value: T | T[]) => void;
  /** Enable multi-select mode */
  multiple?: boolean;
  /** Enable search/filter input */
  searchable?: boolean;
  /** Debounce time for search in ms (default: 200) */
  searchDebounce?: number;
  /** Placeholder text */
  placeholder?: string;
  /** Label text (floating label) */
  label?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Custom equality function for matching values */
  compareWith?: (a: T, b: T) => boolean;
  /** Custom option renderer */
  renderOption?: (option: EnhancedSelectOption<T>) => AkashNode;
  /** Custom selected value display renderer */
  renderValue?: (selected: T | T[]) => AkashNode;
  /** Message when search yields no results */
  noResultsMessage?: string;
  /** Minimum width (default: '210px') */
  width?: string;
  /** Custom panel class */
  panelClass?: string;
  /** Max visible options before scroll (default: 6) */
  maxVisible?: number;
  /** Whether to close panel after selection in single mode (default: true) */
  autoClose?: boolean;
  /** "Select all" in multi mode */
  showSelectAll?: boolean;
  /** "Clear" button */
  clearable?: boolean;
}

// --- Helper ---

function readProp<T>(val: T | (() => T)): T {
  return typeof val === 'function' ? (val as () => T)() : val as T;
}

function nodeToDOM(node: AkashNode): Node {
  if (node == null || typeof node === 'boolean') return document.createTextNode('');
  if (typeof node === 'string' || typeof node === 'number') return document.createTextNode(String(node));
  if (node instanceof Node) return node;
  return document.createTextNode(String(node));
}

// --- Component ---

export const EnhancedSelect = defineComponent<EnhancedSelectProps>((ctx) => {
  return () => {
    const props = ctx.props;
    const multiple = props.multiple ?? false;
    const searchable = props.searchable ?? false;
    const searchDebounce = props.searchDebounce ?? 200;
    const placeholder = props.placeholder ?? '';
    const labelText = props.label;
    const disabled = props.disabled ?? false;
    const noResultsMessage = props.noResultsMessage ?? 'No results found';
    const maxVisible = props.maxVisible ?? 6;
    const autoClose = props.autoClose ?? true;
    const showSelectAll = props.showSelectAll ?? false;
    const clearable = props.clearable ?? false;
    const optionHeight = 44;
    const compare = props.compareWith ?? ((a: any, b: any) => a === b);

    // Flatten groups into options with group labels
    function getAllOptions(): EnhancedSelectOption[] {
      if (props.groups) {
        const result: EnhancedSelectOption[] = [];
        for (const g of props.groups) {
          for (const o of g.options) {
            result.push({ ...o, group: g.label });
          }
        }
        return result;
      }
      return props.options ?? [];
    }

    // --- State ---
    const isOpen = signal(false);
    const searchText = signal('');
    const highlightIndex = signal(0);

    // --- Build DOM ---
    const wrapper = document.createElement('div');
    wrapper.className = 'akash-enhanced-select';
    wrapper.style.cssText = `
      position: relative; display: inline-flex; flex-direction: column;
      min-width: ${props.width ?? '210px'}; font-family: var(--md-sys-typescale-body-large-font, system-ui);
      font-size: 16px;
    `;

    // --- Trigger field ---
    const field = document.createElement('div');
    field.setAttribute('role', 'combobox');
    field.setAttribute('aria-expanded', 'false');
    field.setAttribute('aria-haspopup', 'listbox');
    field.tabIndex = disabled ? -1 : 0;
    field.style.cssText = `
      position: relative; display: flex; align-items: center;
      min-height: 56px; border-radius: 4px;
      border: 1px solid var(--md-sys-color-outline, #79747e);
      background: transparent; cursor: ${disabled ? 'default' : 'pointer'};
      transition: border-color 200ms, border-width 200ms;
      padding: ${labelText ? '20px 40px 8px 16px' : '16px 40px 16px 16px'};
      box-sizing: border-box;
      ${disabled ? 'opacity: 0.38; pointer-events: none;' : ''}
    `;

    // --- Floating label ---
    let labelEl: HTMLElement | null = null;
    if (labelText) {
      labelEl = document.createElement('label');
      labelEl.textContent = labelText;
      labelEl.style.cssText = `
        position: absolute; left: 16px;
        color: var(--md-sys-color-on-surface-variant, #49454f);
        font-size: 16px; top: 50%; transform: translateY(-50%);
        transition: all 200ms cubic-bezier(0.2, 0, 0, 1);
        pointer-events: none; z-index: 1;
      `;
      field.appendChild(labelEl);
    }

    function floatLabel(float: boolean) {
      if (!labelEl) return;
      if (float) {
        labelEl.style.fontSize = '12px';
        labelEl.style.top = '-8px';
        labelEl.style.transform = 'none';
        labelEl.style.backgroundColor = 'var(--md-sys-color-surface, #fffbfe)';
        labelEl.style.padding = '0 4px';
      } else {
        labelEl.style.fontSize = '16px';
        labelEl.style.top = '50%';
        labelEl.style.transform = 'translateY(-50%)';
        labelEl.style.backgroundColor = 'transparent';
        labelEl.style.padding = '0';
      }
    }

    // --- Display value ---
    const displayEl = document.createElement('span');
    displayEl.style.cssText = `
      flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      color: var(--md-sys-color-on-surface, #1d1b20); min-height: 20px;
    `;
    field.appendChild(displayEl);

    // --- Clear button ---
    if (clearable) {
      const clearBtn = document.createElement('span');
      clearBtn.textContent = '✕';
      clearBtn.style.cssText = `
        font-size: 14px; padding: 4px; cursor: pointer; display: none;
        color: var(--md-sys-color-on-surface-variant, #49454f);
        margin-right: 4px;
      `;
      clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        props.onChange?.(multiple ? [] as any : undefined as any);
      });
      field.appendChild(clearBtn);

      // Show/hide clear button reactively
      effect(() => {
        const val = readProp(props.value);
        const hasVal = multiple
          ? Array.isArray(val) && val.length > 0
          : val != null && val !== '';
        clearBtn.style.display = hasVal ? 'inline' : 'none';
      });
    }

    // --- Arrow icon ---
    const arrow = document.createElement('div');
    arrow.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--md-sys-color-on-surface-variant, #49454f)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`;
    arrow.style.cssText = `
      position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
      pointer-events: none; display: flex; align-items: center;
      transition: transform 200ms;
    `;
    field.appendChild(arrow);

    wrapper.appendChild(field);

    // --- Panel (dropdown overlay) ---
    const panel = document.createElement('div');
    panel.setAttribute('role', 'listbox');
    panel.style.cssText = `
      position: fixed; z-index: 3000;
      min-width: 210px;
      background: var(--md-sys-color-surface-container, #fff);
      color: var(--md-sys-color-on-surface, #1c1b1f);
      border-radius: 4px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.1);
      padding: 0;
      opacity: 0; transform: scaleY(0.8); transform-origin: top left;
      transition: opacity 120ms, transform 120ms cubic-bezier(0, 0, 0.2, 1);
      pointer-events: none;
      overflow: hidden;
      font-family: inherit; font-size: 14px;
    `;
    if (props.panelClass) panel.classList.add(props.panelClass);
    document.body.appendChild(panel);

    // --- Search input ---
    let searchInput: HTMLInputElement | null = null;
    if (searchable) {
      const searchWrap = document.createElement('div');
      searchWrap.style.cssText = 'padding: 8px; border-bottom: 1px solid var(--md-sys-color-outline-variant, #c4c7c5);';
      searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.placeholder = 'Search...';
      searchInput.style.cssText = `
        width: 100%; padding: 8px 12px; border: 1px solid var(--md-sys-color-outline, #79747e);
        border-radius: 4px; outline: none; font-size: 14px; font-family: inherit;
        background: var(--md-sys-color-surface, #fff); color: inherit; box-sizing: border-box;
      `;
      let debounceTimer: any;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          searchText.set(searchInput!.value);
          highlightIndex.set(0);
        }, searchDebounce);
      });
      searchInput.addEventListener('keydown', handleKeydown);
      searchWrap.appendChild(searchInput);
      panel.appendChild(searchWrap);
    }

    // --- Select All (multi mode) ---
    if (multiple && showSelectAll) {
      const saWrap = document.createElement('div');
      saWrap.style.cssText = `
        padding: 8px 16px; border-bottom: 1px solid var(--md-sys-color-outline-variant, #c4c7c5);
        display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px;
        color: var(--md-sys-color-primary, #6750a4); font-weight: 500;
      `;
      saWrap.textContent = 'Select All';
      saWrap.addEventListener('click', () => {
        const filtered = getFilteredOptions();
        const allValues = filtered.filter(o => !o.disabled).map(o => o.value);
        props.onChange?.(allValues as any);
      });
      panel.appendChild(saWrap);
    }

    // --- Options container (scrollable) ---
    const optionsContainer = document.createElement('div');
    optionsContainer.style.cssText = `
      overflow-y: auto; max-height: ${maxVisible * optionHeight}px;
    `;
    panel.appendChild(optionsContainer);

    // --- Render options reactively ---
    function getFilteredOptions(): EnhancedSelectOption[] {
      const all = getAllOptions();
      const text = searchText().toLowerCase().trim();
      if (!text) return all;
      return all.filter(o => o.label.toLowerCase().includes(text));
    }

    function isSelected(optValue: any, currentValue: any): boolean {
      if (multiple) {
        return Array.isArray(currentValue) && currentValue.some((v: any) => compare(v, optValue));
      }
      return currentValue != null && compare(currentValue, optValue);
    }

    effect(() => {
      const filtered = getFilteredOptions();
      const val = readProp(props.value);
      const hiIdx = highlightIndex();
      optionsContainer.textContent = '';

      if (filtered.length === 0) {
        const noResults = document.createElement('div');
        noResults.style.cssText = `
          padding: 16px; text-align: center; font-style: italic;
          color: var(--md-sys-color-on-surface-variant, #49454f);
        `;
        noResults.textContent = noResultsMessage;
        optionsContainer.appendChild(noResults);
        return;
      }

      // Track groups for grouped rendering
      let currentGroup: string | undefined;
      let flatIdx = 0;

      for (const opt of filtered) {
        // Group header
        if (opt.group && opt.group !== currentGroup) {
          currentGroup = opt.group;
          const groupHeader = document.createElement('div');
          groupHeader.style.cssText = `
            padding: 8px 16px 4px; font-size: 11px; font-weight: 500;
            text-transform: uppercase; letter-spacing: 0.5px;
            color: var(--md-sys-color-on-surface-variant, #49454f);
          `;
          groupHeader.textContent = opt.group;
          optionsContainer.appendChild(groupHeader);
        }

        const optEl = document.createElement('div');
        optEl.setAttribute('role', 'option');
        optEl.dataset.index = String(flatIdx);
        const selected = isSelected(opt.value, val);
        const highlighted = flatIdx === hiIdx;
        optEl.setAttribute('aria-selected', String(selected));
        optEl.style.cssText = `
          display: flex; align-items: center; gap: 12px;
          padding: 10px 16px 10px ${opt.group ? '32px' : '16px'}; min-height: ${optionHeight}px; box-sizing: border-box;
          cursor: ${opt.disabled ? 'default' : 'pointer'};
          opacity: ${opt.disabled ? '0.38' : '1'};
          background: ${highlighted ? 'var(--md-sys-color-surface-container-highest, #e6e0e9)' : 'transparent'};
          transition: background 80ms;
        `;

        // Multi: checkbox
        if (multiple) {
          const cb = document.createElement('span');
          cb.style.cssText = `
            width: 18px; height: 18px; border-radius: 2px;
            border: 2px solid ${selected ? 'var(--md-sys-color-primary, #6750a4)' : 'var(--md-sys-color-outline, #79747e)'};
            background: ${selected ? 'var(--md-sys-color-primary, #6750a4)' : 'transparent'};
            display: flex; align-items: center; justify-content: center;
            color: var(--md-sys-color-on-primary, #fff); font-size: 12px; flex-shrink: 0;
          `;
          cb.textContent = selected ? '✓' : '';
          optEl.appendChild(cb);
        } else if (selected) {
          const check = document.createElement('span');
          check.textContent = '✓';
          check.style.cssText = 'color: var(--md-sys-color-primary, #6750a4); font-size: 16px; flex-shrink: 0; width: 18px;';
          optEl.appendChild(check);
        }

        // Icon
        if (opt.icon) {
          const icon = document.createElement('span');
          icon.className = 'material-symbols-outlined';
          icon.textContent = opt.icon;
          icon.style.fontSize = '20px';
          optEl.appendChild(icon);
        }

        // Label (custom or text)
        if (props.renderOption) {
          optEl.appendChild(nodeToDOM(props.renderOption(opt)));
        } else {
          const label = document.createElement('span');
          label.style.cssText = 'flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
          label.textContent = opt.label;
          optEl.appendChild(label);
        }

        if (!opt.disabled) {
          optEl.addEventListener('mouseenter', () => {
            highlightIndex.set(parseInt(optEl.dataset.index!, 10));
          });
          optEl.addEventListener('click', (e) => {
            e.stopPropagation();
            selectOption(opt);
          });
        }

        optionsContainer.appendChild(optEl);
        flatIdx++;
      }
    });

    // --- Update display value reactively ---
    effect(() => {
      const val = readProp(props.value);
      const allOpts = getAllOptions();
      const open = isOpen();

      const hasVal = multiple
        ? Array.isArray(val) && val.length > 0
        : val != null && val !== '';
      const labelFloated = hasVal || open;

      // Float label: when empty+unfocused the label IS the placeholder (centered).
      // When focused or has value, label floats above and placeholder can show.
      floatLabel(labelFloated);

      if (props.renderValue) {
        displayEl.textContent = '';
        displayEl.appendChild(nodeToDOM(props.renderValue(val)));
      } else if (multiple && Array.isArray(val)) {
        if (val.length === 0) {
          // Empty: show placeholder only when label is floated (open/focused),
          // otherwise show nothing (the label acts as placeholder)
          displayEl.textContent = labelFloated ? placeholder : (labelText ? '' : placeholder);
          displayEl.style.color = 'var(--md-sys-color-on-surface-variant, #49454f)';
        } else {
          const labels = val.map((v: any) => {
            const opt = allOpts.find(o => compare(o.value, v));
            return opt ? opt.label : String(v);
          });
          displayEl.textContent = labels.join(', ');
          displayEl.style.color = 'var(--md-sys-color-on-surface, #1d1b20)';
        }
      } else if (hasVal) {
        const opt = allOpts.find(o => compare(o.value, val));
        displayEl.textContent = opt ? opt.label : String(val);
        displayEl.style.color = 'var(--md-sys-color-on-surface, #1d1b20)';
      } else {
        // Empty: show placeholder only when label is floated, otherwise
        // the floating label itself serves as the placeholder
        displayEl.textContent = labelFloated ? placeholder : (labelText ? '' : placeholder);
        displayEl.style.color = 'var(--md-sys-color-on-surface-variant, #49454f)';
      }

      // Arrow rotation
      arrow.style.transform = open
        ? 'translateY(-50%) rotate(180deg)'
        : 'translateY(-50%) rotate(0deg)';

      // Field focus style
      if (open) {
        field.style.borderWidth = '2px';
        field.style.borderColor = 'var(--md-sys-color-primary, #6750a4)';
        if (labelEl) labelEl.style.color = 'var(--md-sys-color-primary, #6750a4)';
      } else {
        field.style.borderWidth = '1px';
        field.style.borderColor = 'var(--md-sys-color-outline, #79747e)';
        if (labelEl) labelEl.style.color = 'var(--md-sys-color-on-surface-variant, #49454f)';
      }
    });

    // --- Toggle panel ---
    function positionPanel() {
      const rect = field.getBoundingClientRect();
      const panelMaxH = maxVisible * optionHeight + (searchable ? 56 : 0) + (showSelectAll ? 40 : 0);
      const spaceBelow = window.innerHeight - rect.bottom;
      const openAbove = spaceBelow < panelMaxH && rect.top > spaceBelow;

      panel.style.width = `${rect.width}px`;
      panel.style.left = `${rect.left}px`;
      if (openAbove) {
        panel.style.bottom = `${window.innerHeight - rect.top + 4}px`;
        panel.style.top = '';
        panel.style.transformOrigin = 'bottom left';
      } else {
        panel.style.top = `${rect.bottom + 4}px`;
        panel.style.bottom = '';
        panel.style.transformOrigin = 'top left';
      }
    }

    function openPanel() {
      if (disabled) return;
      isOpen.set(true);
      field.setAttribute('aria-expanded', 'true');
      positionPanel();
      panel.style.opacity = '1';
      panel.style.transform = 'scaleY(1)';
      panel.style.pointerEvents = 'auto';
      searchText.set('');
      highlightIndex.set(0);
      if (searchInput) {
        searchInput.value = '';
        requestAnimationFrame(() => searchInput!.focus());
      }
    }

    function closePanel() {
      isOpen.set(false);
      field.setAttribute('aria-expanded', 'false');
      panel.style.opacity = '0';
      panel.style.transform = 'scaleY(0.8)';
      panel.style.pointerEvents = 'none';
    }

    function togglePanel() {
      if (isOpen()) closePanel(); else openPanel();
    }

    // --- Selection ---
    function selectOption(opt: EnhancedSelectOption) {
      if (opt.disabled) return;
      if (multiple) {
        const current = (readProp(props.value) as any[]) ?? [];
        const idx = current.findIndex((v: any) => compare(v, opt.value));
        const next = [...current];
        if (idx >= 0) next.splice(idx, 1); else next.push(opt.value);
        props.onChange?.(next as any);
      } else {
        props.onChange?.(opt.value);
        if (autoClose) closePanel();
      }
    }

    // --- Click handlers ---
    field.addEventListener('click', togglePanel);

    // Outside click — deferred
    let outsideActive = false;
    effect(() => {
      if (isOpen()) {
        outsideActive = false;
        requestAnimationFrame(() => { outsideActive = true; });
      } else {
        outsideActive = false;
      }
    });
    document.addEventListener('click', (e) => {
      if (!outsideActive) return;
      if (!panel.contains(e.target as Node) && !field.contains(e.target as Node)) {
        closePanel();
      }
    });

    // Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen()) closePanel();
    });

    // --- Keyboard navigation ---
    function handleKeydown(e: KeyboardEvent) {
      const filtered = getFilteredOptions();
      const max = filtered.length - 1;
      const hi = highlightIndex();

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          highlightIndex.set(Math.min(hi + 1, max));
          scrollToHighlighted();
          break;
        case 'ArrowUp':
          e.preventDefault();
          highlightIndex.set(Math.max(hi - 1, 0));
          scrollToHighlighted();
          break;
        case 'Home':
          e.preventDefault();
          highlightIndex.set(0);
          scrollToHighlighted();
          break;
        case 'End':
          e.preventDefault();
          highlightIndex.set(max);
          scrollToHighlighted();
          break;
        case 'Enter':
          e.preventDefault();
          if (filtered[hi] && !filtered[hi].disabled) {
            selectOption(filtered[hi]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          closePanel();
          field.focus();
          break;
        case ' ':
          if (!searchable) {
            e.preventDefault();
            if (!isOpen()) { openPanel(); }
            else if (filtered[hi] && !filtered[hi].disabled) {
              selectOption(filtered[hi]);
            }
          }
          break;
      }
    }

    field.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!isOpen()) openPanel();
        else handleKeydown(e);
      }
    });

    function scrollToHighlighted() {
      const hi = highlightIndex();
      const el = optionsContainer.querySelector(`[data-index="${hi}"]`);
      if (el) (el as HTMLElement).scrollIntoView({ block: 'nearest' });
    }

    return wrapper;
  };
});
