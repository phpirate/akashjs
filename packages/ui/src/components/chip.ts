/**
 * Material Design 3 Chip components.
 *
 * - Chip — base chip with icon, color, removable, selected states
 * - ChipSet — simple flex container for display chips
 * - ChipListbox — selectable chip group (single or multi)
 * - ChipGrid — editable chip collection with text input + autocomplete
 */

import { defineComponent, effect, signal } from '@akashjs/runtime';
import type { AkashNode } from '@akashjs/runtime';
import { addRipple, injectRippleStyles } from './ripple.js';

// --- Helpers ---

function readProp<T>(val: T | (() => T)): T {
  return typeof val === 'function' ? (val as () => T)() : val as T;
}

function nodeToDOM(node: AkashNode): Node {
  if (node == null || typeof node === 'boolean') return document.createTextNode('');
  if (typeof node === 'string' || typeof node === 'number') return document.createTextNode(String(node));
  if (node instanceof Node) return node;
  return document.createTextNode(String(node));
}

function resolveChildren(ctx: { children: () => AkashNode; props: any }): AkashNode {
  let children = ctx.children();
  if (children == null || (Array.isArray(children) && children.length === 0)) {
    const pc = ctx.props.children;
    if (typeof pc === 'function') children = pc();
    else if (pc != null) children = pc;
  }
  return children;
}

// ============================================================================
// Chip
// ============================================================================

export interface ChipProps {
  /** Display text */
  label: string;
  /** Chip variant */
  variant?: 'assist' | 'filter' | 'input' | 'suggestion';
  /** Whether the chip is selected */
  selected?: boolean;
  /** Leading icon — Material Symbols name (string) or Node */
  icon?: string | AkashNode;
  /** Color: 'primary' | 'accent' | custom CSS color */
  color?: string;
  /** Show remove (X) button */
  removable?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Value for use in ChipListbox */
  value?: unknown;
  /** Click handler */
  onClick?: (e: MouseEvent) => void;
  /** Remove handler (X button clicked) */
  onRemove?: () => void;
  /** @deprecated Use onRemove instead */
  onClose?: () => void;
  /** Custom CSS class */
  class?: string;
}

