import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  deprecated,
  setDeprecationWarnings,
  resetDeprecationWarnings,
  setWarningHandler,
  registerAPI,
  getRegisteredAPIs,
  getAPIsByStability,
  isDeprecated,
  checkCompatibility,
} from '../src/deprecation.js';

beforeEach(() => {
  resetDeprecationWarnings();
  setDeprecationWarnings(true);
  setWarningHandler(null);
});

describe('deprecated()', () => {
  it('wraps a function and still returns the same result', () => {
    const add = (a: number, b: number) => a + b;
    const oldAdd = deprecated(add, {
      name: 'oldAdd',
      since: '0.1.0',
    });

    expect(oldAdd(2, 3)).toBe(5);
  });

  it('emits console.warn on first call', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fn = deprecated(() => 42, {
      name: 'legacyFn',
      since: '0.1.0',
      removeIn: '1.0.0',
    });

    fn();

    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain('legacyFn');
    spy.mockRestore();
  });

  it('only warns once per API', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fn = deprecated(() => 'ok', {
      name: 'onceOnly',
      since: '0.1.0',
    });

    fn();
    fn();

    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});

describe('setDeprecationWarnings()', () => {
  it('suppresses warnings when set to false', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    setDeprecationWarnings(false);

    const fn = deprecated(() => 'ok', {
      name: 'suppressedFn',
      since: '0.1.0',
    });

    fn();

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('resetDeprecationWarnings()', () => {
  it('allows warning again after reset', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fn = deprecated(() => 'ok', {
      name: 'resetFn',
      since: '0.1.0',
    });

    fn();
    expect(spy).toHaveBeenCalledTimes(1);

    resetDeprecationWarnings();
    fn();
    expect(spy).toHaveBeenCalledTimes(2);

    spy.mockRestore();
  });
});

describe('setWarningHandler()', () => {
  it('redirects warnings to a custom function', () => {
    const handler = vi.fn();
    setWarningHandler(handler);

    const fn = deprecated(() => 'ok', {
      name: 'customHandlerFn',
      since: '0.2.0',
    });

    fn();

    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0][0]).toContain('customHandlerFn');
  });
});

describe('API registry', () => {
  it('registerAPI and getRegisteredAPIs work', () => {
    registerAPI({ name: 'signal', stability: 'stable', since: '0.1.0' });
    registerAPI({ name: 'oldSignal', stability: 'deprecated', since: '0.1.0' });

    const apis = getRegisteredAPIs();
    const names = apis.map((a) => a.name);
    expect(names).toContain('signal');
    expect(names).toContain('oldSignal');
  });

  it('getAPIsByStability filters correctly', () => {
    registerAPI({ name: 'stableApi', stability: 'stable', since: '0.1.0' });
    registerAPI({ name: 'expApi', stability: 'experimental', since: '0.1.0' });
    registerAPI({ name: 'depApi', stability: 'deprecated', since: '0.1.0' });

    const stableAPIs = getAPIsByStability('stable');
    expect(stableAPIs.some((a) => a.name === 'stableApi')).toBe(true);
    expect(stableAPIs.some((a) => a.name === 'depApi')).toBe(false);

    const deprecatedAPIs = getAPIsByStability('deprecated');
    expect(deprecatedAPIs.some((a) => a.name === 'depApi')).toBe(true);
  });

  it('isDeprecated returns true for deprecated APIs', () => {
    registerAPI({ name: 'oldThing', stability: 'deprecated', since: '0.1.0' });
    registerAPI({ name: 'newThing', stability: 'stable', since: '0.1.0' });

    expect(isDeprecated('oldThing')).toBe(true);
    expect(isDeprecated('newThing')).toBe(false);
  });
});

describe('checkCompatibility()', () => {
  it('returns compatible for matching versions', () => {
    const result = checkCompatibility({
      '@akashjs/runtime': '0.2.0',
      '@akashjs/router': '0.2.0',
    });

    expect(result.compatible).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns error for major version mismatch', () => {
    const result = checkCompatibility({
      '@akashjs/runtime': '1.0.0',
      '@akashjs/router': '2.0.0',
    });

    expect(result.compatible).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('Major version mismatch');
  });
});
