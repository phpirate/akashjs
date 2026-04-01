# DataTable

A full-featured Material Design 3 data table with sorting, filtering, pagination, selection, column resizing/reordering, inline editing, row grouping, tree rows, virtual scroll, keyboard navigation, and CSV/Excel export.

## Import

```ts
import { DataTable } from '@akashjs/ui';
import type { DataTableColumnDef, DataTableProps } from '@akashjs/ui';
```

## Basic Usage

```ts
DataTable({
  columns: [
    { key: 'name', header: 'Name', sortable: true, filterable: true },
    { key: 'email', header: 'Email', sortable: true },
    { key: 'role', header: 'Role', width: '120px' },
  ],
  data: () => users(),
  rowKey: 'id',
})
```

## Sorting

Click a column header to sort. Shift+click for multi-sort (numbered indicators show sort priority).

```ts
DataTable({
  columns: [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'age', header: 'Age', sortable: true, align: 'right' },
  ],
  data: () => users(),
  initialSort: { column: 'name', direction: 'asc' },
  onSortChange: (sorts) => console.log(sorts),
})
```

## Filtering

### Global Filter

```ts
DataTable({
  columns: [...],
  data: () => users(),
  filterable: true,
  filterPlaceholder: 'Search users...',
  onFilterChange: (text) => console.log(text),
})
```

### Per-Column Filters

```ts
DataTable({
  columns: [
    { key: 'name', header: 'Name', columnFilter: true },
    { key: 'status', header: 'Status', columnFilter: true, columnFilterType: 'select',
      columnFilterOptions: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
      ],
    },
  ],
  data: () => users(),
})
```

## Pagination

```ts
DataTable({
  columns: [...],
  data: () => users(),
  pageSize: 25,
})
```

## Row Selection

Checkbox column with select-all. Shift+click for range selection.

```ts
DataTable({
  columns: [...],
  data: () => users(),
  selectable: true,
  onSelectionChange: (selected) => console.log(selected),
})
```

## Column Resizing

Drag column borders to resize.

```ts
DataTable({
  columns: [
    { key: 'name', header: 'Name', minWidth: '100px' },
    { key: 'email', header: 'Email' },
  ],
  data: () => users(),
  resizable: true,
})
```

## Column Reordering

Drag headers to rearrange columns.

```ts
DataTable({
  columns: [...],
  data: () => users(),
  reorderable: true,
  onColumnReorder: (keys) => saveColumnOrder(keys),
})
```

## Custom Cell Rendering

```ts
DataTable({
  columns: [
    { key: 'name', header: 'Name' },
    { key: 'status', header: 'Status' },
    { key: 'actions', header: '' },
  ],
  data: () => users(),
  renderCell: {
    status: (val) => Chip({ label: val, color: val === 'active' ? 'primary' : 'accent' }),
    actions: (_, row) => Button({ label: 'Edit', onClick: () => edit(row) }),
  },
})
```

## Inline Editing

Double-click a cell to edit. Enter to commit, Escape to cancel.

```ts
DataTable({
  columns: [
    { key: 'name', header: 'Name', editable: true },
    { key: 'email', header: 'Email', editable: true },
  ],
  data: () => users(),
  onCellEdit: (row, colKey, newValue) => updateUser(row.id, colKey, newValue),
})
```

## Row Expand / Detail Row

```ts
DataTable({
  columns: [...],
  data: () => orders(),
  renderExpandedRow: (order) => {
    const div = document.createElement('div');
    div.textContent = `Details: ${order.description}`;
    return div;
  },
})
```

## Row Grouping

```ts
DataTable({
  columns: [...],
  data: () => tasks(),
  groupBy: 'status',
  renderGroupHeader: (value, rows) => {
    const span = document.createElement('span');
    span.textContent = `${value} (${rows.length} items)`;
    return span;
  },
})
```

## Tree / Hierarchical Rows

```ts
DataTable({
  columns: [...],
  data: () => fileTree(),
  childrenKey: 'children',
  defaultExpandedTreeKeys: ['root'],
})
```

## Row Context Menu

```ts
DataTable({
  columns: [...],
  data: () => users(),
  contextMenu: (row) => [
    { label: 'Edit', icon: 'edit', onClick: () => edit(row) },
    { label: 'Delete', icon: 'delete', onClick: () => remove(row) },
  ],
})
```