export const Chip = defineComponent<ChipProps>((ctx) => {
  injectRippleStyles();

  return () => {
    const props = ctx.props;
    const label = props.label;
    const variant = props.variant ?? 'assist';
    const selected = readProp(props.selected) ?? false;
    const disabled = props.disabled ?? false;
    const removable = props.removable ?? false;
    const onRemove = props.onRemove ?? props.onClose;
    const showRemove = removable || !!onRemove;
    const color = props.color;

    const chip = document.createElement('div');
    chip.setAttribute('role', variant === 'filter' ? 'option' : 'button');
    chip.tabIndex = disabled ? -1 : 0;
    if (variant === 'filter') chip.setAttribute('aria-selected', String(selected));
    if (props.class) chip.className = props.class;
    if (props.value !== undefined) (chip as any)._chipValue = props.value;

    // Color resolution
    let bgColor: string;
    let borderCol: string;
    let textColor: string;

    if (color === 'primary') {
      bgColor = selected ? 'var(--md-sys-color-primary-container, #eaddff)' : 'transparent';
      borderCol = selected ? 'transparent' : 'var(--md-sys-color-primary, #6750a4)';
      textColor = 'var(--md-sys-color-on-primary-container, #21005d)';
    } else if (color === 'accent') {
      bgColor = selected ? 'var(--md-sys-color-tertiary-container, #ffd8e4)' : 'transparent';
      borderCol = selected ? 'transparent' : 'var(--md-sys-color-tertiary, #7d5260)';
      textColor = 'var(--md-sys-color-on-tertiary-container, #31111d)';
    } else if (color) {
      bgColor = selected ? color : 'transparent';
      borderCol = selected ? 'transparent' : color;
      textColor = selected ? '#fff' : color;
    } else {
      bgColor = selected ? 'var(--md-sys-color-secondary-container, #e8def8)' : 'transparent';
      borderCol = selected ? 'transparent' : 'var(--md-sys-color-outline, #79747e)';
      textColor = selected
        ? 'var(--md-sys-color-on-secondary-container, #1d192b)'
        : 'var(--md-sys-color-on-surface-variant, #49454f)';
    }

    chip.style.cssText = `
      display: inline-flex; align-items: center; gap: 8px;
      height: 32px;
      padding: 0 ${showRemove ? '4px' : '16px'} 0 ${props.icon ? '8px' : '16px'};
      border-radius: 8px;
      border: 1px solid ${borderCol};
      background-color: ${bgColor};
      color: ${textColor};
      font-family: inherit; font-size: 14px; font-weight: 500;
      letter-spacing: 0.1px; line-height: 20px;
      cursor: ${disabled ? 'default' : 'pointer'};
      user-select: none;
      -webkit-tap-highlight-color: transparent;
      transition: background-color 200ms cubic-bezier(0.2, 0, 0, 1);
      box-sizing: border-box;
      opacity: ${disabled ? '0.38' : '1'};
      pointer-events: ${disabled ? 'none' : 'auto'};
    `;

    if (!disabled) {
      chip.addEventListener('mouseenter', () => {
        chip.style.backgroundColor = selected
          ? bgColor
          : 'var(--md-sys-color-surface-container-highest, #e6e0e9)';
      });
      chip.addEventListener('mouseleave', () => { chip.style.backgroundColor = bgColor; });
      chip.addEventListener('focus', () => {
        chip.style.outline = '2px solid var(--md-sys-color-primary, #6750a4)';
        chip.style.outlineOffset = '2px';
      });
      chip.addEventListener('blur', () => { chip.style.outline = 'none'; chip.style.outlineOffset = ''; });
    }

    if (props.onClick && !disabled) chip.addEventListener('click', props.onClick);

    // Leading icon
    if (props.icon != null) {
      const iconEl = document.createElement('span');
      iconEl.style.cssText = 'display: inline-flex; align-items: center; font-size: 18px; width: 18px; height: 18px;';
      if (typeof props.icon === 'string') {
        iconEl.className = 'material-symbols-outlined';
        iconEl.textContent = props.icon;
      } else if (props.icon instanceof Node) {
        iconEl.appendChild(props.icon);
      }
      chip.appendChild(iconEl);
    }

    // Filter check mark
    if (variant === 'filter' && selected) {
      const check = document.createElement('span');
      check.textContent = '\u2713';
      check.style.cssText = 'display: inline-flex; align-items: center; font-size: 16px; width: 18px; height: 18px;';
      chip.appendChild(check);
    }

    // Label
    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    chip.appendChild(labelEl);

    // Remove button
    if (showRemove) {
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.setAttribute('aria-label', `Remove ${label}`);
      closeBtn.textContent = '\u2715';
      closeBtn.style.cssText = `
        display: inline-flex; align-items: center; justify-content: center;
        width: 24px; height: 24px; border: none; background: none;
        border-radius: 50%; cursor: pointer;
        color: var(--md-sys-color-on-surface-variant, #49454f);
        font-size: 14px; padding: 0; margin-left: -4px;
        transition: background-color 200ms;
      `;
      closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.backgroundColor = 'var(--md-sys-color-surface-container-highest, #e6e0e9)';
      });
      closeBtn.addEventListener('mouseleave', () => { closeBtn.style.backgroundColor = ''; });
      closeBtn.addEventListener('click', (e) => { e.stopPropagation(); onRemove?.(); });
      chip.appendChild(closeBtn);
    }

    addRipple(chip);
    return chip;
  };
});

// ============================================================================
// ChipSet — simple flex container
// ============================================================================

export interface ChipSetProps {
  /** Gap between chips (default: '8px') */
  gap?: string;
  /** Custom CSS class */
  class?: string;
}

