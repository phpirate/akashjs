import { describe, it, expect } from 'vitest';
import { createDataTable } from '../src/data-table.js';
import { signal } from '../src/signals.js';

const sampleData = [
  { name: 'Alice', email: 'alice@test.com', age: 30 },
  { name: 'Bob', email: 'bob@test.com', age: 25 },
  { name: 'Charlie', email: 'charlie@test.com', age: 35 },
  { name: 'Diana', email: 'diana@test.com', age: 28 },
  { name: 'Eve', email: 'eve@test.com', age: 22 },
];

const columns = [
  { key: 'name', header: 'Name', sortable: true, filterable: true },
  { key: 'email', header: 'Email', sortable: true, filterable: true },
  { key: 'age', header: 'Age', sortable: true },
];

describe('createDataTable', () => {
  it('returns rows/sort/filter/page functions', () => {
    const table = createDataTable({ data: () => sampleData, columns });

    expect(typeof table.rows).toBe('function');
    expect(typeof table.sort).toBe('function');
    expect(typeof table.filter).toBe('function');
    expect(typeof table.nextPage).toBe('function');
    expect(typeof table.prevPage).toBe('function');
    expect(typeof table.goToPage).toBe('function');
  });

  it('rows returns all data when no filter or pagination', () => {
    const table = createDataTable({ data: () => sampleData, columns });
    expect(table.rows()).toHaveLength(5);
  });

  it('sort toggles asc/desc/none', () => {
    const table = createDataTable({ data: () => sampleData, columns });

    table.sort('name');
    expect(table.sortState().direction).toBe('asc');
    expect(table.rows()[0].name).toBe('Alice');

    table.sort('name');
    expect(table.sortState().direction).toBe('desc');
    expect(table.rows()[0].name).toBe('Eve');

    table.sort('name');
    expect(table.sortState().direction).toBeNull();
  });

  it('filter filters by filterable columns', () => {
    const table = createDataTable({ data: () => sampleData, columns });

    table.filter('alice');
    expect(table.rows()).toHaveLength(1);
    expect(table.rows()[0].name).toBe('Alice');

    table.filter('test.com');
    expect(table.rows()).toHaveLength(5);
  });

  it('pagination: nextPage/prevPage/goToPage work, totalPages computed', () => {
    const table = createDataTable({ data: () => sampleData, columns, pageSize: 2 });

    expect(table.totalPages()).toBe(3);
    expect(table.page()).toBe(1);
    expect(table.rows()).toHaveLength(2);

    table.nextPage();
    expect(table.page()).toBe(2);
    expect(table.rows()).toHaveLength(2);

    table.nextPage();
    expect(table.page()).toBe(3);
    expect(table.rows()).toHaveLength(1);

    table.prevPage();
    expect(table.page()).toBe(2);

    table.goToPage(1);
    expect(table.page()).toBe(1);
  });

  it('toggleColumn hides/shows columns', () => {
    const table = createDataTable({ data: () => sampleData, columns });

    expect(table.visibleColumns()).toHaveLength(3);

    table.toggleColumn('age');
    expect(table.visibleColumns()).toHaveLength(2);
    expect(table.visibleColumns().find((c) => c.key === 'age')).toBeUndefined();

    table.toggleColumn('age');
    expect(table.visibleColumns()).toHaveLength(3);
  });

  it('reset clears sort/filter/page', () => {
    const table = createDataTable({ data: () => sampleData, columns, pageSize: 2 });

    table.sort('name');
    table.filter('alice');
    table.goToPage(2);

    table.reset();

    expect(table.sortState().column).toBeNull();
    expect(table.sortState().direction).toBeNull();
    expect(table.filterText()).toBe('');
    expect(table.page()).toBe(1);
  });
});
