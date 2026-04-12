import { describe, it, expect } from 'vitest';
import {
  pipe,
  chain,
  definePipe,
  uppercase,
  lowercase,
  capitalize,
  titleCase,
  trim,
  truncate,
  currency,
  number,
  percent,
  json,
  plural,
} from '../src/pipes.js';

describe('pipes', () => {
  it('pipe applies transform', () => {
    expect(pipe('hello', uppercase)).toBe('HELLO');
  });

  it('pipe chains multiple transforms', () => {
    expect(pipe(5, (x: number) => x * 2, (x: number) => x + 1)).toBe(11);
    expect(pipe('  hello  ', trim, uppercase)).toBe('HELLO');
  });

  it('uppercase works correctly', () => {
    expect(pipe('hello', uppercase)).toBe('HELLO');
  });

  it('lowercase works correctly', () => {
    expect(pipe('HELLO', lowercase)).toBe('hello');
  });

  it('capitalize works correctly', () => {
    expect(pipe('hello', capitalize)).toBe('Hello');
  });

  it('titleCase works correctly', () => {
    expect(pipe('hello world', titleCase)).toBe('Hello World');
  });

  it('trim works correctly', () => {
    expect(pipe('  hello  ', trim)).toBe('hello');
  });

  it('truncate truncates with ellipsis', () => {
    const result = pipe('Hello World', truncate, 8);
    expect(result.length).toBeLessThanOrEqual(8);
  });

  it('currency formats with $ and comma grouping', () => {
    const result = pipe(1234.5, currency);
    expect(result).toContain('$');
    expect(result).toContain('1,234');
  });

  it('number formats with locale', () => {
    const result = pipe(1234567, number);
    expect(result).toContain(',');
  });

  it('percent formats correctly', () => {
    const result = pipe(0.85, percent);
    expect(result).toContain('85%');
  });

  it('json stringifies', () => {
    const result = pipe({ a: 1 }, json);
    expect(result).toContain('"a"');
  });

  it('plural: singular', () => {
    expect(pipe(1, plural, 'item')).toBe('1 item');
  });

  it('plural: plural', () => {
    expect(pipe(5, plural, 'item')).toBe('5 items');
  });

  it('chain composes pipes', () => {
    const format = chain(trim, uppercase);
    expect(format('  hello  ')).toBe('HELLO');
  });

  it('definePipe creates custom pipe', () => {
    const reverse = definePipe<string, string>((value) =>
      value.split('').reverse().join(''),
    );
    expect(pipe('hello', reverse)).toBe('olleh');
  });
});
