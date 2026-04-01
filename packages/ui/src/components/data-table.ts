/**
 * Material Design 3 DataTable component.
 *
 * Full-featured data table built on top of the headless
 * `createDataTable` utility from @akashjs/runtime. Provides:
 *
 * - Column sorting (click header) + multi-sort (Shift+click)
 * - Global text filtering + per-column filters
 * - Column visibility toggle
 * - Column resizing (drag column borders)
 * - Column reordering (drag header to reorder)
 * - Row selection (checkbox with select-all + Shift-range)
 * - Row striping (zebra)
 * - Sticky header
 * - Pagination
 * - Custom cell rendering + inline editing
 * - Loading / empty states
 * - Row click / row context menu
 * - Row expand / detail row
 * - Row drag reorder
 * - Row grouping
 * - Tree / hierarchical rows
 * - Footer summary row
 * - CSV + Excel export
 * - Keyboard navigation (arrow keys, Enter, Escape)
 * - Responsive card stacking
 * - Virtual scroll for large datasets
 */

import { defineComponent, effect, signal, computed } from '@akashjs/runtime';
import { createDataTable } from '@akashjs/runtime';
import type { ColumnDef } from '@akashjs/runtime';
import type { AkashNode } from '@akashjs/runtime';

// --- Types ---

export interface DataTableColumnDef<T = any> extends ColumnDef<T> {
  /** Fixed width (e.g. '120px', '10%') */
  width?: string;
  /** Minimum width when resizing (default: '50px') */
  minWidth?: string;
  /** Text alignment: 'left' | 'center' | 'right' */
  align?: 'left' | 'center' | 'right';
  /** Whether this column can be resized (default: follows table resizable prop) */
  resizable?: boolean;
  /** Pin column to 'left' or 'right' */
  pin?: 'left' | 'right';
  /** Enable per-column filter input below header */
  columnFilter?: boolean;
  /** Per-column filter type */
  columnFilterType?: 'text' | 'select';
  /** Options for select-type column filter */
  columnFilterOptions?: { label: string; value: string }[];
  /** Whether this column supports inline editing */
  editable?: boolean;
  /** Custom editor renderer (receives value, row, commit callback) */
  renderEditor?: (value: unknown, row: T, commit: (newValue: unknown) => void) => AkashNode;
}

export interface SortEntry {
  column: string;
  direction: 'asc' | 'desc';
}

export interface DataTableProps<T = any> {
  /** Column definitions */
  columns: DataTableColumnDef<T>[];
  /** Reactive data source (function) or static array */
  data: (() => T[]) | T[];
  /** Unique key field on each row for stable identity */
  rowKey?: string;
  /** Page size (0 = no pagination) */
  pageSize?: number;
  /** Enable row selection checkboxes */
  selectable?: boolean;
  /** Enable column resizing */
  resizable?: boolean;
  /** Enable column reordering via drag */
  reorderable?: boolean;
  /** Zebra striping */
  striped?: boolean;
  /** Sticky header */
  stickyHeader?: boolean;
  /** Show loading overlay */
  loading?: boolean;
  /** Message when no data */
  emptyMessage?: string;
  /** Row click handler */
  onRowClick?: (row: T) => void;
  /** Selection change handler */
  onSelectionChange?: (selected: T[]) => void;
  /** Sort change handler */
  onSortChange?: (sorts: SortEntry[]) => void;
  /** Custom cell renderers by column key */
  renderCell?: Record<string, (value: unknown, row: T, index: number) => AkashNode>;
  /** Expand row renderer — if provided, rows become expandable */
  renderExpandedRow?: (row: T) => AkashNode;
  /** Footer summary row renderer by column key */
  renderFooter?: Record<string, (allRows: T[]) => AkashNode>;
  /** Max height for scrollable body (e.g. '400px') */
  maxHeight?: string;
  /** Table width (default: '100%') */
  width?: string;
  /** Whether to show the global filter input */
  filterable?: boolean;
  /** Placeholder for the filter input */
  filterPlaceholder?: string;
  /** External filter text (controlled mode) */
  filterText?: string;
  /** External filter change handler */
  onFilterChange?: (text: string) => void;
  /** Initial sort state */
  initialSort?: { column: string; direction: 'asc' | 'desc' };
  /** Enable CSV export button */
  exportable?: boolean;
  /** Enable Excel export button */
  exportExcel?: boolean;
  /** Filename for export (default: 'data') */
  exportFilename?: string;
  /** Row context menu items */
  contextMenu?: (row: T) => { label: string; icon?: string; onClick: () => void; disabled?: boolean }[];
  /** Enable row drag reorder */
  rowDraggable?: boolean;
  /** Callback after rows are reordered via drag */
  onRowReorder?: (fromIndex: number, toIndex: number) => void;
  /** Group rows by a column key */
  groupBy?: string;
  /** Whether groups are initially collapsed */
  groupCollapsed?: boolean;
  /** Custom group header renderer */
  renderGroupHeader?: (groupValue: unknown, rows: T[]) => AkashNode;
  /** Children key for tree/hierarchical rows */
  childrenKey?: string;
  /** Initially expanded tree node keys */
  defaultExpandedTreeKeys?: unknown[];
  /** Inline edit commit handler */
  onCellEdit?: (row: T, columnKey: string, newValue: unknown) => void;
  /** Enable keyboard navigation */
  keyboardNav?: boolean;
  /** Responsive breakpoint (px) — below this, table stacks to card layout */
  responsiveBreakpoint?: number;
  /** Column reorder change handler */
  onColumnReorder?: (columnKeys: string[]) => void;
  /** Per-column filter change handler */
  onColumnFilterChange?: (filters: Record<string, string>) => void;
  /** Enable virtual scrolling (requires maxHeight) */
  virtualScroll?: boolean;
  /** Virtual scroll row height in px (default: 48) */
  virtualRowHeight?: number;
  /** Virtual scroll overscan rows (default: 5) */
  virtualOverscan?: number;
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

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((o: any, k) => o?.[k], obj);
}

function setNestedValue(obj: any, path: string, value: unknown): void {
  const keys = path.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]];
  cur[keys[keys.length - 1]] = value;
}

