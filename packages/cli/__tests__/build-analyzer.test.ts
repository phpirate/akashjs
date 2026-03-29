import { describe, it, expect } from 'vitest';
import { formatSize } from '../src/commands/build.js';

describe('formatSize', () => {
  it('formats bytes', () => {
    expect(formatSize(500)).toBe('500 B');
  });

  it('formats kilobytes', () => {
    expect(formatSize(1024)).toBe('1.0 KB');
    expect(formatSize(2560)).toBe('2.5 KB');
  });

  it('formats megabytes', () => {
    expect(formatSize(1048576)).toBe('1.00 MB');
    expect(formatSize(1572864)).toBe('1.50 MB');
  });

  it('handles zero', () => {
    expect(formatSize(0)).toBe('0 B');
  });
});
