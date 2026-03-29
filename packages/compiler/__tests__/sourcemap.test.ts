import { describe, it, expect } from 'vitest';
import { encodeVLQ, SourceMapBuilder, createAkashSourceMap } from '../src/sourcemap.js';

describe('encodeVLQ', () => {
  it('encodes zero', () => {
    expect(encodeVLQ(0)).toBe('A');
  });

  it('encodes positive numbers', () => {
    expect(encodeVLQ(1)).toBe('C');
    expect(encodeVLQ(5)).toBe('K');
  });

  it('encodes negative numbers', () => {
    expect(encodeVLQ(-1)).toBe('D');
  });

  it('encodes large numbers', () => {
    const result = encodeVLQ(100);
    expect(result.length).toBeGreaterThan(1);
  });
});

describe('SourceMapBuilder', () => {
  it('creates a valid V3 source map', () => {
    const builder = new SourceMapBuilder();
    builder.addSource('test.akash', '<script>const x = 1;</script>');
    builder.addMapping({
      generatedLine: 0,
      generatedColumn: 0,
      originalLine: 0,
      originalColumn: 0,
      source: 0,
    });

    const map = builder.build('test.js');
    expect(map.version).toBe(3);
    expect(map.file).toBe('test.js');
    expect(map.sources).toEqual(['test.akash']);
    expect(map.mappings).toBeTruthy();
  });

  it('includes sources content', () => {
    const builder = new SourceMapBuilder();
    const content = 'const x = 1;';
    builder.addSource('file.ts', content);

    const map = builder.build('file.js');
    expect(map.sourcesContent).toEqual([content]);
  });

  it('handles multiple sources', () => {
    const builder = new SourceMapBuilder();
    builder.addSource('a.ts', 'a');
    builder.addSource('b.ts', 'b');

    const map = builder.build('out.js');
    expect(map.sources).toEqual(['a.ts', 'b.ts']);
  });

  it('addLineRange maps lines 1:1', () => {
    const builder = new SourceMapBuilder();
    builder.addSource('test.akash');
    builder.addLineRange(2, 5, 3, 0); // gen lines 2-4 → orig lines 5-7

    const map = builder.build('test.js');
    // Should have 3 mappings, one per line
    const lineCount = map.mappings.split(';').length;
    expect(lineCount).toBeGreaterThanOrEqual(3);
  });

  it('toJSON returns valid JSON string', () => {
    const builder = new SourceMapBuilder();
    builder.addSource('test.akash');
    builder.addMapping({
      generatedLine: 0,
      generatedColumn: 0,
      originalLine: 0,
      originalColumn: 0,
    });

    const json = builder.toJSON('test.js');
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(3);
  });

  it('toDataUrl returns a data URL', () => {
    const builder = new SourceMapBuilder();
    builder.addSource('test.akash');

    const url = builder.toDataUrl('test.js');
    expect(url).toContain('data:application/json');
    expect(url).toContain('base64');
  });
});

describe('createAkashSourceMap', () => {
  it('creates a builder with source and line mappings', () => {
    const builder = createAkashSourceMap(
      'App.akash',
      '<script>const x = 1;</script>',
      2,   // script starts at line 2 in .akash
      5,   // script is 5 lines
      4,   // generated script starts at line 4 in .js
    );

    const map = builder.build('App.js');
    expect(map.sources).toEqual(['App.akash']);
    expect(map.sourcesContent).toHaveLength(1);
    expect(map.mappings).toBeTruthy();
  });
});