## Row Drag Reorder

```ts
DataTable({
  columns: [...],
  data: () => items(),
  rowDraggable: true,
  onRowReorder: (from, to) => reorder(from, to),
})
```

## Export

```ts
DataTable({
  columns: [...],
  data: () => users(),
  exportable: true,        // CSV button
  exportExcel: true,        // Excel (XLSX) button
  exportFilename: 'users',
})
```

## Virtual Scroll

For large datasets. Requires `maxHeight`.

```ts
DataTable({
  columns: [...],
  data: () => bigDataset(),
  virtualScroll: true,
  maxHeight: '500px',
  virtualRowHeight: 48,
  virtualOverscan: 5,
})
```

## Responsive Card Layout

Below the breakpoint, the table stacks into a card layout.

```ts
DataTable({
  columns: [...],
  data: () => users(),
  responsiveBreakpoint: 600,
})
```

## Keyboard Navigation

Enabled by default (`keyboardNav: true`).

| Key | Action |
|-----|--------|
| Arrow keys | Navigate cells |
| Enter | Edit cell / click row |
| Escape | Cancel edit |
| Space | Toggle row selection |
| Home / End | Jump to first/last cell |

## Footer Summary Row

```ts
DataTable({
  columns: [
    { key: 'name', header: 'Name' },
    { key: 'amount', header: 'Amount', align: 'right' },
  ],
  data: () => transactions(),
  renderFooter: {
    name: () => 'Total',
    amount: (rows) => `$${rows.reduce((s, r) => s + r.amount, 0).toFixed(2)}`,
  },
})
```

## Column Pinning

```ts
DataTable({
  columns: [
    { key: 'name', header: 'Name', pin: 'left' },
    { key: 'col1', header: 'Col 1' },
    { key: 'col2', header: 'Col 2' },
    { key: 'actions', header: '', pin: 'right' },
  ],
  data: () => data(),
})
```

## DataTableColumnDef

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `key` | `string` | **(required)** | Data field key (dot notation supported) |
| `header` | `string` | **(required)** | Column header text |
| `sortable` | `boolean` | `false` | Enable sorting |
| `filterable` | `boolean` | `false` | Included in global filter |
| `columnFilter` | `boolean` | `false` | Show per-column filter input |
| `columnFilterType` | `'text' \| 'select'` | `'text'` | Filter input type |
| `editable` | `boolean` | `false` | Enable inline editing |
| `width` | `string` | `'auto'` | Column width |
| `minWidth` | `string` | `'50px'` | Minimum width when resizing |
| `align` | `'left' \| 'center' \| 'right'` | `'left'` | Text alignment |
| `pin` | `'left' \| 'right'` | -- | Pin column |
| `resizable` | `boolean` | follows table prop | Per-column resize override |

## DataTableProps

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | `DataTableColumnDef[]` | **(required)** | Column definitions |
| `data` | `(() => T[]) \| T[]` | **(required)** | Data source |
| `rowKey` | `string` | `'id'` | Unique row key field |
| `pageSize` | `number` | `0` (no pagination) | Rows per page |
| `selectable` | `boolean` | `false` | Show selection checkboxes |
| `resizable` | `boolean` | `false` | Enable column resizing |
| `reorderable` | `boolean` | `false` | Enable column reordering |
| `striped` | `boolean` | `false` | Zebra striping |
| `stickyHeader` | `boolean` | `true` | Sticky header row |
| `loading` | `boolean` | `false` | Show loading overlay |
| `emptyMessage` | `string` | `'No data'` | Empty state text |
| `filterable` | `boolean` | `false` | Show global filter |
| `exportable` | `boolean` | `false` | Show CSV export |
| `exportExcel` | `boolean` | `false` | Show Excel export |
| `virtualScroll` | `boolean` | `false` | Virtual scrolling |
| `maxHeight` | `string` | -- | Scroll container max height |
| `keyboardNav` | `boolean` | `true` | Arrow key navigation |
| `responsiveBreakpoint` | `number` | `0` | Card layout breakpoint (px) |
| `rowDraggable` | `boolean` | `false` | Row drag reorder |
| `groupBy` | `string` | -- | Group by column key |
| `childrenKey` | `string` | -- | Tree children field |
