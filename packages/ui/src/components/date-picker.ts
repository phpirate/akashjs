/**
 * Material Design 3 Date Picker components.
 *
 * - DatePicker — single date selection with calendar popup
 * - DateRangePicker — from/to date pair with optional presets
 * - DateTimePicker — date + time selection with hour/minute spinners
 *
 * Features:
 * - MD3 styled calendar popup with month/year navigation
 * - Today highlight, selected date highlight
 * - Min/max date constraints
 * - Clearable (X button)
 * - Keyboard: arrow keys navigate days, Enter selects, Escape closes
 * - Locale-aware formatting via Intl.DateTimeFormat
 * - Disabled/readonly states
 * - Click outside to close
 * - Viewport-aware positioning (above/below)
 */

import { defineComponent, effect, signal } from '@akashjs/runtime';
import type { AkashNode } from '@akashjs/runtime';

// --- Helpers ---

function readProp<T>(val: T | (() => T)): T {
  return typeof val === 'function' ? (val as () => T)() : val as T;
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

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isSameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

function cloneDate(d: Date): Date {
  return new Date(d.getTime());
}

function formatDate(d: Date | null, locale: string, fmt?: Intl.DateTimeFormatOptions): string {
  if (!d) return '';
  return new Intl.DateTimeFormat(locale, fmt ?? { year: 'numeric', month: 'short', day: 'numeric' }).format(d);
}

function formatTime(hours: number, minutes: number, seconds: number, meridian: boolean, showSeconds: boolean): string {
  let h = hours;
  let suffix = '';
  if (meridian) {
    suffix = h >= 12 ? ' PM' : ' AM';
    h = h % 12 || 12;
  }
  const parts = [String(h).padStart(2, '0'), String(minutes).padStart(2, '0')];
  if (showSeconds) parts.push(String(seconds).padStart(2, '0'));
  return parts.join(':') + suffix;
}

function parseDate(str: string): Date | null {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Shared styles
const fieldCSS = `
  display: flex; align-items: center; gap: 8px;
  min-height: 56px; border-radius: 4px;
  border: 1px solid var(--md-sys-color-outline, #79747e);
  background: transparent; padding: 16px;
  box-sizing: border-box;
  font-family: var(--md-sys-typescale-body-large-font, system-ui);
  font-size: 16px; color: var(--md-sys-color-on-surface, #1d1b20);
  cursor: pointer; transition: border-color 200ms;
  position: relative;
`;

const panelCSS = `
  position: fixed; z-index: 3000;
  background: var(--md-sys-color-surface-container, #fff);
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  padding: 16px;
  opacity: 0; transform: scaleY(0.9); transform-origin: top left;
  transition: opacity 120ms, transform 120ms cubic-bezier(0, 0, 0.2, 1);
  pointer-events: none;
  font-family: var(--md-sys-typescale-body-large-font, system-ui);
  font-size: 14px;
`;

const dayBtnCSS = `
  width: 100%; aspect-ratio: 1; border: none; background: none;
  border-radius: 50%; cursor: pointer; font-size: 14px;
  font-family: inherit; color: inherit;
  display: flex; align-items: center; justify-content: center;
  transition: background 80ms; padding: 0; margin: 0;
  box-sizing: border-box;
`;

// ============================================================================
// Calendar Grid — shared between all pickers
// ============================================================================

function createCalendarGrid(
  container: HTMLElement,
  viewYear: { (): number; set: (v: number) => void },
  viewMonth: { (): number; set: (v: number) => void },
  selectedDate: Date | null,
  minDate: Date | null,
  maxDate: Date | null,
  onSelect: (d: Date) => void,
  highlightRange?: { from: Date | null; to: Date | null },
): void {
  container.textContent = '';

  // Header: < Month Year >
  const header = document.createElement('div');
  header.style.cssText = 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;';

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.textContent = '\u276E';
  prevBtn.style.cssText = 'border: none; background: none; cursor: pointer; font-size: 18px; padding: 4px 8px; border-radius: 50%; color: var(--md-sys-color-on-surface, #1d1b20);';
  prevBtn.addEventListener('click', () => {
    if (viewMonth() === 0) { viewMonth.set(11); viewYear.set(viewYear() - 1); }
    else viewMonth.set(viewMonth() - 1);
  });

  const title = document.createElement('span');
  title.style.cssText = 'font-weight: 500; font-size: 14px;';
  title.textContent = `${MONTH_NAMES[viewMonth()]} ${viewYear()}`;

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.textContent = '\u276F';
  nextBtn.style.cssText = prevBtn.style.cssText;
  nextBtn.addEventListener('click', () => {
    if (viewMonth() === 11) { viewMonth.set(0); viewYear.set(viewYear() + 1); }
    else viewMonth.set(viewMonth() + 1);
  });

  header.appendChild(prevBtn);
  header.appendChild(title);
  header.appendChild(nextBtn);
  container.appendChild(header);

  // Day-of-week headers
  const dayRow = document.createElement('div');
  dayRow.style.cssText = 'display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 2px;';
  for (const d of DAY_HEADERS) {
    const cell = document.createElement('span');
    cell.textContent = d;
    cell.style.cssText = 'display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 500; color: var(--md-sys-color-on-surface-variant, #49454f); padding: 4px 0;';
    dayRow.appendChild(cell);
  }
  container.appendChild(dayRow);

  // Day grid
  const year = viewYear();
  const month = viewMonth();
  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);

  const grid = document.createElement('div');
  grid.style.cssText = 'display: grid; grid-template-columns: repeat(7, 1fr);';

  // Empty cells before first day
  for (let i = 0; i < startDay; i++) {
    const empty = document.createElement('div');
    empty.style.cssText = 'aspect-ratio: 1;';
    grid.appendChild(empty);
  }

  // Day buttons
  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month, day);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = String(day);

    const isSelected = isSameDay(date, selectedDate);
    const isTodayDate = isToday(date);
    const isDisabled = (minDate && date < minDate) || (maxDate && date > maxDate);
    const inRange = highlightRange?.from && highlightRange?.to &&
      date >= highlightRange.from && date <= highlightRange.to;

    let bg = 'none';
    let color = 'inherit';
    let fontWeight = 'normal';
    let border = 'none';

    if (isSelected) {
      bg = 'var(--md-sys-color-primary, #6750a4)';
      color = 'var(--md-sys-color-on-primary, #fff)';
      fontWeight = '600';
    } else if (inRange) {
      bg = 'var(--md-sys-color-primary-container, #eaddff)';
    } else if (isTodayDate) {
      border = '1px solid var(--md-sys-color-primary, #6750a4)';
      fontWeight = '600';
    }

    btn.style.cssText = dayBtnCSS + `
      background: ${bg}; color: ${color}; font-weight: ${fontWeight}; border: ${border};
      opacity: ${isDisabled ? '0.3' : '1'};
      pointer-events: ${isDisabled ? 'none' : 'auto'};
    `;

    if (!isDisabled) {
      btn.addEventListener('mouseenter', () => {
        if (!isSelected) btn.style.background = 'var(--md-sys-color-surface-container-highest, #e6e0e9)';
      });
      btn.addEventListener('mouseleave', () => {
        if (!isSelected) btn.style.background = inRange ? 'var(--md-sys-color-primary-container, #eaddff)' : 'none';
      });
      btn.addEventListener('click', () => onSelect(date));
    }

    grid.appendChild(btn);
  }

  container.appendChild(grid);

  // Today button
  const todayRow = document.createElement('div');
  todayRow.style.cssText = 'display: flex; justify-content: center; margin-top: 8px;';
  const todayBtn = document.createElement('button');
  todayBtn.type = 'button';
  todayBtn.textContent = 'Today';
  todayBtn.style.cssText = `
    border: none; background: none; cursor: pointer;
    color: var(--md-sys-color-primary, #6750a4);
    font-size: 13px; font-weight: 500; padding: 4px 12px;
    border-radius: 16px; transition: background 80ms;
  `;
  todayBtn.addEventListener('mouseenter', () => { todayBtn.style.background = 'var(--md-sys-color-primary-container, #eaddff)'; });
  todayBtn.addEventListener('mouseleave', () => { todayBtn.style.background = 'none'; });
  todayBtn.addEventListener('click', () => {
    const now = new Date();
    viewYear.set(now.getFullYear());
    viewMonth.set(now.getMonth());
    onSelect(now);
  });
  todayRow.appendChild(todayBtn);
  container.appendChild(todayRow);
}

