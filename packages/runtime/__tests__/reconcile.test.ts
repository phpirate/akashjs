import { describe, it, expect } from 'vitest';
import {
  longestIncreasingSubsequence,
  reconcileKeys,
  countOps,
} from '../src/reconcile.js';

describe('longestIncreasingSubsequence', () => {
  it('[0,1,2,3] returns [0,1,2,3]', () => {
    const result = longestIncreasingSubsequence([0, 1, 2, 3]);
    expect(result).toEqual([0, 1, 2, 3]);
  });

  it('[3,1,2,4] returns indices of 1,2,4', () => {
    const result = longestIncreasingSubsequence([3, 1, 2, 4]);
    // LIS values are 1,2,4 at indices 1,2,3
    expect(result).toEqual([1, 2, 3]);
  });

  it('empty returns empty', () => {
    expect(longestIncreasingSubsequence([])).toEqual([]);
  });
});

describe('reconcileKeys', () => {
  it('with identical lists returns no ops', () => {
    const ops = reconcileKeys(['a', 'b', 'c'], ['a', 'b', 'c']);
    expect(ops).toEqual([]);
  });

  it('with appended items returns inserts', () => {
    const ops = reconcileKeys(['a', 'b'], ['a', 'b', 'c', 'd']);
    const inserts = ops.filter((o) => o.type === 'insert');
    expect(inserts).toHaveLength(2);
    expect(ops.filter((o) => o.type === 'remove')).toHaveLength(0);
  });

  it('with removed items returns removes', () => {
    const ops = reconcileKeys(['a', 'b', 'c'], ['a']);
    const removes = ops.filter((o) => o.type === 'remove');
    expect(removes).toHaveLength(2);
  });

  it('with reordered items returns moves', () => {
    const ops = reconcileKeys(['a', 'b', 'c'], ['c', 'a', 'b']);
    const moves = ops.filter((o) => o.type === 'move');
    expect(moves.length).toBeGreaterThan(0);
    expect(ops.filter((o) => o.type === 'remove')).toHaveLength(0);
    expect(ops.filter((o) => o.type === 'insert')).toHaveLength(0);
  });

  it('with swapped items uses LIS to minimize moves', () => {
    // Swap first and last in a list of 5
    const ops = reconcileKeys(
      ['a', 'b', 'c', 'd', 'e'],
      ['e', 'b', 'c', 'd', 'a'],
    );
    const moves = ops.filter((o) => o.type === 'move');
    // LIS keeps b,c,d in place; only a and e need moves
    expect(moves.length).toBeLessThanOrEqual(2);
    expect(ops.filter((o) => o.type === 'remove')).toHaveLength(0);
    expect(ops.filter((o) => o.type === 'insert')).toHaveLength(0);
  });
});

describe('countOps', () => {
  it('returns correct counts', () => {
    const result = countOps(['a', 'b', 'c'], ['b', 'c', 'd']);
    expect(result.removes).toBe(1); // 'a' removed
    expect(result.inserts).toBe(1); // 'd' inserted
    expect(result.moves).toBe(0); // b,c stay in order
  });
});