function escapeCSV(val: unknown): string {
  const str = val == null ? '' : String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// --- Component ---

export const DataTable = defineComponent<DataTableProps>((ctx) => {
  return () => {
    const props = ctx.props;
    const rowKey = props.rowKey ?? 'id';
    const selectable = props.selectable ?? false;
    const resizable = props.resizable ?? false;
    const reorderable = props.reorderable ?? false;
    const striped = props.striped ?? false;
    const stickyHeader = props.stickyHeader ?? true;
    const emptyMessage = props.emptyMessage ?? 'No data';
    const filterable = props.filterable ?? false;
    const exportable = props.exportable ?? false;
    const exportExcel = props.exportExcel ?? false;
    const exportFilename = props.exportFilename ?? 'data';
    const maxHeight = props.maxHeight;
    const renderCell = props.renderCell ?? {};
    const renderExpandedRow = props.renderExpandedRow;
    const renderFooter = props.renderFooter;
    const rowDraggable = props.rowDraggable ?? false;
    const groupBy = props.groupBy;
    const childrenKey = props.childrenKey;
    const keyboardNav = props.keyboardNav ?? true;
    const responsiveBreakpoint = props.responsiveBreakpoint ?? 0;
    const virtualScroll = props.virtualScroll ?? false;
    const virtualRowHeight = props.virtualRowHeight ?? 48;
    const virtualOverscan = props.virtualOverscan ?? 5;
    const hasColumnFilters = props.columns.some(c => c.columnFilter);

    // --- Column order state ---
    const columnOrder = signal<string[]>(props.columns.map(c => c.key));
    const columnMap = new Map(props.columns.map(c => [c.key, c]));

    const orderedColumns = computed(() => {
      const order = columnOrder();
      return order.map(k => columnMap.get(k)!).filter(Boolean);
    });

    // Resolve data source
    const getData = typeof props.data === 'function'
      ? props.data as () => any[]
      : () => props.data as any[];

    // Create headless data table (uses first column set)
    const table = createDataTable({
      data: getData,
      columns: props.columns as ColumnDef<any>[],
      pageSize: props.pageSize ?? 0,
      initialSort: props.initialSort
        ? { column: props.initialSort.column, direction: props.initialSort.direction }
        : undefined,
    });

    // --- State signals ---
    const selectedKeys = signal<Set<unknown>>(new Set());
    const expandedKeys = signal<Set<unknown>>(new Set());
    const columnWidths = signal<Record<string, number>>({});
    const multiSort = signal<SortEntry[]>(
      props.initialSort ? [{ column: props.initialSort.column, direction: props.initialSort.direction }] : []
    );
    const columnFilters = signal<Record<string, string>>({});
    const groupCollapsed = signal<Set<string>>(new Set());
    const treeExpanded = signal<Set<unknown>>(
      new Set(props.defaultExpandedTreeKeys ?? [])
    );
    const editingCell = signal<{ rowKey: unknown; colKey: string } | null>(null);
    const focusedCell = signal<{ row: number; col: number }>({ row: 0, col: 0 });
    const isCardLayout = signal(false);
    const lastSelectedIndex = signal<number>(-1);

    // --- Multi-sort logic ---
    // The headless table only supports single sort, so we apply multi-sort manually
    const multiSortedRows = computed(() => {
      const sorts = multiSort();
      if (sorts.length === 0) return table.allRows() as any[];

      const rows = [...(table.allRows() as any[])];
      const cols = props.columns;
      rows.sort((a, b) => {
        for (const s of sorts) {
          const colDef = cols.find(c => c.key === s.column);
          if (!colDef) continue;
          const aVal = colDef.accessor ? colDef.accessor(a) : getNestedValue(a, s.column);
          const bVal = colDef.accessor ? colDef.accessor(b) : getNestedValue(b, s.column);
          let cmp: number;
          if (colDef.compare) {
            cmp = colDef.compare(a, b);
          } else {
            if (aVal == null && bVal == null) cmp = 0;
            else if (aVal == null) cmp = -1;
            else if (bVal == null) cmp = 1;
            else if (typeof aVal === 'number' && typeof bVal === 'number') cmp = aVal - bVal;
            else cmp = String(aVal).localeCompare(String(bVal));
          }
          if (s.direction === 'desc') cmp = -cmp;
          if (cmp !== 0) return cmp;
        }
        return 0;
      });
      return rows;
    });

    // --- Per-column filter logic ---
    const columnFilteredRows = computed(() => {
      const filters = columnFilters();
      let rows = multiSortedRows();
      for (const [colKey, filterVal] of Object.entries(filters)) {
        if (!filterVal) continue;
        const lower = filterVal.toLowerCase();
        const colDef = columnMap.get(colKey);
        rows = rows.filter((row: any) => {
          const val = colDef?.accessor ? colDef.accessor(row) : getNestedValue(row, colKey);
          return String(val ?? '').toLowerCase().includes(lower);
        });
      }
      return rows;
    });

    // --- Grouping logic ---
    function groupRows(rows: any[]): { key: string; value: unknown; rows: any[] }[] | null {
      if (!groupBy) return null;
      const groups = new Map<string, { value: unknown; rows: any[] }>();
      for (const row of rows) {
        const val = getNestedValue(row, groupBy);
        const key = String(val ?? '');
        if (!groups.has(key)) groups.set(key, { value: val, rows: [] });
        groups.get(key)!.rows.push(row);
      }
      return Array.from(groups.entries()).map(([key, g]) => ({ key, value: g.value, rows: g.rows }));
    }

    // --- Tree flattening ---
    function flattenTree(rows: any[], depth: number = 0): { row: any; depth: number; hasChildren: boolean; key: unknown }[] {
      if (!childrenKey) return rows.map(r => ({ row: r, depth: 0, hasChildren: false, key: r[rowKey] }));
      const result: { row: any; depth: number; hasChildren: boolean; key: unknown }[] = [];
      const exp = treeExpanded();
      for (const row of rows) {
        const key = row[rowKey];
        const children = row[childrenKey] as any[] | undefined;
        const hasChildren = Array.isArray(children) && children.length > 0;
        result.push({ row, depth, hasChildren, key });
        if (hasChildren && exp.has(key)) {
          result.push(...flattenTree(children, depth + 1));
        }
      }
      return result;
    }

    // --- Pagination on filtered rows ---
    const pageSize = props.pageSize ?? 0;
    const displayPage = signal(1);
    const displayRows = computed(() => {
      const rows = columnFilteredRows();
      if (pageSize <= 0) return rows;
      const p = displayPage();
      return rows.slice((p - 1) * pageSize, p * pageSize);
    });
    const displayTotalRows = computed(() => columnFilteredRows().length);
    const displayTotalPages = computed(() => {
      if (pageSize <= 0) return 1;
      return Math.max(1, Math.ceil(displayTotalRows() / pageSize));
    });

    // --- Build DOM ---
    const wrapper = document.createElement('div');
    wrapper.className = 'akash-data-table';
    wrapper.setAttribute('role', 'grid');
    wrapper.tabIndex = 0;
    wrapper.style.cssText = `
      width: ${props.width ?? '100%'};
      font-family: var(--md-sys-typescale-body-medium-font, system-ui);
      font-size: 14px;
      color: var(--md-sys-color-on-surface, #1c1b1f);
      border: 1px solid var(--md-sys-color-outline-variant, #c4c7c5);
      border-radius: 12px;
      overflow: hidden;
      position: relative;
      outline: none;
    `;

    // --- Responsive observer ---
    if (responsiveBreakpoint > 0) {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          isCardLayout.set(entry.contentRect.width < responsiveBreakpoint);
        }
      });
      ro.observe(wrapper);
    }

    // --- Toolbar (filter + export) ---
    if (filterable || exportable || exportExcel) {
      const toolbar = document.createElement('div');
      toolbar.style.cssText = `
        display: flex; align-items: center; gap: 8px;
        padding: 8px 16px;
        border-bottom: 1px solid var(--md-sys-color-outline-variant, #c4c7c5);
        background: var(--md-sys-color-surface, #fff);
        flex-wrap: wrap;
      `;

      if (filterable) {
        const filterInput = document.createElement('input');
        filterInput.type = 'text';
        filterInput.placeholder = props.filterPlaceholder ?? 'Filter...';
        filterInput.style.cssText = `
          flex: 1; min-width: 120px; padding: 6px 12px;
          border: 1px solid var(--md-sys-color-outline, #79747e);
          border-radius: 8px; outline: none; font-size: 14px;
          font-family: inherit;
          background: var(--md-sys-color-surface-container-low, #f7f2fa);
          color: inherit;
        `;
        filterInput.addEventListener('input', () => {
          table.filter(filterInput.value);
          props.onFilterChange?.(filterInput.value);
        });
        if (props.filterText != null) {
          filterInput.value = props.filterText;
          table.filter(props.filterText);
        }
        toolbar.appendChild(filterInput);
      }

      if (exportable) {
        const btn = document.createElement('button');
        btn.textContent = 'CSV';
        btn.title = 'Export as CSV';
        btn.style.cssText = toolbarBtnCSS;
        btn.addEventListener('click', () => exportCSV(columnFilteredRows(), orderedColumns(), exportFilename));
        toolbar.appendChild(btn);
      }

      if (exportExcel) {
        const btn = document.createElement('button');
        btn.textContent = 'Excel';
        btn.title = 'Export as Excel (XLSX)';
        btn.style.cssText = toolbarBtnCSS;
        btn.addEventListener('click', () => exportXLSX(columnFilteredRows(), orderedColumns(), exportFilename));
        toolbar.appendChild(btn);
      }

      wrapper.appendChild(toolbar);
    }

    // --- Scroll container ---
    const scrollContainer = document.createElement('div');
    scrollContainer.style.cssText = `
      overflow: auto;
      ${maxHeight ? `max-height: ${maxHeight};` : ''}
      position: relative;
    `;

    // --- Card layout container (responsive) ---
    const cardContainer = document.createElement('div');
    cardContainer.style.cssText = 'display: none;';

    // --- Table ---
    const tableEl = document.createElement('table');
    tableEl.style.cssText = `
      width: 100%; border-collapse: collapse; table-layout: fixed;
    `;

    // --- Colgroup ---
    const colgroup = document.createElement('colgroup');
    function rebuildColgroup() {
      colgroup.textContent = '';
      if (selectable) {
        const c = document.createElement('col');
        c.style.width = '48px';
        colgroup.appendChild(c);
      }
      if (renderExpandedRow || childrenKey) {
        const c = document.createElement('col');
        c.style.width = '40px';
        colgroup.appendChild(c);
      }
      if (rowDraggable) {
        const c = document.createElement('col');
        c.style.width = '36px';
        colgroup.appendChild(c);
      }
      for (const col of orderedColumns()) {
        const c = document.createElement('col');
        const widths = columnWidths();
        c.style.width = widths[col.key] ? `${widths[col.key]}px` : (col.width ?? 'auto');
        c.dataset.key = col.key;
        colgroup.appendChild(c);
      }
    }
    rebuildColgroup();
    tableEl.appendChild(colgroup);

    // Reactively update colgroup
    effect(() => {
      columnWidths();
      columnOrder();
      rebuildColgroup();
    });

    // --- Header ---
    const thead = document.createElement('thead');
    if (stickyHeader) thead.style.cssText = 'position: sticky; top: 0; z-index: 2;';

    function buildHeaderRows() {
      thead.textContent = '';
      const headerRow = document.createElement('tr');
      headerRow.style.cssText = `
        background: var(--md-sys-color-surface-container, #f5f5f5);
        border-bottom: 1px solid var(--md-sys-color-outline-variant, #c4c7c5);
      `;

      const thCSS = (col: DataTableColumnDef) => `
        padding: 12px 16px; text-align: ${col.align ?? 'left'};
        font-weight: 500; font-size: 12px; letter-spacing: 0.5px;
        text-transform: uppercase;
        color: var(--md-sys-color-on-surface-variant, #49454f);
        border-bottom: 2px solid var(--md-sys-color-outline-variant, #c4c7c5);
        user-select: none; position: relative; white-space: nowrap;
        overflow: hidden; text-overflow: ellipsis;
        ${col.pin ? `position: sticky; ${col.pin}: 0; z-index: 1; background: var(--md-sys-color-surface-container, #f5f5f5);` : ''}
      `;

      // Select-all
      if (selectable) {
        const th = document.createElement('th');
        th.style.cssText = 'width: 48px; padding: 8px; text-align: center; border-bottom: 2px solid var(--md-sys-color-outline-variant, #c4c7c5);';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.style.cursor = 'pointer';
        cb.addEventListener('change', () => {
          const rows = displayRows();
          selectedKeys.set(cb.checked ? new Set(rows.map((r: any) => r[rowKey])) : new Set());
          props.onSelectionChange?.(getSelectedRows());
        });
        effect(() => {
          const rows = displayRows();
          const sel = selectedKeys();
          if (rows.length === 0) { cb.checked = false; cb.indeterminate = false; }
          else {
            const all = rows.every((r: any) => sel.has(r[rowKey]));
            const some = rows.some((r: any) => sel.has(r[rowKey]));
            cb.checked = all; cb.indeterminate = some && !all;
          }
        });
        th.appendChild(cb);
        headerRow.appendChild(th);
      }

      // Expand column
      if (renderExpandedRow || childrenKey) {
        const th = document.createElement('th');
        th.style.cssText = 'width: 40px; padding: 8px; border-bottom: 2px solid var(--md-sys-color-outline-variant, #c4c7c5);';
        headerRow.appendChild(th);
      }

      // Drag handle column
      if (rowDraggable) {
        const th = document.createElement('th');
        th.style.cssText = 'width: 36px; padding: 8px; border-bottom: 2px solid var(--md-sys-color-outline-variant, #c4c7c5);';
        headerRow.appendChild(th);
      }

      // Data columns
      const cols = orderedColumns();
      for (let i = 0; i < cols.length; i++) {
        const col = cols[i];
        const th = document.createElement('th');
        th.style.cssText = thCSS(col);
        th.dataset.colKey = col.key;

        // Drag reorder for columns
        if (reorderable) {
          th.draggable = true;
          th.addEventListener('dragstart', (e) => {
            e.dataTransfer!.setData('text/plain', col.key);
            e.dataTransfer!.effectAllowed = 'move';
            th.style.opacity = '0.5';
          });
          th.addEventListener('dragend', () => { th.style.opacity = '1'; });
          th.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer!.dropEffect = 'move';
            th.style.borderLeft = '2px solid var(--md-sys-color-primary, #6750a4)';
          });
          th.addEventListener('dragleave', () => { th.style.borderLeft = ''; });
          th.addEventListener('drop', (e) => {
            e.preventDefault();
            th.style.borderLeft = '';
            const fromKey = e.dataTransfer!.getData('text/plain');
            if (fromKey === col.key) return;
            columnOrder.update(order => {
              const arr = [...order];
              const fromIdx = arr.indexOf(fromKey);
              const toIdx = arr.indexOf(col.key);
              if (fromIdx < 0 || toIdx < 0) return arr;
              arr.splice(fromIdx, 1);
              arr.splice(toIdx, 0, fromKey);
              return arr;
            });
            props.onColumnReorder?.(columnOrder());
          });
        }

        // Header text + sort indicator
        const span = document.createElement('span');
        span.style.cssText = 'display: inline-flex; align-items: center; gap: 4px;';
        span.textContent = col.header;

        if (col.sortable) {
          th.style.cursor = 'pointer';
          const icon = document.createElement('span');
          icon.style.cssText = 'font-size: 14px; opacity: 0.4; transition: opacity 120ms;';
          icon.textContent = '↕';
          span.appendChild(icon);

          effect(() => {
            const sorts = multiSort();
            const entry = sorts.find(s => s.column === col.key);
            if (entry) {
              const idx = sorts.indexOf(entry);
              icon.textContent = (entry.direction === 'asc' ? '↑' : '↓') + (sorts.length > 1 ? `${idx + 1}` : '');
              icon.style.opacity = '1';
            } else {
              icon.textContent = '↕';
              icon.style.opacity = '0.4';
            }
          });

          th.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).closest('[data-resize-handle]')) return;
            const isMulti = e.shiftKey;
            multiSort.update(sorts => {
              const arr = isMulti ? [...sorts] : [];
              const idx = arr.findIndex(s => s.column === col.key);
              if (idx >= 0) {
                if (arr[idx].direction === 'asc') arr[idx] = { column: col.key, direction: 'desc' };
                else arr.splice(idx, 1);
              } else {
                arr.push({ column: col.key, direction: 'asc' });
              }
              return arr;
            });
            // Also update headless table for single sort (fallback)
            if (!e.shiftKey) table.sort(col.key);
            props.onSortChange?.(multiSort());
          });
        }
        th.appendChild(span);

        // Resize handle
        if (col.resizable ?? resizable) {
          const handle = document.createElement('div');
          handle.dataset.resizeHandle = '1';
          handle.style.cssText = `
            position: absolute; right: 0; top: 0; bottom: 0; width: 4px;
            cursor: col-resize; background: transparent; transition: background 120ms; z-index: 3;
          `;
          handle.addEventListener('mouseenter', () => { handle.style.background = 'var(--md-sys-color-primary, #6750a4)'; });
          handle.addEventListener('mouseleave', () => { if (!handle.dataset.dragging) handle.style.background = 'transparent'; });
          handle.addEventListener('mousedown', (e) => {
            e.preventDefault(); e.stopPropagation();
            handle.dataset.dragging = '1';
            handle.style.background = 'var(--md-sys-color-primary, #6750a4)';
            const startX = e.clientX;
            const startWidth = th.offsetWidth;
            const minW = parseInt(col.minWidth ?? '50', 10);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            const onMove = (ev: MouseEvent) => {
              columnWidths.update(w => ({ ...w, [col.key]: Math.max(minW, startWidth + ev.clientX - startX) }));
            };
            const onUp = () => {
              document.removeEventListener('mousemove', onMove);
              document.removeEventListener('mouseup', onUp);
              document.body.style.cursor = '';
              document.body.style.userSelect = '';
              delete handle.dataset.dragging;
              handle.style.background = 'transparent';
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
          });
          th.appendChild(handle);
        }

        headerRow.appendChild(th);
      }
      thead.appendChild(headerRow);

      // --- Per-column filter row ---
      if (hasColumnFilters) {
        const filterRow = document.createElement('tr');
        filterRow.style.cssText = `
          background: var(--md-sys-color-surface-container-low, #f7f2fa);
          border-bottom: 1px solid var(--md-sys-color-outline-variant, #c4c7c5);
        `;
        // Spacer cells for checkbox/expand/drag columns
        const spacerCount = (selectable ? 1 : 0) + (renderExpandedRow || childrenKey ? 1 : 0) + (rowDraggable ? 1 : 0);
        for (let s = 0; s < spacerCount; s++) {
          const td = document.createElement('td');
          td.style.padding = '4px';
          filterRow.appendChild(td);
        }
        for (const col of cols) {
          const td = document.createElement('td');
          td.style.cssText = 'padding: 4px 8px;';
          if (col.columnFilter) {
            if (col.columnFilterType === 'select' && col.columnFilterOptions) {
              const sel = document.createElement('select');
              sel.style.cssText = colFilterCSS;
              const opt0 = document.createElement('option');
              opt0.value = '';
              opt0.textContent = 'All';
              sel.appendChild(opt0);
              for (const o of col.columnFilterOptions) {
                const opt = document.createElement('option');
                opt.value = o.value;
                opt.textContent = o.label;
                sel.appendChild(opt);
              }
              sel.addEventListener('change', () => {
                columnFilters.update(f => ({ ...f, [col.key]: sel.value }));
                displayPage.set(1);
                props.onColumnFilterChange?.(columnFilters());
              });
              td.appendChild(sel);
            } else {
              const input = document.createElement('input');
              input.type = 'text';
              input.placeholder = `Filter ${col.header}...`;
              input.style.cssText = colFilterCSS;
              input.addEventListener('input', () => {
                columnFilters.update(f => ({ ...f, [col.key]: input.value }));
                displayPage.set(1);
                props.onColumnFilterChange?.(columnFilters());
              });
              td.appendChild(input);
            }
          }
          filterRow.appendChild(td);
        }
        thead.appendChild(filterRow);
      }
    }
    // Build headers reactively (column order can change)
    effect(() => { orderedColumns(); buildHeaderRows(); });
    tableEl.appendChild(thead);

    // --- Body ---
    const tbody = document.createElement('tbody');
    tableEl.appendChild(tbody);

    // --- Footer ---
    if (renderFooter) {
      const tfoot = document.createElement('tfoot');
      effect(() => {
        tfoot.textContent = '';
        const footerRow = document.createElement('tr');
        footerRow.style.cssText = `
          background: var(--md-sys-color-surface-container, #f5f5f5);
          border-top: 2px solid var(--md-sys-color-outline-variant, #c4c7c5);
          font-weight: 500;
        `;
        const spacerCount = (selectable ? 1 : 0) + (renderExpandedRow || childrenKey ? 1 : 0) + (rowDraggable ? 1 : 0);
        for (let s = 0; s < spacerCount; s++) {
          const td = document.createElement('td');
          td.style.padding = '8px';
          footerRow.appendChild(td);
        }
        for (const col of orderedColumns()) {
          const td = document.createElement('td');
          td.style.cssText = `padding: 12px 16px; text-align: ${col.align ?? 'left'};`;
          if (renderFooter![col.key]) {
            const content = renderFooter![col.key](columnFilteredRows());
            td.appendChild(nodeToDOM(content));
          }
          footerRow.appendChild(td);
        }
        tfoot.appendChild(footerRow);
      });
      tableEl.appendChild(tfoot);
    }

    // --- Context menu panel ---
    let ctxPanel: HTMLDivElement | null = null;
    if (props.contextMenu) {
      ctxPanel = document.createElement('div');
      ctxPanel.style.cssText = `
        position: fixed; z-index: 4000; min-width: 140px;
        background: var(--md-sys-color-surface-container, #fff);
        border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        padding: 4px 0; display: none; font-size: 14px;
      `;
      document.body.appendChild(ctxPanel);
      document.addEventListener('click', () => { if (ctxPanel) ctxPanel.style.display = 'none'; });
    }

    // --- Virtual scroll spacers ---
    const vsTopSpacer = document.createElement('tr');
    const vsBottomSpacer = document.createElement('tr');
    const vsTopTd = document.createElement('td');
    const vsBottomTd = document.createElement('td');
    vsTopSpacer.appendChild(vsTopTd);
    vsBottomSpacer.appendChild(vsBottomTd);

    // --- Reactive body rendering ---
    effect(() => {
      const rows = displayRows() as any[];
      const sel = selectedKeys();
      const expanded = expandedKeys();
      const cols = orderedColumns();
      const editing = editingCell();
      const card = isCardLayout();
      const totalColSpan = cols.length + (selectable ? 1 : 0) + (renderExpandedRow || childrenKey ? 1 : 0) + (rowDraggable ? 1 : 0);

      // --- Card layout ---
      if (card && responsiveBreakpoint > 0) {
        tableEl.style.display = 'none';
        cardContainer.style.display = 'block';
        cardContainer.textContent = '';
        for (const row of rows) {
          const card = document.createElement('div');
          card.style.cssText = `
            border: 1px solid var(--md-sys-color-outline-variant, #c4c7c5);
            border-radius: 8px; padding: 12px; margin: 8px;
            background: var(--md-sys-color-surface, #fff);
          `;
          for (const col of cols) {
            const line = document.createElement('div');
            line.style.cssText = 'display: flex; justify-content: space-between; padding: 4px 0;';
            const label = document.createElement('span');
            label.style.cssText = 'font-weight: 500; font-size: 12px; text-transform: uppercase; color: var(--md-sys-color-on-surface-variant, #49454f);';
            label.textContent = col.header;
            const val = document.createElement('span');
            const value = col.accessor ? col.accessor(row) : getNestedValue(row, col.key);
            if (renderCell[col.key]) {
              val.appendChild(nodeToDOM(renderCell[col.key](value, row, 0)));
            } else {
              val.textContent = value == null ? '' : String(value);
            }
            line.appendChild(label);
            line.appendChild(val);
            card.appendChild(line);
          }
          cardContainer.appendChild(card);
        }
        return;
      }
      tableEl.style.display = '';
      cardContainer.style.display = 'none';

      tbody.textContent = '';

      if (rows.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = totalColSpan;
        td.style.cssText = 'padding: 40px 16px; text-align: center; color: var(--md-sys-color-on-surface-variant, #49454f); font-style: italic;';
        td.textContent = emptyMessage;
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
      }

      // Tree or flat
      const treeRows = childrenKey ? flattenTree(rows) : null;
      const groups = groupBy ? groupRows(rows) : null;

      // Virtual scroll
      let visibleStart = 0;
      let visibleEnd = rows.length;
      if (virtualScroll && maxHeight) {
        const scrollTop = scrollContainer.scrollTop;
        const viewportH = scrollContainer.clientHeight || parseInt(maxHeight, 10) || 400;
        visibleStart = Math.max(0, Math.floor(scrollTop / virtualRowHeight) - virtualOverscan);
        visibleEnd = Math.min(
          (treeRows ? treeRows.length : groups ? rows.length : rows.length),
          Math.ceil((scrollTop + viewportH) / virtualRowHeight) + virtualOverscan
        );
        // Top spacer
        vsTopTd.colSpan = totalColSpan;
        vsTopTd.style.height = `${visibleStart * virtualRowHeight}px`;
        vsTopTd.style.padding = '0';
        tbody.appendChild(vsTopSpacer);
      }

      // --- Grouped rendering ---
      if (groups) {
        const collapsed = groupCollapsed();
        for (const g of groups) {
          // Group header
          const gtr = document.createElement('tr');
          gtr.style.cssText = `
            background: var(--md-sys-color-surface-container-high, #ece6f0);
            cursor: pointer; font-weight: 500;
          `;
          const gtd = document.createElement('td');
          gtd.colSpan = totalColSpan;
          gtd.style.cssText = 'padding: 10px 16px;';
          const arrow = collapsed.has(g.key) ? '▶' : '▼';
          if (props.renderGroupHeader) {
            const gSpan = document.createElement('span');
            gSpan.textContent = arrow + ' ';
            gtd.appendChild(gSpan);
            gtd.appendChild(nodeToDOM(props.renderGroupHeader(g.value, g.rows)));
          } else {
            gtd.textContent = `${arrow} ${g.value} (${g.rows.length})`;
          }
          gtr.addEventListener('click', () => {
            groupCollapsed.update(s => {
              const next = new Set(s);
              if (next.has(g.key)) next.delete(g.key); else next.add(g.key);
              return next;
            });
          });
          gtr.appendChild(gtd);
          tbody.appendChild(gtr);

          if (!collapsed.has(g.key)) {
            for (let i = 0; i < g.rows.length; i++) {
              tbody.appendChild(buildDataRow(g.rows[i], i, 0, false, cols, sel, expanded, editing, totalColSpan));
            }
          }
        }
      }
      // --- Tree rendering ---
      else if (treeRows) {
        for (let i = visibleStart; i < Math.min(visibleEnd, treeRows.length); i++) {
          const t = treeRows[i];
          tbody.appendChild(buildDataRow(t.row, i, t.depth, t.hasChildren, cols, sel, expanded, editing, totalColSpan));
        }
      }
      // --- Flat rendering ---
      else {
        for (let i = visibleStart; i < Math.min(visibleEnd, rows.length); i++) {
          tbody.appendChild(buildDataRow(rows[i], i, 0, false, cols, sel, expanded, editing, totalColSpan));
        }
      }

      // Virtual scroll bottom spacer
      if (virtualScroll && maxHeight) {
        const totalItems = treeRows ? treeRows.length : rows.length;
        vsBottomTd.colSpan = totalColSpan;
        vsBottomTd.style.height = `${(totalItems - visibleEnd) * virtualRowHeight}px`;
        vsBottomTd.style.padding = '0';
        tbody.appendChild(vsBottomSpacer);
      }
    }, { render: true });

    // Virtual scroll listener
    if (virtualScroll && maxHeight) {
      let ticking = false;
      scrollContainer.addEventListener('scroll', () => {
        if (!ticking) {
          requestAnimationFrame(() => {
            // Trigger re-render by reading/writing a dep
            // The effect reads scrollContainer.scrollTop directly,
            // but we need to trigger it. Touch a signal.
            displayPage.update(p => p); // no-op update triggers effect
            ticking = false;
          });
          ticking = true;
        }
      });
    }

    // --- Build a single data row ---
    let dragSourceIndex = -1;
    function buildDataRow(
      row: any, flatIndex: number, depth: number, hasChildren: boolean,
      cols: DataTableColumnDef[], sel: Set<unknown>, expanded: Set<unknown>,
      editing: { rowKey: unknown; colKey: string } | null,
      totalColSpan: number,
    ): DocumentFragment {
      const frag = document.createDocumentFragment();
      const key = row[rowKey];
      const tr = document.createElement('tr');
      tr.dataset.rowIndex = String(flatIndex);
      tr.style.cssText = `
        border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
        transition: background 80ms;
        ${striped && flatIndex % 2 === 1 ? 'background: var(--md-sys-color-surface-container-lowest, #fafafa);' : ''}
        ${virtualScroll ? `height: ${virtualRowHeight}px;` : ''}
      `;
      const defaultBg = striped && flatIndex % 2 === 1 ? 'var(--md-sys-color-surface-container-lowest, #fafafa)' : '';
      tr.addEventListener('mouseenter', () => { tr.style.background = 'var(--md-sys-color-surface-container-highest, #e6e0e9)'; });
      tr.addEventListener('mouseleave', () => { tr.style.background = defaultBg; });

      if (props.onRowClick) {
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', (e) => {
          const tag = (e.target as HTMLElement).tagName;
          if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
          if ((e.target as HTMLElement).dataset.expandToggle || (e.target as HTMLElement).dataset.dragHandle) return;
          props.onRowClick!(row);
        });
      }

      // Context menu
      if (props.contextMenu && ctxPanel) {
        tr.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          const items = props.contextMenu!(row);
          ctxPanel!.textContent = '';
          ctxPanel!.style.display = 'block';
          ctxPanel!.style.left = `${e.clientX}px`;
          ctxPanel!.style.top = `${e.clientY}px`;
          for (const item of items) {
            const div = document.createElement('div');
            div.style.cssText = `
              padding: 8px 16px; cursor: ${item.disabled ? 'default' : 'pointer'};
              opacity: ${item.disabled ? '0.38' : '1'}; display: flex; align-items: center; gap: 8px;
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
            label.textContent = item.label;
            div.appendChild(label);
            if (!item.disabled) {
              div.addEventListener('mouseenter', () => { div.style.background = 'var(--md-sys-color-surface-container-highest, #f0f0f0)'; });
              div.addEventListener('mouseleave', () => { div.style.background = ''; });
              div.addEventListener('click', (ev) => { ev.stopPropagation(); item.onClick(); ctxPanel!.style.display = 'none'; });
            }
            ctxPanel!.appendChild(div);
          }
        });
      }

      // Row drag handle
      if (rowDraggable) {
        const td = document.createElement('td');
        td.style.cssText = 'width: 36px; padding: 4px 8px; text-align: center; cursor: grab;';
        td.dataset.dragHandle = '1';
        td.textContent = '⠿';
        td.draggable = true;
        td.addEventListener('dragstart', (e) => {
          dragSourceIndex = flatIndex;
          e.dataTransfer!.effectAllowed = 'move';
          tr.style.opacity = '0.4';
        });
        td.addEventListener('dragend', () => { tr.style.opacity = '1'; });
        tr.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer!.dropEffect = 'move';
          tr.style.borderTop = '2px solid var(--md-sys-color-primary, #6750a4)';
        });
        tr.addEventListener('dragleave', () => { tr.style.borderTop = ''; });
        tr.addEventListener('drop', (e) => {
          e.preventDefault();
          tr.style.borderTop = '';
          if (dragSourceIndex >= 0 && dragSourceIndex !== flatIndex) {
            props.onRowReorder?.(dragSourceIndex, flatIndex);
          }
          dragSourceIndex = -1;
        });
        tr.appendChild(td);
      }

      // Selection checkbox
      if (selectable) {
        const td = document.createElement('td');
        td.style.cssText = 'width: 48px; padding: 8px; text-align: center;';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = sel.has(key);
        cb.style.cursor = 'pointer';
        cb.addEventListener('click', (e) => {
          const shiftHeld = (e as MouseEvent).shiftKey;
          if (shiftHeld && lastSelectedIndex() >= 0) {
            // Shift-range select
            const from = Math.min(lastSelectedIndex(), flatIndex);
            const to = Math.max(lastSelectedIndex(), flatIndex);
            const allRows = displayRows() as any[];
            selectedKeys.update(s => {
              const next = new Set(s);
              for (let r = from; r <= to; r++) {
                if (allRows[r]) next.add(allRows[r][rowKey]);
              }
              return next;
            });
          } else {
            selectedKeys.update(s => {
              const next = new Set(s);
              if (cb.checked) next.add(key); else next.delete(key);
              return next;
            });
          }
          lastSelectedIndex.set(flatIndex);
          props.onSelectionChange?.(getSelectedRows());
        });
        td.appendChild(cb);
        tr.appendChild(td);
      }

      // Expand/tree toggle
      if (renderExpandedRow || childrenKey) {
        const td = document.createElement('td');
        td.style.cssText = `width: 40px; padding: 8px; text-align: center; ${childrenKey ? `padding-left: ${8 + depth * 16}px;` : ''}`;
        if (childrenKey && hasChildren) {
          const toggle = document.createElement('span');
          toggle.dataset.expandToggle = '1';
          toggle.style.cssText = 'cursor: pointer; font-size: 14px; user-select: none; display: inline-block; transition: transform 120ms;';
          const isExp = treeExpanded().has(key);
          toggle.textContent = '▶';
          toggle.style.transform = isExp ? 'rotate(90deg)' : '';
          toggle.addEventListener('click', () => {
            treeExpanded.update(s => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; });
          });
          td.appendChild(toggle);
        } else if (renderExpandedRow) {
          const toggle = document.createElement('span');
          toggle.dataset.expandToggle = '1';
          toggle.style.cssText = 'cursor: pointer; font-size: 14px; user-select: none; display: inline-block; transition: transform 120ms;';
          toggle.textContent = '▶';
          toggle.style.transform = expanded.has(key) ? 'rotate(90deg)' : '';
          toggle.addEventListener('click', () => {
            expandedKeys.update(s => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; });
          });
          td.appendChild(toggle);
        } else if (childrenKey) {
          // Leaf node in tree — indent spacer
          td.style.paddingLeft = `${8 + depth * 16}px`;
        }
        tr.appendChild(td);
      }

      // Data cells
      for (let ci = 0; ci < cols.length; ci++) {
        const col = cols[ci];
        const td = document.createElement('td');
        td.style.cssText = `
          padding: 12px 16px; text-align: ${col.align ?? 'left'};
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          ${col.pin ? `position: sticky; ${col.pin}: 0; z-index: 1; background: inherit;` : ''}
          ${childrenKey && ci === 0 && !(renderExpandedRow || childrenKey) ? `padding-left: ${16 + depth * 16}px;` : ''}
        `;
        td.dataset.rowIdx = String(flatIndex);
        td.dataset.colIdx = String(ci);

        const value = col.accessor ? col.accessor(row) : getNestedValue(row, col.key);
        const isEditing = editing && editing.rowKey === key && editing.colKey === col.key;

        if (isEditing && col.editable) {
          // Inline editor
          if (col.renderEditor) {
            td.appendChild(nodeToDOM(col.renderEditor(value, row, (newVal) => {
              props.onCellEdit?.(row, col.key, newVal);
              editingCell.set(null);
            })));
          } else {
            const input = document.createElement('input');
            input.type = 'text';
            input.value = value == null ? '' : String(value);
            input.style.cssText = 'width: 100%; padding: 4px; border: 1px solid var(--md-sys-color-primary, #6750a4); border-radius: 4px; font: inherit; outline: none;';
            input.addEventListener('keydown', (e) => {
              if (e.key === 'Enter') {
                props.onCellEdit?.(row, col.key, input.value);
                editingCell.set(null);
              } else if (e.key === 'Escape') {
                editingCell.set(null);
              }
            });
            input.addEventListener('blur', () => {
              props.onCellEdit?.(row, col.key, input.value);
              editingCell.set(null);
            });
            td.appendChild(input);
            requestAnimationFrame(() => { input.focus(); input.select(); });
          }
        } else if (renderCell[col.key]) {
          td.appendChild(nodeToDOM(renderCell[col.key](value, row, flatIndex)));
        } else {
          td.textContent = value == null ? '' : String(value);
        }

        // Double-click to edit
        if (col.editable) {
          td.addEventListener('dblclick', () => {
            editingCell.set({ rowKey: key, colKey: col.key });
          });
        }

        tr.appendChild(td);
      }

      frag.appendChild(tr);

      // Expanded detail row
      if (renderExpandedRow && expanded.has(key)) {
        const detailTr = document.createElement('tr');
        detailTr.style.cssText = 'background: var(--md-sys-color-surface-container-low, #f7f2fa);';
        const detailTd = document.createElement('td');
        detailTd.colSpan = totalColSpan;
        detailTd.style.cssText = 'padding: 16px;';
        detailTd.appendChild(nodeToDOM(renderExpandedRow(row)));
        detailTr.appendChild(detailTd);
        frag.appendChild(detailTr);
      }

      return frag;
    }

    scrollContainer.appendChild(tableEl);
    scrollContainer.appendChild(cardContainer);
    wrapper.appendChild(scrollContainer);

    // --- Loading overlay ---
    const loadingOverlay = document.createElement('div');
    loadingOverlay.style.cssText = `
      position: absolute; inset: 0;
      background: rgba(255,255,255,0.7);
      display: none; align-items: center; justify-content: center;
      z-index: 10; border-radius: 12px;
    `;
    const spinner = document.createElement('div');
    spinner.style.cssText = `
      width: 36px; height: 36px;
      border: 3px solid var(--md-sys-color-outline-variant, #c4c7c5);
      border-top-color: var(--md-sys-color-primary, #6750a4);
      border-radius: 50%;
      animation: akash-dt-spin 0.8s linear infinite;
    `;
    loadingOverlay.appendChild(spinner);
    wrapper.appendChild(loadingOverlay);

    if (!document.getElementById('akash-dt-styles')) {
      const style = document.createElement('style');
      style.id = 'akash-dt-styles';
      style.textContent = '@keyframes akash-dt-spin { to { transform: rotate(360deg); } }';
      document.head.appendChild(style);
    }

    effect(() => {
      const loading = readProp(props.loading) ?? false;
      loadingOverlay.style.display = loading ? 'flex' : 'none';
    }, { render: true });

    // --- Pagination ---
    if (pageSize > 0) {
      const paginationBar = document.createElement('div');
      paginationBar.style.cssText = `
        display: flex; align-items: center; justify-content: flex-end; gap: 8px;
        padding: 8px 16px;
        border-top: 1px solid var(--md-sys-color-outline-variant, #c4c7c5);
        background: var(--md-sys-color-surface, #fff);
        font-size: 13px; color: var(--md-sys-color-on-surface-variant, #49454f);
      `;
      const info = document.createElement('span');
      info.style.marginRight = 'auto';
      const prevBtn = document.createElement('button');
      prevBtn.textContent = '‹';
      prevBtn.style.cssText = pageBtnCSS;
      prevBtn.addEventListener('click', () => { displayPage.update(p => Math.max(1, p - 1)); });
      const pageInfo = document.createElement('span');
      const nextBtn = document.createElement('button');
      nextBtn.textContent = '›';
      nextBtn.style.cssText = pageBtnCSS;
      nextBtn.addEventListener('click', () => { displayPage.update(p => Math.min(displayTotalPages(), p + 1)); });

      effect(() => {
        const p = displayPage();
        const tp = displayTotalPages();
        const total = displayTotalRows();
        const start = (p - 1) * pageSize + 1;
        const end = Math.min(p * pageSize, total);
        info.textContent = total > 0 ? `${start}–${end} of ${total}` : '0 rows';
        pageInfo.textContent = `Page ${p} of ${tp}`;
        (prevBtn as HTMLButtonElement).disabled = p <= 1;
        (nextBtn as HTMLButtonElement).disabled = p >= tp;
        prevBtn.style.opacity = p <= 1 ? '0.4' : '1';
        nextBtn.style.opacity = p >= tp ? '0.4' : '1';
      });

      paginationBar.appendChild(info);
      paginationBar.appendChild(prevBtn);
      paginationBar.appendChild(pageInfo);
      paginationBar.appendChild(nextBtn);
      wrapper.appendChild(paginationBar);
    }

    // --- Keyboard navigation ---
    if (keyboardNav) {
      wrapper.addEventListener('keydown', (e) => {
        const focus = focusedCell();
        const rows = displayRows() as any[];
        const cols = orderedColumns();
        const maxRow = rows.length - 1;
        const maxCol = cols.length - 1;

        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            focusedCell.set({ row: Math.min(focus.row + 1, maxRow), col: focus.col });
            scrollToFocused();
            break;
          case 'ArrowUp':
            e.preventDefault();
            focusedCell.set({ row: Math.max(focus.row - 1, 0), col: focus.col });
            scrollToFocused();
            break;
          case 'ArrowRight':
            e.preventDefault();
            focusedCell.set({ row: focus.row, col: Math.min(focus.col + 1, maxCol) });
            break;
          case 'ArrowLeft':
            e.preventDefault();
            focusedCell.set({ row: focus.row, col: Math.max(focus.col - 1, 0) });
            break;
          case 'Enter': {
            const col = cols[focus.col];
            if (col?.editable && rows[focus.row]) {
              editingCell.set({ rowKey: rows[focus.row][rowKey], colKey: col.key });
            } else if (rows[focus.row] && props.onRowClick) {
              props.onRowClick(rows[focus.row]);
            }
            break;
          }
          case 'Escape':
            editingCell.set(null);
            break;
          case ' ':
            if (selectable && rows[focus.row]) {
              e.preventDefault();
              const key = rows[focus.row][rowKey];
              selectedKeys.update(s => {
                const next = new Set(s);
                if (next.has(key)) next.delete(key); else next.add(key);
                return next;
              });
              props.onSelectionChange?.(getSelectedRows());
            }
            break;
          case 'Home':
            e.preventDefault();
            focusedCell.set({ row: 0, col: 0 });
            break;
          case 'End':
            e.preventDefault();
            focusedCell.set({ row: maxRow, col: maxCol });
            break;
        }
      });

      // Highlight focused cell
      effect(() => {
        const focus = focusedCell();
        const cells = tbody.querySelectorAll(`td[data-row-idx="${focus.row}"][data-col-idx="${focus.col}"]`);
        // Remove previous focus
        tbody.querySelectorAll('td[data-focused]').forEach(td => {
          (td as HTMLElement).style.outline = '';
          delete (td as HTMLElement).dataset.focused;
        });
        cells.forEach(td => {
          (td as HTMLElement).style.outline = '2px solid var(--md-sys-color-primary, #6750a4)';
          (td as HTMLElement).style.outlineOffset = '-2px';
          (td as HTMLElement).dataset.focused = '1';
        });
      });

      function scrollToFocused() {
        const focus = focusedCell();
        const row = tbody.querySelector(`tr[data-row-index="${focus.row}"]`);
        if (row) (row as HTMLElement).scrollIntoView({ block: 'nearest' });
      }
    }

    // --- Helpers ---
    function getSelectedRows(): any[] {
      const sel = selectedKeys();
      return (columnFilteredRows() as any[]).filter(r => sel.has(r[rowKey]));
    }

    return wrapper;
  };
});

