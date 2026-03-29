/** @vitest-environment happy-dom */
import { describe, it, expect } from 'vitest';
import { Image } from '../src/image.js';

describe('Image', () => {
  it('has _akash set to true', () => {
    expect(Image._akash).toBe(true);
  });
});
