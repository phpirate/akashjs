/** @vitest-environment happy-dom */
import { describe, it, expect } from 'vitest';
import { calculateRange, VirtualFor } from '../src/virtual-list.js';

describe('calculateRange', () => {
  it('returns correct start/end for scrollTop=0', () => {
    const range = calculateRange(0, 400, 40, 100, 0);
    expect(range.start).toBe(0);
    expect(range.end).toBe(10); // 400/40 = 10 visible
  });

  it('handles scroll offset', () => {
    // scrollTop=200 => firstVisible = 5, visibleCount = 10
    const range = calculateRange(200, 400, 40, 100, 0);
    expect(range.start).toBe(5);
    expect(range.end).toBe(15);
  });

  it('applies overscan', () => {
    const range = calculateRange(200, 400, 40, 100, 3);
    expect(range.start).toBe(2); // max(0, 5-3)
    expect(range.end).toBe(18); // min(100, 5+10+3)
  });

  it('clamps to bounds', () => {
    // Near the end: scrollTop would put end past totalItems
    const range = calculateRange(3800, 400, 40, 100, 3);
    expect(range.start).toBeGreaterThanOrEqual(0);
    expect(range.end).toBeLessThanOrEqual(100);
  });

  it('returns correct totalHeight', () => {
    const range = calculateRange(0, 400, 40, 100, 3);
    expect(range.totalHeight).toBe(4000); // 100 * 40
  });
});

describe('VirtualFor', () => {
  it('is a valid component (_akash true)', () => {
    expect((VirtualFor as any)._akash).toBe(true);
  });
});
