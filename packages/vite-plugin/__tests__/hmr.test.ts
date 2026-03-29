import { describe, it, expect } from 'vitest';
import { analyzeHmrChange, generateHmrCode, generateStyleHmrCode } from '../src/hmr.js';

const baseSfc = `
<script lang="ts">
const count = signal(0);
</script>

<template>
  <div>{count()}</div>
</template>

<style scoped>
div { color: red; }
</style>
`;

describe('analyzeHmrChange', () => {
  it('detects no changes for identical source', () => {
    const result = analyzeHmrChange(baseSfc, baseSfc);
    expect(result.scriptChanged).toBe(false);
    expect(result.templateChanged).toBe(false);
    expect(result.styleChanged).toBe(false);
    expect(result.styleOnly).toBe(false);
    expect(result.needsFullReload).toBe(false);
  });

  it('detects script changes', () => {
    const newSfc = baseSfc.replace('signal(0)', 'signal(1)');
    const result = analyzeHmrChange(baseSfc, newSfc);
    expect(result.scriptChanged).toBe(true);
    expect(result.needsFullReload).toBe(true);
    expect(result.styleOnly).toBe(false);
  });

  it('detects template changes', () => {
    const newSfc = baseSfc.replace('{count()}', '{count()} items');
    const result = analyzeHmrChange(baseSfc, newSfc);
    expect(result.templateChanged).toBe(true);
    expect(result.scriptChanged).toBe(false);
  });

  it('detects style-only changes', () => {
    const newSfc = baseSfc.replace('color: red', 'color: blue');
    const result = analyzeHmrChange(baseSfc, newSfc);
    expect(result.styleChanged).toBe(true);
    expect(result.scriptChanged).toBe(false);
    expect(result.templateChanged).toBe(false);
    expect(result.styleOnly).toBe(true);
    expect(result.needsFullReload).toBe(false);
  });

  it('detects multiple changes', () => {
    const newSfc = baseSfc
      .replace('signal(0)', 'signal(1)')
      .replace('color: red', 'color: blue');
    const result = analyzeHmrChange(baseSfc, newSfc);
    expect(result.scriptChanged).toBe(true);
    expect(result.styleChanged).toBe(true);
    expect(result.styleOnly).toBe(false);
    expect(result.needsFullReload).toBe(true);
  });
});

describe('generateHmrCode', () => {
  it('generates import.meta.hot code', () => {
    const code = generateHmrCode('test.akash');
    expect(code).toContain('import.meta.hot');
    expect(code).toContain('accept');
  });
});

describe('generateStyleHmrCode', () => {
  it('generates HMR accept call for style updates', () => {
    const code = generateStyleHmrCode('my-style-id');
    expect(code).toContain('import.meta.hot');
    expect(code).toContain('accept()');
  });
});