export const ChipSet = defineComponent<ChipSetProps>((ctx) => {
  return () => {
    const gap = ctx.props.gap ?? '8px';
    const wrapper = document.createElement('div');
    wrapper.setAttribute('role', 'list');
    if (ctx.props.class) wrapper.className = ctx.props.class;
    wrapper.style.cssText = `display: flex; flex-wrap: wrap; gap: ${gap}; align-items: center;`;

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

// ============================================================================
// ChipListbox — selectable chip group
// ============================================================================

export interface ChipListboxOption {
  value: unknown;
  label: string;
  icon?: string;
  disabled?: boolean;
}

export interface ChipListboxProps {
  /** Options (function-based API) */
  options?: ChipListboxOption[];
  /** Current value (single) or values (multi) */
  value?: unknown | unknown[];
  /** Change handler */
  onChange?: (value: unknown | unknown[]) => void;
  /** Multi-select mode */
  multiple?: boolean;
  /** Custom equality */
  compareWith?: (a: unknown, b: unknown) => boolean;
  /** Gap (default: '8px') */
  gap?: string;
  /** Color for selected chips */
  color?: string;
}

export const ChipListbox = defineComponent<ChipListboxProps>((ctx) => {
  return () => {
    const props = ctx.props;
    const multiple = props.multiple ?? false;
    const compare = props.compareWith ?? ((a: unknown, b: unknown) => a === b);
    const gap = props.gap ?? '8px';
    const color = props.color;

    const wrapper = document.createElement('div');
    wrapper.setAttribute('role', 'listbox');
    wrapper.setAttribute('aria-multiselectable', String(multiple));
    wrapper.tabIndex = 0;
    wrapper.style.cssText = `display: flex; flex-wrap: wrap; gap: ${gap}; align-items: center; outline: none;`;

    const highlightIdx = signal(0);

    function isSelected(optValue: unknown): boolean {
      const val = readProp(props.value);
      if (multiple) {
        return Array.isArray(val) && val.some((v: unknown) => compare(v, optValue));
      }
      return val != null && compare(val, optValue);
    }

    function toggleOption(optValue: unknown) {
      if (multiple) {
        const current = (readProp(props.value) as unknown[]) ?? [];
        const idx = current.findIndex((v: unknown) => compare(v, optValue));
        const next = [...current];
        if (idx >= 0) next.splice(idx, 1); else next.push(optValue);
        props.onChange?.(next);
      } else {
        props.onChange?.(optValue);
      }
    }

    // Build from options prop or children
    function buildChips() {
      wrapper.textContent = '';
      const options = props.options;
      if (options && options.length > 0) {
        for (let i = 0; i < options.length; i++) {
          const opt = options[i];
          const chip = Chip({
            label: opt.label,
            icon: opt.icon,
            variant: 'filter',
            selected: isSelected(opt.value),
            disabled: opt.disabled,
            color,
            value: opt.value,
            onClick: () => { if (!opt.disabled) toggleOption(opt.value); },
          });
          wrapper.appendChild(chip);
        }
      } else {
        const children = resolveChildren(ctx);
        if (children != null) {
          const items = Array.isArray(children) ? children : [children];
          for (const child of items) {
            if (child instanceof Node) {
              // Wrap child chip click to toggle selection
              const chipValue = (child as any)._chipValue;
              if (chipValue !== undefined) {
                child.addEventListener('click', () => toggleOption(chipValue));
              }
              wrapper.appendChild(child);
            }
          }
        }
      }
    }

    // Reactive rebuild when value changes
    effect(() => {
      readProp(props.value); // track
      buildChips();
    });

    // Keyboard navigation
    wrapper.addEventListener('keydown', (e) => {
      const chips = wrapper.querySelectorAll('[role="option"]');
      const max = chips.length - 1;
      const hi = highlightIdx();

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          highlightIdx.set(Math.min(hi + 1, max));
          (chips[highlightIdx()] as HTMLElement)?.focus();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          highlightIdx.set(Math.max(hi - 1, 0));
          (chips[highlightIdx()] as HTMLElement)?.focus();
          break;
        case ' ':
        case 'Enter': {
          e.preventDefault();
          const el = chips[hi] as HTMLElement;
          el?.click();
          break;
        }
      }
    });

    return wrapper;
  };
});

// ============================================================================
// ChipGrid — editable chip collection with input
// ============================================================================

export interface ChipGridItem {
  value: unknown;
  label: string;
  icon?: string;
}

export interface ChipGridProps {
  /** Current chips */
  chips?: ChipGridItem[];
  /** Called when user adds a chip via input */
  onAdd?: (value: string) => void;
  /** Called when user removes a chip via X button */
  onRemove?: (chip: ChipGridItem) => void;
  /** Input placeholder */
  placeholder?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Color for chips */
  color?: string;
  /** Display function for chip labels (for object chips) */
  displayFn?: (value: unknown) => string;
  /** Autocomplete function — returns items matching search term */
  autocomplete?: (term: string) => ChipGridItem[];
  /** Debounce for autocomplete (default: 200ms) */
  autocompleteDebounce?: number;
  /** Gap (default: '6px') */
  gap?: string;
  /** Separator for paste splitting (default: /[,\n]/) */
  pasteSeparator?: RegExp;
}

export const ChipGrid = defineComponent<ChipGridProps>((ctx) => {
  return () => {
    const props = ctx.props;
    const disabled = props.disabled ?? false;
    const displayFn = props.displayFn ?? ((v: unknown) => String((v as any)?.label ?? v));
    const color = props.color;
    const gap = props.gap ?? '6px';
    const pasteSeparator = props.pasteSeparator ?? /[,\n]/;
    const autocompleteDebounce = props.autocompleteDebounce ?? 200;

    const wrapper = document.createElement('div');
    wrapper.setAttribute('role', 'grid');
    wrapper.style.cssText = `
      display: flex; flex-wrap: wrap; gap: ${gap}; align-items: center;
      padding: 8px 12px; min-height: 44px; box-sizing: border-box;
      border: 1px solid var(--md-sys-color-outline, #79747e);
      border-radius: 4px; background: transparent;
      transition: border-color 200ms;
      font-family: var(--md-sys-typescale-body-large-font, system-ui);
      ${disabled ? 'opacity: 0.38; pointer-events: none;' : ''}
    `;

    // Chip container
    const chipContainer = document.createElement('div');
    chipContainer.style.cssText = `display: flex; flex-wrap: wrap; gap: ${gap}; align-items: center;`;
    wrapper.appendChild(chipContainer);

    // Input
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = props.placeholder ?? '';
    input.disabled = disabled;
    input.style.cssText = `
      flex: 1; min-width: 80px; border: none; outline: none;
      font-size: 14px; font-family: inherit;
      background: transparent; color: inherit;
      padding: 4px 0;
    `;
    wrapper.appendChild(input);

    // Autocomplete dropdown
    let acPanel: HTMLDivElement | null = null;
    let acItems: ChipGridItem[] = [];
    let acHighlight = 0;

    if (props.autocomplete) {
      acPanel = document.createElement('div');
      acPanel.style.cssText = `
        position: fixed; z-index: 3000; min-width: 120px;
        background: var(--md-sys-color-surface-container, #fff);
        border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        padding: 4px 0; display: none; font-size: 14px;
        max-height: 200px; overflow-y: auto;
      `;
      document.body.appendChild(acPanel);
    }

    // Render chips reactively
    effect(() => {
      const chips = readProp(props.chips) ?? [];
      chipContainer.textContent = '';
      for (const item of chips) {
        const chipNode = Chip({
          label: item.label || displayFn(item.value),
          icon: item.icon,
          removable: true,
          color,
          onRemove: () => props.onRemove?.(item),
        });
        chipContainer.appendChild(chipNode);
      }
    });

    // Focus styling
    input.addEventListener('focus', () => {
      wrapper.style.borderColor = 'var(--md-sys-color-primary, #6750a4)';
      wrapper.style.borderWidth = '2px';
      wrapper.style.padding = '7px 11px'; // compensate for 2px border
    });
    input.addEventListener('blur', () => {
      wrapper.style.borderColor = 'var(--md-sys-color-outline, #79747e)';
      wrapper.style.borderWidth = '1px';
      wrapper.style.padding = '8px 12px';
      // Delay hiding autocomplete so clicks register
      setTimeout(() => { if (acPanel) acPanel.style.display = 'none'; }, 150);
    });

    // Click wrapper to focus input
    wrapper.addEventListener('click', () => { input.focus(); });

    // Add chip on Enter
    function addChip(text: string) {
      const trimmed = text.trim();
      if (trimmed) {
        props.onAdd?.(trimmed);
        input.value = '';
        if (acPanel) acPanel.style.display = 'none';
      }
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (acPanel && acPanel.style.display !== 'none' && acItems[acHighlight]) {
          // Select from autocomplete
          props.onAdd?.(acItems[acHighlight].value as string);
          input.value = '';
          acPanel.style.display = 'none';
        } else {
          addChip(input.value);
        }
      } else if (e.key === 'Backspace' && input.value === '') {
        // Remove last chip
        const chips = readProp(props.chips) ?? [];
        if (chips.length > 0) {
          props.onRemove?.(chips[chips.length - 1]);
        }
      } else if (e.key === 'ArrowDown' && acPanel && acPanel.style.display !== 'none') {
        e.preventDefault();
        acHighlight = Math.min(acHighlight + 1, acItems.length - 1);
        renderAutocomplete();
      } else if (e.key === 'ArrowUp' && acPanel && acPanel.style.display !== 'none') {
        e.preventDefault();
        acHighlight = Math.max(acHighlight - 1, 0);
        renderAutocomplete();
      } else if (e.key === 'Escape' && acPanel) {
        acPanel.style.display = 'none';
      }
    });

    // Paste support — split by separator
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = e.clipboardData?.getData('text') ?? '';
      const parts = text.split(pasteSeparator).map(s => s.trim()).filter(Boolean);
      for (const part of parts) {
        props.onAdd?.(part);
      }
    });

    // Autocomplete input handler
    if (props.autocomplete) {
      let debounceTimer: any;
      input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const term = input.value.trim();
          if (term.length === 0) {
            if (acPanel) acPanel.style.display = 'none';
            return;
          }
          acItems = props.autocomplete!(term);
          acHighlight = 0;
          if (acItems.length > 0) {
            positionAutocomplete();
            renderAutocomplete();
            acPanel!.style.display = 'block';
          } else {
            acPanel!.style.display = 'none';
          }
        }, autocompleteDebounce);
      });
    }

    function positionAutocomplete() {
      if (!acPanel) return;
      const rect = wrapper.getBoundingClientRect();
      acPanel.style.left = `${rect.left}px`;
      acPanel.style.top = `${rect.bottom + 4}px`;
      acPanel.style.width = `${rect.width}px`;
    }

    function renderAutocomplete() {
      if (!acPanel) return;
      acPanel.textContent = '';
      for (let i = 0; i < acItems.length; i++) {
        const item = acItems[i];
        const div = document.createElement('div');
        div.style.cssText = `
          padding: 8px 16px; cursor: pointer;
          display: flex; align-items: center; gap: 8px;
          background: ${i === acHighlight ? 'var(--md-sys-color-surface-container-highest, #e6e0e9)' : 'transparent'};
          transition: background 80ms;
        `;
        if (item.icon) {
          const icon = document.createElement('span');
          icon.className = 'material-symbols-outlined';
          icon.textContent = item.icon;
          icon.style.fontSize = '18px';
          div.appendChild(icon);
        }
        const label = document.createElement('span');
        label.textContent = item.label || displayFn(item.value);
        div.appendChild(label);
        div.addEventListener('mouseenter', () => { acHighlight = i; renderAutocomplete(); });
        div.addEventListener('mousedown', (e) => {
          e.preventDefault(); // prevent input blur
          props.onAdd?.(item.value as string);
          input.value = '';
          acPanel!.style.display = 'none';
          input.focus();
        });
        acPanel.appendChild(div);
      }
    }

    return wrapper;
  };
});
