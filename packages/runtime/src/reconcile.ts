/**
 * List reconciliation with Longest Increasing Subsequence (LIS).
 *
 * When a keyed list updates, we need to determine the minimal set of
 * DOM operations (inserts, moves, removes). The LIS of the new key
 * positions tells us which nodes are already in the correct relative
 * order and don't need to move.
 *
 * This is the same algorithm used by Vue 3, Solid, and Inferno.
 */

/**
 * Find the Longest Increasing Subsequence of indices.
 * Returns the indices into the input array that form the LIS.
 *
 * Time: O(n log n), Space: O(n)
 */
export function longestIncreasingSubsequence(arr: number[]): number[] {
  const n = arr.length;
  if (n === 0) return [];

  // tails[i] = smallest tail value for increasing subsequence of length i+1
  const tails: number[] = [];
  // predecessors[i] = index of previous element in the LIS ending at i
  const predecessors: number[] = new Array(n).fill(-1);
  // indices[i] = index in arr of the tail for length i+1
  const indices: number[] = [];

  for (let i = 0; i < n; i++) {
    const value = arr[i];

    // Skip items not in the old list (marked as -1)
    if (value === -1) continue;

    // Binary search for the position to insert/replace
    let lo = 0;
    let hi = tails.length;

    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tails[mid] < value) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }

    tails[lo] = value;
    indices[lo] = i;

    if (lo > 0) {
      predecessors[i] = indices[lo - 1];
    }
  }

  // Reconstruct the LIS by following predecessors
  const result: number[] = new Array(tails.length);
  let k = indices[tails.length - 1];

  for (let i = tails.length - 1; i >= 0; i--) {
    result[i] = k;
    k = predecessors[k];
  }

  return result;
}

/**
 * Reconcile two keyed lists and return the minimal DOM operations.
 *
 * @param oldKeys - Keys of the current DOM list
 * @param newKeys - Keys of the new data list
 * @returns Operations to transform old into new
 */
export interface ReconcileOp {
  type: 'insert' | 'move' | 'remove';
  /** Index in the NEW array (for insert/move) */
  newIndex?: number;
  /** Index in the OLD array (for remove/move source) */
  oldIndex?: number;
}

export function reconcileKeys(
  oldKeys: unknown[],
  newKeys: unknown[],
): ReconcileOp[] {
  const ops: ReconcileOp[] = [];

  // Build old key → index map
  const oldKeyMap = new Map<unknown, number>();
  for (let i = 0; i < oldKeys.length; i++) {
    oldKeyMap.set(oldKeys[i], i);
  }

  // For each new key, find its position in old (or -1 if new)
  const newToOld: number[] = new Array(newKeys.length);
  for (let i = 0; i < newKeys.length; i++) {
    newToOld[i] = oldKeyMap.get(newKeys[i]) ?? -1;
  }

  // Find nodes that need to be removed (in old but not in new)
  const newKeySet = new Set(newKeys);
  for (let i = 0; i < oldKeys.length; i++) {
    if (!newKeySet.has(oldKeys[i])) {
      ops.push({ type: 'remove', oldIndex: i });
    }
  }

  // Find the LIS of old indices — these nodes stay in place
  const lis = new Set(longestIncreasingSubsequence(newToOld));

  // Nodes not in the LIS need to be moved or inserted
  for (let i = 0; i < newKeys.length; i++) {
    if (newToOld[i] === -1) {
      // New item — insert
      ops.push({ type: 'insert', newIndex: i });
    } else if (!lis.has(i)) {
      // Existing item not in LIS — move
      ops.push({ type: 'move', newIndex: i, oldIndex: newToOld[i] });
    }
    // Items in LIS stay in place — no op needed
  }

  return ops;
}

/**
 * Count the minimum number of DOM operations needed.
 */
export function countOps(oldKeys: unknown[], newKeys: unknown[]): {
  inserts: number;
  moves: number;
  removes: number;
} {
  const ops = reconcileKeys(oldKeys, newKeys);
  let inserts = 0, moves = 0, removes = 0;
  for (const op of ops) {
    if (op.type === 'insert') inserts++;
    else if (op.type === 'move') moves++;
    else removes++;
  }
  return { inserts, moves, removes };
}
