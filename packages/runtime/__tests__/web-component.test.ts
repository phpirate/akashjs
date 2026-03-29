/** @vitest-environment happy-dom */
import { describe, it, expect } from 'vitest';
import { defineCustomElement, toCustomElement } from '../src/web-component.js';

describe('web-component', () => {
  it('toCustomElement returns a class', () => {
    const MyEl = toCustomElement(() => document.createElement('div'));
    expect(typeof MyEl).toBe('function');
    expect(MyEl.prototype).toBeDefined();
  });

  it('defineCustomElement and toCustomElement exist and are functions', () => {
    expect(typeof defineCustomElement).toBe('function');
    expect(typeof toCustomElement).toBe('function');
  });
});
