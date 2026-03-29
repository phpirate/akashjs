/** @vitest-environment happy-dom */
import { describe, it, expect } from 'vitest';
import { createInspector } from '../src/inspector.js';

describe('createInspector', () => {
  it('returns active/inspected/toggle/enable/disable/dispose', () => {
    const inspector = createInspector();
    expect(inspector.active).toBeTypeOf('function');
    expect(inspector.inspected).toBeTypeOf('function');
    expect(inspector.toggle).toBeTypeOf('function');
    expect(inspector.enable).toBeTypeOf('function');
    expect(inspector.disable).toBeTypeOf('function');
    expect(inspector.dispose).toBeTypeOf('function');
    inspector.dispose();
  });

  it('active starts false', () => {
    const inspector = createInspector();
    expect(inspector.active()).toBe(false);
    inspector.dispose();
  });

  it('enable sets active to true', () => {
    const inspector = createInspector();
    inspector.enable();
    expect(inspector.active()).toBe(true);
    inspector.dispose();
  });

  it('disable sets active to false', () => {
    const inspector = createInspector();
    inspector.enable();
    inspector.disable();
    expect(inspector.active()).toBe(false);
    inspector.dispose();
  });

  it('toggle flips active', () => {
    const inspector = createInspector();
    expect(inspector.active()).toBe(false);
    inspector.toggle();
    expect(inspector.active()).toBe(true);
    inspector.toggle();
    expect(inspector.active()).toBe(false);
    inspector.dispose();
  });
});