// --- Shared styles ---
const pageBtnCSS = `
  padding: 4px 10px;
  border: 1px solid var(--md-sys-color-outline, #79747e);
  border-radius: 8px;
  background: var(--md-sys-color-surface-container, #fff);
  color: inherit; cursor: pointer; font-size: 16px;
  font-family: inherit; line-height: 1;
`;

const toolbarBtnCSS = `
  padding: 6px 16px;
  border: 1px solid var(--md-sys-color-outline, #79747e);
  border-radius: 8px;
  background: var(--md-sys-color-surface-container, #fff);
  color: inherit; cursor: pointer; font-size: 13px;
  font-family: inherit; white-space: nowrap;
`;

const colFilterCSS = `
  width: 100%; padding: 4px 8px; border: 1px solid var(--md-sys-color-outline, #79747e);
  border-radius: 4px; font-size: 12px; font-family: inherit;
  background: var(--md-sys-color-surface, #fff); color: inherit; outline: none;
`;

// --- CSV Export ---
function exportCSV(rows: any[], columns: DataTableColumnDef[], filename: string): void {
  const headers = columns.map(c => c.header);
  const csvRows = [headers.join(',')];
  for (const row of rows) {
    csvRows.push(columns.map(col => {
      const val = col.accessor ? col.accessor(row) : getNestedValue(row, col.key);
      return escapeCSV(val);
    }).join(','));
  }
  downloadFile(csvRows.join('\n'), `${filename}.csv`, 'text/csv;charset=utf-8;');
}