// ============================================================================
// DatePicker
// ============================================================================

export interface DatePickerProps {
  /** Current date value */
  value?: Date | null;
  /** Change handler */
  onChange?: (date: Date | null) => void;
  /** Floating label */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Minimum selectable date */
  min?: Date;
  /** Maximum selectable date */
  max?: Date;
  /** Show clear button */
  clearable?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Readonly — shows value but can't change */
  readonly?: boolean;
  /** Locale for date formatting (default: navigator.language) */
  locale?: string;
  /** Custom date format options */
  formatOptions?: Intl.DateTimeFormatOptions;
  /** Width (default: '210px') */
  width?: string;
}

export const DatePicker = defineComponent<DatePickerProps>((ctx) => {
  return () => {
    const props = ctx.props;
    const disabled = props.disabled ?? false;
    const readonly_ = props.readonly ?? false;
    const clearable = props.clearable ?? false;
    const locale = props.locale ?? (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
    const placeholder = props.placeholder ?? 'Select date...';
    const width = props.width ?? '210px';

    const isOpen = signal(false);
    const viewYear = signal(new Date().getFullYear());
    const viewMonth = signal(new Date().getMonth());
    // Internal value — keeps display in sync even when props.value is static
    const internalValue = signal<Date | null>(readProp(props.value) ?? null);

    // Sync from external prop (when reactive)
    if (typeof props.value === 'function') {
      effect(() => {
        const ext = (props.value as () => Date | null)();
        internalValue.set(ext ?? null);
      });
    }

    function setValue(d: Date | null) {
      internalValue.set(d);
      props.onChange?.(d);
    }

    // Wrapper
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `position: relative; display: inline-block; min-width: ${width};`;

    // Field
    const field = document.createElement('div');
    field.style.cssText = fieldCSS + `${disabled ? 'opacity: 0.38; pointer-events: none;' : ''} ${readonly_ ? 'pointer-events: none;' : ''}`;

    // Label
    if (props.label) {
      const label = document.createElement('label');
      label.textContent = props.label;
      label.style.cssText = `
        position: absolute; left: 16px; top: -8px;
        font-size: 12px; background: var(--md-sys-color-surface, #fffbfe);
        padding: 0 4px; color: var(--md-sys-color-on-surface-variant, #49454f);
        pointer-events: none;
      `;
      field.appendChild(label);
    }

    // Display text
    const display = document.createElement('span');
    display.style.cssText = 'flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
    field.appendChild(display);

    // Clear button
    if (clearable) {
      const clearBtn = document.createElement('span');
      clearBtn.textContent = '\u2715';
      clearBtn.style.cssText = 'cursor: pointer; font-size: 14px; padding: 2px; display: none; color: var(--md-sys-color-on-surface-variant, #49454f);';
      clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setValue(null);
      });
      field.appendChild(clearBtn);

      effect(() => {
        clearBtn.style.display = internalValue() ? 'inline' : 'none';
      });
    }

    // Calendar icon
    const icon = document.createElement('span');
    icon.textContent = '\uD83D\uDCC5';
    icon.style.cssText = 'font-size: 18px; flex-shrink: 0;';
    field.appendChild(icon);

    wrapper.appendChild(field);

    // Panel
    const panel = document.createElement('div');
    panel.style.cssText = panelCSS;
    document.body.appendChild(panel);

    const calendarContainer = document.createElement('div');
    panel.appendChild(calendarContainer);

    // Update display reactively
    effect(() => {
      const val = internalValue();
      if (val) {
        display.textContent = formatDate(val, locale, props.formatOptions);
        display.style.color = 'var(--md-sys-color-on-surface, #1d1b20)';
        if (!isOpen()) {
          viewYear.set(val.getFullYear());
          viewMonth.set(val.getMonth());
        }
      } else {
        display.textContent = props.label ? '' : placeholder;
        display.style.color = 'var(--md-sys-color-on-surface-variant, #49454f)';
      }
    });

    // Rebuild calendar when view or value changes
    effect(() => {
      const y = viewYear();
      const m = viewMonth();
      const val = internalValue();
      createCalendarGrid(calendarContainer, viewYear, viewMonth, val, props.min ?? null, props.max ?? null, (date) => {
        setValue(date);
        closePanel();
      });
    });

    // Open/close
    const onScrollClose = () => { closePanel(); };

    function openPanel() {
      if (disabled || readonly_) return;
      isOpen.set(true);
      const rect = field.getBoundingClientRect();
      const panelH = 340;
      const openAbove = window.innerHeight - rect.bottom < panelH && rect.top > panelH;
      panel.style.left = `${rect.left}px`;
      panel.style.width = `${Math.max(rect.width, 288)}px`;
      if (openAbove) {
        panel.style.bottom = `${window.innerHeight - rect.top + 4}px`;
        panel.style.top = '';
        panel.style.transformOrigin = 'bottom left';
      } else {
        panel.style.top = `${rect.bottom + 4}px`;
        panel.style.bottom = '';
        panel.style.transformOrigin = 'top left';
      }
      panel.style.opacity = '1';
      panel.style.transform = 'scaleY(1)';
      panel.style.pointerEvents = 'auto';
      field.style.borderColor = 'var(--md-sys-color-primary, #6750a4)';
      field.style.borderWidth = '2px';
      window.addEventListener('scroll', onScrollClose, { capture: true });
    }

    function closePanel() {
      isOpen.set(false);
      panel.style.opacity = '0';
      panel.style.transform = 'scaleY(0.9)';
      panel.style.pointerEvents = 'none';
      field.style.borderColor = 'var(--md-sys-color-outline, #79747e)';
      field.style.borderWidth = '1px';
      window.removeEventListener('scroll', onScrollClose, { capture: true });
    }

    // Stop both mousedown and click from propagating to document
    // so other DatePicker instances' outside-click handlers don't fire
    field.addEventListener('mousedown', (e) => { e.stopPropagation(); });
    panel.addEventListener('mousedown', (e) => { e.stopPropagation(); });
    field.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isOpen()) closePanel(); else openPanel();
    });

    // Outside click — only closes THIS instance when open
    document.addEventListener('mousedown', () => {
      if (!isOpen()) return;
      closePanel();
    });

    // Keyboard
    field.tabIndex = disabled ? -1 : 0;
    field.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (isOpen()) closePanel(); else openPanel(); }
      if (e.key === 'Escape') closePanel();
    });

    return wrapper;
  };
});

