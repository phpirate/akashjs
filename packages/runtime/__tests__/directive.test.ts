/** @vitest-environment happy-dom */
import { describe, it, expect, vi } from 'vitest';
import {
  defineDirective,
  applyDirective,
  updateDirective,
  removeDirectives,
  directiveFromFn,
  vAutoFocus,
  vClickOutside,
} from '../src/directive.js';

describe('directive', () => {
  it('defineDirective returns directive with _type and hooks', () => {
    const d = defineDirective({ mounted() {} });
    expect(d._type).toBe('directive');
    expect(d.hooks).toBeDefined();
    expect(d.hooks.mounted).toBeTypeOf('function');
  });

  it('applyDirective calls mounted hook', () => {
    const mounted = vi.fn();
    const d = defineDirective({ mounted });
    const el = document.createElement('div');
    applyDirective(el, d, 'test');
    expect(mounted).toHaveBeenCalledOnce();
    expect(mounted).toHaveBeenCalledWith(el, expect.objectContaining({ value: 'test' }));
  });

  it('updateDirective calls updated hook with oldValue', () => {
    const updated = vi.fn();
    const d = defineDirective({ updated });
    const el = document.createElement('div');
    applyDirective(el, d, 'first');
    updateDirective(el, d, 'second');
    expect(updated).toHaveBeenCalledOnce();
    expect(updated).toHaveBeenCalledWith(
      el,
      expect.objectContaining({ value: 'second', oldValue: 'first' }),
    );
  });

  it('removeDirectives calls unmounted hook', () => {
    const unmounted = vi.fn();
    const d = defineDirective({ unmounted });
    const el = document.createElement('div');
    applyDirective(el, d);
    removeDirectives(el);
    expect(unmounted).toHaveBeenCalledOnce();
  });

  it('directiveFromFn creates directive from function', () => {
    const fn = vi.fn();
    const d = directiveFromFn(fn);
    expect(d._type).toBe('directive');
    const el = document.createElement('div');
    applyDirective(el, d, 'val');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('vAutoFocus is a valid directive', () => {
    expect(vAutoFocus._type).toBe('directive');
    expect(vAutoFocus.hooks.mounted).toBeTypeOf('function');
  });

  it('vClickOutside is a valid directive', () => {
    expect(vClickOutside._type).toBe('directive');
    expect(vClickOutside.hooks.mounted).toBeTypeOf('function');
  });
});