// --- Excel (XLSX) Export ---
// Generates a minimal Office Open XML spreadsheet without external dependencies.
function exportXLSX(rows: any[], columns: DataTableColumnDef[], filename: string): void {
  const escXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const colLetter = (i: number) => String.fromCharCode(65 + (i % 26));

  let sheetRows = `<row r="1">${columns.map((c, i) =>
    `<c r="${colLetter(i)}1" t="inlineStr"><is><t>${escXml(c.header)}</t></is></c>`
  ).join('')}</row>`;

  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri];
    const rn = ri + 2;
    const cells = columns.map((col, ci) => {
      const val = col.accessor ? col.accessor(row) : getNestedValue(row, col.key);
      const ref = `${colLetter(ci)}${rn}`;
      if (typeof val === 'number') return `<c r="${ref}"><v>${val}</v></c>`;
      return `<c r="${ref}" t="inlineStr"><is><t>${escXml(String(val ?? ''))}</t></is></c>`;
    }).join('');
    sheetRows += `<row r="${rn}">${cells}</row>`;
  }

  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>`;

  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;

  // Build ZIP using the browser's Blob + Compression Streams API
  // Fallback: simple store-only ZIP (no compression) for max compat
  const enc = new TextEncoder();
  const files: { name: string; data: Uint8Array }[] = [
    { name: '[Content_Types].xml', data: enc.encode(contentTypes) },
    { name: '_rels/.rels', data: enc.encode(rels) },
    { name: 'xl/workbook.xml', data: enc.encode(workbook) },
    { name: 'xl/_rels/workbook.xml.rels', data: enc.encode(wbRels) },
    { name: 'xl/worksheets/sheet1.xml', data: enc.encode(sheet) },
  ];

  const zip = buildZip(files);
  downloadFile(zip, `${filename}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