// ============================================================================
// DateRangePicker
// ============================================================================

export interface DateRangePreset {
  label: string;
  from: Date;
  to: Date;
}

export interface DateRangePickerProps {
  /** Start date */
  from?: Date | null;
  /** End date */
  to?: Date | null;
  /** Start date change handler */
  onFromChange?: (date: Date | null) => void;
  /** End date change handler */
  onToChange?: (date: Date | null) => void;
  /** Both dates change handler */
  onChange?: (from: Date | null, to: Date | null) => void;
  /** Preset range buttons */
  presets?: DateRangePreset[];
  /** Floating label for "from" */
  fromLabel?: string;
  /** Floating label for "to" */
  toLabel?: string;
  /** Placeholder for from */
  fromPlaceholder?: string;
  /** Placeholder for to */
  toPlaceholder?: string;
  /** Min date */
  min?: Date;
  /** Max date */
  max?: Date;
  /** Clearable */
  clearable?: boolean;
  /** Disabled */
  disabled?: boolean;
  /** Locale */
  locale?: string;
  /** Gap between fields (default: '8px') */
  gap?: string;
}

export const DateRangePicker = defineComponent<DateRangePickerProps>((ctx) => {
  return () => {
    const props = ctx.props;
    const disabled = props.disabled ?? false;
    const clearable = props.clearable ?? false;
    const locale = props.locale ?? (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
    const gap = props.gap ?? '8px';

    // Internal signals for cross-constraint reactivity
    const fromValue = signal<Date | null>(readProp(props.from) ?? null);
    const toValue = signal<Date | null>(readProp(props.to) ?? null);

    // Sync from external props when reactive
    if (typeof props.from === 'function') {
      effect(() => { fromValue.set((props.from as () => Date | null)() ?? null); });
    }
    if (typeof props.to === 'function') {
      effect(() => { toValue.set((props.to as () => Date | null)() ?? null); });
    }

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `display: flex; align-items: flex-start; gap: ${gap}; flex-wrap: wrap;`;

    // Container for pickers — rebuilt reactively
    const pickersRow = document.createElement('div');
    pickersRow.style.cssText = `display: flex; align-items: flex-start; gap: ${gap};`;
    wrapper.appendChild(pickersRow);

    // Reactively rebuild pickers when constraints change
    effect(() => {
      const curFrom = fromValue();
      const curTo = toValue();
      pickersRow.textContent = '';

      const fromPicker = DatePicker({
        value: curFrom,
        label: props.fromLabel ?? 'From',
        placeholder: props.fromPlaceholder ?? 'Start date',
        min: props.min,
        max: curTo ?? props.max,
        clearable,
        disabled,
        locale,
        onChange: (d) => {
          fromValue.set(d);
          props.onFromChange?.(d);
          props.onChange?.(d, toValue());
        },
      });
      pickersRow.appendChild(fromPicker);

      const toPicker = DatePicker({
        value: curTo,
        label: props.toLabel ?? 'To',
        placeholder: props.toPlaceholder ?? 'End date',
        min: curFrom ?? props.min,
        max: props.max,
        clearable,
        disabled,
        locale,
        onChange: (d) => {
          toValue.set(d);
          props.onToChange?.(d);
          props.onChange?.(fromValue(), d);
        },
      });
      pickersRow.appendChild(toPicker);
    });

    // Presets
    if (props.presets && props.presets.length > 0) {
      const presetsRow = document.createElement('div');
      presetsRow.style.cssText = 'display: flex; gap: 4px; flex-wrap: wrap; width: 100%; margin-top: 4px;';
      for (const preset of props.presets) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = preset.label;
        btn.style.cssText = `
          padding: 4px 12px; border: 1px solid var(--md-sys-color-outline, #79747e);
          border-radius: 16px; background: transparent; cursor: pointer;
          font-size: 12px; font-family: inherit;
          color: var(--md-sys-color-primary, #6750a4);
          transition: background 80ms;
        `;
        btn.addEventListener('mouseenter', () => { btn.style.background = 'var(--md-sys-color-primary-container, #eaddff)'; });
        btn.addEventListener('mouseleave', () => { btn.style.background = 'transparent'; });
        btn.addEventListener('click', () => {
          fromValue.set(preset.from);
          toValue.set(preset.to);
          props.onFromChange?.(preset.from);
          props.onToChange?.(preset.to);
          props.onChange?.(preset.from, preset.to);
        });
        presetsRow.appendChild(btn);
      }
      wrapper.appendChild(presetsRow);
    }

    return wrapper;
  };
});

