import { describe, it, expect } from 'vitest';
import {
  buildData,
  createState,
  create1000,
  updateEvery10th,
  swapRows,
  removeRow,
  clear,
  selectRow,
  measure,
} from '../index.js';

describe('buildData', () => {
  it('creates N rows with unique ids and labels', () => {
    const rows = buildData(5);
    expect(rows).toHaveLength(5);

    const ids = rows.map((r) => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(5);

    for (const row of rows) {
      expect(typeof row.id).toBe('number');
      expect(typeof row.label).toBe('string');
      expect(row.label.length).toBeGreaterThan(0);
    }
  });
});

describe('createState', () => {
  it('returns empty state', () => {
    const state = createState();
    expect(state.rows).toEqual([]);
    expect(state.selected).toBe(-1);
  });
});

describe('create1000', () => {
  it('produces 1000 rows', () => {
    const state = create1000(createState());
    expect(state.rows).toHaveLength(1000);
  });
});

describe('updateEvery10th', () => {
  it('modifies every 10th row label by appending " !!!"', () => {
    const state = create1000(createState());
    const original = state.rows.map((r) => r.label);
    const updated = updateEvery10th(state);

    for (let i = 0; i < updated.rows.length; i++) {
      if (i % 10 === 0) {
        expect(updated.rows[i].label).toBe(original[i] + ' !!!');
      } else {
        expect(updated.rows[i].label).toBe(original[i]);
      }
    }
  });
});

describe('swapRows', () => {
  it('swaps index 1 and 998', () => {
    const state = create1000(createState());
    const row1 = state.rows[1];
    const row998 = state.rows[998];

    const swapped = swapRows(state);
    expect(swapped.rows[1]).toEqual(row998);
    expect(swapped.rows[998]).toEqual(row1);
  });
});

describe('removeRow', () => {
  it('removes by id', () => {
    const state = create1000(createState());
    const targetId = state.rows[0].id;
    const result = removeRow(state, targetId);

    expect(result.rows).toHaveLength(999);
    expect(result.rows.find((r) => r.id === targetId)).toBeUndefined();
  });
});

describe('clear', () => {
  it('empties rows', () => {
    const state = create1000(createState());
    const cleared = clear(state);
    expect(cleared.rows).toEqual([]);
  });
});

describe('selectRow', () => {
  it('sets selected id', () => {
    const state = create1000(createState());
    const id = state.rows[5].id;
    const selected = selectRow(state, id);
    expect(selected.selected).toBe(id);
  });
});

describe('measure', () => {
  it('returns name and duration >= 0', () => {
    const result = measure('test-op', () => {
      let sum = 0;
      for (let i = 0; i < 100; i++) sum += i;
    });

    expect(result.name).toBe('test-op');
    expect(typeof result.duration).toBe('number');
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });
});