// Minimal store-only ZIP builder (no compression, works in all browsers)
function buildZip(files: { name: string; data: Uint8Array }[]): Blob {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const centralDir: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = enc.encode(file.name);
    // Local file header
    const header = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true); // signature
    view.setUint16(4, 20, true); // version needed
    view.setUint16(6, 0, true); // flags
    view.setUint16(8, 0, true); // compression: store
    view.setUint16(10, 0, true); // mod time
    view.setUint16(12, 0, true); // mod date
    view.setUint32(14, crc32(file.data), true);
    view.setUint32(18, file.data.length, true); // compressed
    view.setUint32(22, file.data.length, true); // uncompressed
    view.setUint16(26, nameBytes.length, true);
    header.set(nameBytes, 30);

    // Central directory entry
    const cdEntry = new Uint8Array(46 + nameBytes.length);
    const cdView = new DataView(cdEntry.buffer);
    cdView.setUint32(0, 0x02014b50, true);
    cdView.setUint16(4, 20, true);
    cdView.setUint16(6, 20, true);
    cdView.setUint16(8, 0, true);
    cdView.setUint16(10, 0, true);
    cdView.setUint16(12, 0, true);
    cdView.setUint16(14, 0, true);
    cdView.setUint32(16, crc32(file.data), true);
    cdView.setUint32(20, file.data.length, true);
    cdView.setUint32(24, file.data.length, true);
    cdView.setUint16(28, nameBytes.length, true);
    cdView.setUint32(42, offset, true); // local header offset
    cdEntry.set(nameBytes, 46);
    centralDir.push(cdEntry);

    parts.push(header, file.data);
    offset += header.length + file.data.length;
  }

  const cdOffset = offset;
  let cdSize = 0;
  for (const entry of centralDir) {
    parts.push(entry);
    cdSize += entry.length;
  }

  // End of central directory
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(8, files.length, true);
  eocdView.setUint16(10, files.length, true);
  eocdView.setUint32(12, cdSize, true);
  eocdView.setUint32(16, cdOffset, true);
  parts.push(eocd);

  return new Blob(parts, { type: 'application/zip' });
}

// CRC-32 table
const crcTable: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) crc = crcTable[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function downloadFile(content: string | Blob, filename: string, mimeType: string): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
