import { describe, it, expect } from 'vitest';
import { formatBytes, checkBudgets } from '../src/commands/size.js';
import type { SizeEntry, SizeBudget } from '../src/commands/size.js';

describe('formatBytes', () => {
  it('formats bytes', () => {
    expect(formatBytes(512)).toBe('512 B');
  });

  it('formats KB', () => {
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });
});

describe('checkBudgets', () => {
  const entries: SizeEntry[] = [
    { name: '@akashjs/runtime', raw: 20000, gzip: 6000 },
    { name: '@akashjs/router', raw: 10000, gzip: 5000 },
  ];

  const budgets: SizeBudget[] = [
    { name: '@akashjs/runtime', maxGzip: 8192 },
    { name: '@akashjs/router', maxGzip: 4096 },
  ];

  it('returns empty when within budget', () => {
    const withinBudget: SizeEntry[] = [
      { name: '@akashjs/runtime', raw: 20000, gzip: 6000 },
    ];
    const result = checkBudgets(withinBudget, budgets);
    expect(result).toEqual([]);
  });

  it('returns violations when over budget', () => {
    const violations = checkBudgets(entries, budgets);
    expect(violations).toHaveLength(1);
    expect(violations[0].name).toBe('@akashjs/router');
    expect(violations[0].actual).toBe(5000);
    expect(violations[0].budget).toBe(4096);
  });

  it('calculates overBy percentage', () => {
    const violations = checkBudgets(entries, budgets);
    const routerViolation = violations.find((v) => v.name === '@akashjs/router');
    expect(routerViolation).toBeDefined();
    // (5000 - 4096) / 4096 * 100 = ~22%
    expect(routerViolation!.overBy).toBe(Math.round(((5000 - 4096) / 4096) * 100));
  });
});