// ============================================================================
// DateTimePicker
// ============================================================================

export interface DateTimePickerProps {
  /** Current date+time value */
  value?: Date | null;
  /** Change handler */
  onChange?: (date: Date | null) => void;
  /** Label */
  label?: string;
  /** Placeholder */
  placeholder?: string;
  /** Min date */
  min?: Date;
  /** Max date */
  max?: Date;
  /** Use 12-hour format with AM/PM (default: false) */
  meridian?: boolean;
  /** Show seconds spinner (default: false) */
  showSeconds?: boolean;
  /** Minute step (default: 1) */
  minuteStep?: number;
  /** Clearable */
  clearable?: boolean;
  /** Disabled */
  disabled?: boolean;
  /** Locale */
  locale?: string;
  /** Width */
  width?: string;
}

export const DateTimePicker = defineComponent<DateTimePickerProps>((ctx) => {
  return () => {
    const props = ctx.props;
    const disabled = props.disabled ?? false;
    const clearable = props.clearable ?? false;
    const meridian = props.meridian ?? false;
    const showSeconds = props.showSeconds ?? false;
    const minuteStep = props.minuteStep ?? 1;
    const locale = props.locale ?? (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
    const placeholder = props.placeholder ?? 'Select date and time...';
    const width = props.width ?? '280px';

    const isOpen = signal(false);
    const viewYear = signal(new Date().getFullYear());
    const viewMonth = signal(new Date().getMonth());
    const hours = signal(0);
    const minutes = signal(0);
    const seconds = signal(0);
    const internalValue = signal<Date | null>(readProp(props.value) ?? null);

    // Sync from external prop (when reactive)
    if (typeof props.value === 'function') {
      effect(() => {
        const ext = (props.value as () => Date | null)();
        internalValue.set(ext ?? null);
      });
    }

    function setValue(d: Date | null) {
      internalValue.set(d);
      props.onChange?.(d);
    }

    // Sync time from internal value
    effect(() => {
      const val = internalValue();
      if (val) {
        hours.set(val.getHours());
        minutes.set(val.getMinutes());
        seconds.set(val.getSeconds());
      }
    });

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `position: relative; display: inline-block; min-width: ${width};`;

    // Field
    const field = document.createElement('div');
    field.style.cssText = fieldCSS + `${disabled ? 'opacity: 0.38; pointer-events: none;' : ''}`;
    field.tabIndex = disabled ? -1 : 0;

    if (props.label) {
      const label = document.createElement('label');
      label.textContent = props.label;
      label.style.cssText = `
        position: absolute; left: 16px; top: -8px;
        font-size: 12px; background: var(--md-sys-color-surface, #fffbfe);
        padding: 0 4px; color: var(--md-sys-color-on-surface-variant, #49454f);
        pointer-events: none;
      `;
      field.appendChild(label);
    }

    const display = document.createElement('span');
    display.style.cssText = 'flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
    field.appendChild(display);

    if (clearable) {
      const clearBtn = document.createElement('span');
      clearBtn.textContent = '\u2715';
      clearBtn.style.cssText = 'cursor: pointer; font-size: 14px; padding: 2px; display: none; color: var(--md-sys-color-on-surface-variant, #49454f);';
      clearBtn.addEventListener('click', (e) => { e.stopPropagation(); setValue(null); });
      field.appendChild(clearBtn);
      effect(() => {
        clearBtn.style.display = internalValue() ? 'inline' : 'none';
      });
    }

    const icon = document.createElement('span');
    icon.textContent = '\uD83D\uDD52';
    icon.style.cssText = 'font-size: 18px; flex-shrink: 0;';
    field.appendChild(icon);

    wrapper.appendChild(field);

    // Panel
    const panel = document.createElement('div');
    panel.style.cssText = panelCSS + 'width: 320px;';
    document.body.appendChild(panel);

    const calendarContainer = document.createElement('div');
    panel.appendChild(calendarContainer);

    // Time section
    const timeSection = document.createElement('div');
    timeSection.style.cssText = `
      display: flex; align-items: center; justify-content: center; gap: 8px;
      margin-top: 12px; padding-top: 12px;
      border-top: 1px solid var(--md-sys-color-outline-variant, #c4c7c5);
    `;

    function createSpinner(sig: { (): number; set: (v: number) => void; update: (fn: (v: number) => number) => void }, min: number, max: number, step: number = 1): HTMLElement {
      const spin = document.createElement('div');
      spin.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 2px;';

      const up = document.createElement('button');
      up.type = 'button';
      up.textContent = '\u25B2';
      up.style.cssText = 'border: none; background: none; cursor: pointer; font-size: 10px; padding: 2px 8px; color: var(--md-sys-color-on-surface, #1d1b20);';
      up.addEventListener('click', () => {
        sig.update(v => { const n = v + step; return n > max ? min : n; });
        emitDateTime();
      });

      const val = document.createElement('span');
      val.style.cssText = `
        min-width: 36px; text-align: center; font-size: 20px; font-weight: 500;
        padding: 4px 8px; border-radius: 8px;
        background: var(--md-sys-color-surface-container-highest, #e6e0e9);
      `;

      const down = document.createElement('button');
      down.type = 'button';
      down.textContent = '\u25BC';
      down.style.cssText = up.style.cssText;
      down.addEventListener('click', () => {
        sig.update(v => { const n = v - step; return n < min ? max : n; });
        emitDateTime();
      });

      effect(() => { val.textContent = String(sig()).padStart(2, '0'); });

      spin.appendChild(up);
      spin.appendChild(val);
      spin.appendChild(down);
      return spin;
    }

    // Hours
    timeSection.appendChild(createSpinner(hours, 0, 23));
    const sep1 = document.createElement('span');
    sep1.textContent = ':';
    sep1.style.cssText = 'font-size: 20px; font-weight: 500;';
    timeSection.appendChild(sep1);

    // Minutes
    timeSection.appendChild(createSpinner(minutes, 0, 59, minuteStep));

    // Seconds
    if (showSeconds) {
      const sep2 = document.createElement('span');
      sep2.textContent = ':';
      sep2.style.cssText = 'font-size: 20px; font-weight: 500;';
      timeSection.appendChild(sep2);
      timeSection.appendChild(createSpinner(seconds, 0, 59));
    }

    // AM/PM toggle
    if (meridian) {
      const ampm = document.createElement('button');
      ampm.type = 'button';
      ampm.style.cssText = `
        border: 1px solid var(--md-sys-color-outline, #79747e);
        background: transparent; cursor: pointer; border-radius: 8px;
        padding: 6px 10px; font-size: 14px; font-weight: 500;
        color: var(--md-sys-color-primary, #6750a4); margin-left: 4px;
      `;
      effect(() => { ampm.textContent = hours() >= 12 ? 'PM' : 'AM'; });
      ampm.addEventListener('click', () => {
        hours.update(h => h >= 12 ? h - 12 : h + 12);
        emitDateTime();
      });
      timeSection.appendChild(ampm);
    }

    panel.appendChild(timeSection);

    function emitDateTime() {
      const val = internalValue();
      if (val) {
        const d = cloneDate(val);
        d.setHours(hours(), minutes(), seconds());
        setValue(d);
      }
    }

    // Display value
    effect(() => {
      const val = internalValue();
      if (val) {
        const dateStr = formatDate(val, locale, props.label ? undefined : { year: 'numeric', month: 'short', day: 'numeric' });
        const timeStr = formatTime(val.getHours(), val.getMinutes(), val.getSeconds(), meridian, showSeconds);
        display.textContent = `${dateStr} ${timeStr}`;
        display.style.color = 'var(--md-sys-color-on-surface, #1d1b20)';
        if (!isOpen()) {
          viewYear.set(val.getFullYear());
          viewMonth.set(val.getMonth());
        }
      } else {
        display.textContent = props.label ? '' : placeholder;
        display.style.color = 'var(--md-sys-color-on-surface-variant, #49454f)';
      }
    });

    // Calendar rebuild
    effect(() => {
      const y = viewYear();
      const m = viewMonth();
      const val = internalValue();
      createCalendarGrid(calendarContainer, viewYear, viewMonth, val, props.min ?? null, props.max ?? null, (date) => {
        const d = cloneDate(date);
        d.setHours(hours(), minutes(), seconds());
        setValue(d);
      });
    });

    // Open/close
    const onScrollClose = () => { closePanel(); };

    function openPanel() {
      if (disabled) return;
      isOpen.set(true);
      const rect = field.getBoundingClientRect();
      const panelH = 420;
      const openAbove = window.innerHeight - rect.bottom < panelH && rect.top > panelH;
      panel.style.left = `${rect.left}px`;
      if (openAbove) {
        panel.style.bottom = `${window.innerHeight - rect.top + 4}px`;
        panel.style.top = '';
        panel.style.transformOrigin = 'bottom left';
      } else {
        panel.style.top = `${rect.bottom + 4}px`;
        panel.style.bottom = '';
      }
      panel.style.opacity = '1';
      panel.style.transform = 'scaleY(1)';
      panel.style.pointerEvents = 'auto';
      field.style.borderColor = 'var(--md-sys-color-primary, #6750a4)';
      field.style.borderWidth = '2px';
      window.addEventListener('scroll', onScrollClose, { capture: true });
    }

    function closePanel() {
      isOpen.set(false);
      panel.style.opacity = '0';
      panel.style.transform = 'scaleY(0.9)';
      panel.style.pointerEvents = 'none';
      field.style.borderColor = 'var(--md-sys-color-outline, #79747e)';
      field.style.borderWidth = '1px';
      window.removeEventListener('scroll', onScrollClose, { capture: true });
    }

    field.addEventListener('mousedown', (e) => { e.stopPropagation(); });
    panel.addEventListener('mousedown', (e) => { e.stopPropagation(); });
    field.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isOpen()) closePanel(); else openPanel();
    });

    document.addEventListener('mousedown', () => {
      if (!isOpen()) return;
      closePanel();
    });

    field.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (isOpen()) closePanel(); else openPanel(); }
      if (e.key === 'Escape') closePanel();
    });

    return wrapper;
  };
});
