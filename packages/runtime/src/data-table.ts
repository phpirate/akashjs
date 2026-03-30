/**
 * Headless data table.
 *
 * Signal-based table state management with sorting, filtering,
 * column visibility, and pagination integration. No DOM — just logic.
 *
 * ```ts
 * const table = createDataTable({
 *   data: () => users(),
 *   columns: [
 *     { key: 'name', header: 'Name', sortable: true },
 *     { key: 'email', header: 'Email', sortable: true, filterable: true },
 *     { key: 'age', header: 'Age', sortable: true },
 *   ],
 *   pageSize: 20,
 * });
 *
 * table.rows();           // current page of sorted/filtered data
 * table.sort('name');     // toggle sort by column
 * table.filter('search term');
 * table.toggleColumn('age');
 * table.nextPage();
 * ```
 */

import { signal, computed } from './signals.js';
import type { ReadonlySignal } from './signals.js';

// --- Types ---

export interface ColumnDef<T> {
  /** Key to access the data (dot notation supported) */
  key: string;
  /** Display header */
  header: string;
  /** Whether this column is sortable (default: false) */
  sortable?: boolean;
  /** Whether this column is searchable by the global filter (default: false) */
  filterable?: boolean;
  /** Custom sort comparator */
  compare?: (a: T, b: T) => number;
  /** Custom cell value accessor */
  accessor?: (row: T) => unknown;
  /** Whether column is visible by default (default: true) */
  visible?: boolean;
}

export type SortDirection = 'asc' | 'desc' | null;

export interface SortState {
  column: string | null;
  direction: SortDirection;
}

export interface DataTableOptions<T> {
  /** Reactive data source */
  data: () => T[];
  /** Column definitions */
  columns: ColumnDef<T>[];
  /** Page size (0 = no pagination) */
  pageSize?: number;
  /** Initial sort */
  initialSort?: SortState;
}

export interface DataTable<T> {
  /** Current page of processed (sorted + filtered) rows */
  rows: ReadonlySignal<T[]>;
  /** All processed rows (before pagination) */
  allRows: ReadonlySignal<T[]>;
  /** Total row count after filtering */
  totalRows: ReadonlySignal<number>;
  /** Visible columns */
  visibleColumns: ReadonlySignal<ColumnDef<T>[]>;
  /** Current sort state */
  sortState: ReadonlySignal<SortState>;
  /** Current filter text */
  filterText: ReadonlySignal<string>;
  /** Current page (1-based) */
  page: ReadonlySignal<number>;
  /** Total pages */
  totalPages: ReadonlySignal<number>;
  /** Toggle or set sort on a column */
  sort(columnKey: string): void;
  /** Set the global filter text */
  filter(text: string): void;
  /** Toggle column visibility */
  toggleColumn(columnKey: string): void;
  /** Show a column */
  showColumn(columnKey: string): void;
  /** Hide a column */
  hideColumn(columnKey: string): void;
  /** Go to next page */
  nextPage(): void;
  /** Go to previous page */
  prevPage(): void;
  /** Go to specific page */
  goToPage(page: number): void;
  /** Reset all state (sort, filter, page) */
  reset(): void;
}

// --- Implementation ---

export function createDataTable<T extends Record<string, unknown>>(
  options: DataTableOptions<T>,
): DataTable<T> {
  const { data, columns, pageSize = 0, initialSort } = options;

  const sortState = signal<SortState>(initialSort ?? { column: null, direction: null });
  const filterText = signal('');
  const page = signal(1);
  const columnVisibility = signal<Record<string, boolean>>(
    Object.fromEntries(columns.map((c) => [c.key, c.visible !== false])),
  );

  // Visible columns
  const visibleColumns = computed(() => {
    const vis = columnVisibility();
    return columns.filter((c) => vis[c.key]);
  });

  // Filtered rows
  const filteredRows = computed(() => {
    const text = filterText().toLowerCase().trim();
    if (!text) return data();

    // If no columns explicitly marked filterable, filter all columns
    const filterableCols = columns.filter((c) => c.filterable);
    const colsToSearch = filterableCols.length > 0 ? filterableCols : columns;

    return data().filter((row) => {
      return colsToSearch.some((col) => {
        const value = getNestedValue(row, col.key);
        return String(value).toLowerCase().includes(text);
      });
    });
  });

  // Sorted rows
  const sortedRows = computed(() => {
    const { column, direction } = sortState();
    const rows = [...filteredRows()];

    if (!column || !direction) return rows;

    const colDef = columns.find((c) => c.key === column);
    if (!colDef) return rows;

    return rows.sort((a, b) => {
      if (colDef.compare) {
        const result = colDef.compare(a, b);
        return direction === 'desc' ? -result : result;
      }

      const aVal = getNestedValue(a, column);
      const bVal = getNestedValue(b, column);
      const result = defaultCompare(aVal, bVal);
      return direction === 'desc' ? -result : result;
    });
  });

  // Total rows after filtering
  const totalRows = computed(() => filteredRows().length);

  // Total pages
  const totalPages = computed(() => {
    if (pageSize <= 0) return 1;
    return Math.max(1, Math.ceil(totalRows() / pageSize));
  });

  // Paginated rows
  const paginatedRows = computed(() => {
    const all = sortedRows();
    if (pageSize <= 0) return all;
    const start = (page() - 1) * pageSize;
    return all.slice(start, start + pageSize);
  });

  // --- Actions ---

  function sort(columnKey: string): void {
    const current = sortState();
    if (current.column === columnKey) {
      // Cycle: asc → desc → none
      if (current.direction === 'asc') {
        sortState.set({ column: columnKey, direction: 'desc' });
      } else if (current.direction === 'desc') {
        sortState.set({ column: null, direction: null });
      } else {
        sortState.set({ column: columnKey, direction: 'asc' });
      }
    } else {
      sortState.set({ column: columnKey, direction: 'asc' });
    }
    page.set(1);
  }

  function filter(text: string): void {
    filterText.set(text);
    page.set(1);
  }

  function toggleColumn(key: string): void {
    columnVisibility.update((vis) => ({ ...vis, [key]: !vis[key] }));
  }

  function showColumn(key: string): void {
    columnVisibility.update((vis) => ({ ...vis, [key]: true }));
  }

  function hideColumn(key: string): void {
    columnVisibility.update((vis) => ({ ...vis, [key]: false }));
  }

  return {
    rows: paginatedRows,
    allRows: sortedRows,
    totalRows,
    visibleColumns,
    sortState: () => sortState(),
    filterText: () => filterText(),
    page: () => page(),
    totalPages,
    sort,
    filter,
    toggleColumn,
    showColumn,
    hideColumn,
    nextPage() { if (page() < totalPages()) page.update((p) => p + 1); },
    prevPage() { if (page() > 1) page.update((p) => p - 1); },
    goToPage(p: number) { page.set(Math.max(1, Math.min(p, totalPages()))); },
    reset() {
      sortState.set({ column: null, direction: null });
      filterText.set('');
      page.set(1);
    },
  };
}

// --- Helpers ---

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((o: any, k) => o?.[k], obj);
}

function defaultCompare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}
