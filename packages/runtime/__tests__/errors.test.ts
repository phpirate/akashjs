import { describe, it, expect } from 'vitest';
import {
  formatError,
  akashError,
  getErrorDef,
  getAllErrorCodes,
} from '../src/errors.js';

describe('formatError', () => {
  it('formats an error with code and message', () => {
    const msg = formatError('AK0010');
    expect(msg).toContain('[AkashJS AK0010]');
    expect(msg).toContain('provide() called outside of component setup');
  });

  it('includes the hint', () => {
    const msg = formatError('AK0010');
    expect(msg).toContain('must be called inside defineComponent()');
  });

  it('includes a doc link', () => {
    const msg = formatError('AK0010');
    expect(msg).toContain('https://akashjs.dev/errors/AK0010');
  });

  it('includes optional context', () => {
    const msg = formatError('AK0012', 'inject(AuthContext) was called in useAuth()');
    expect(msg).toContain('inject(AuthContext) was called in useAuth()');
  });

  it('handles unknown error codes', () => {
    const msg = formatError('AK9999');
    expect(msg).toContain('Unknown error code');
  });
});

describe('akashError', () => {
  it('returns an Error instance', () => {
    const err = akashError('AK0020');
    expect(err).toBeInstanceOf(Error);
  });

  it('includes the formatted message', () => {
    const err = akashError('AK0020');
    expect(err.message).toContain('[AkashJS AK0020]');
    expect(err.message).toContain('onMount()');
  });

  it('includes context when provided', () => {
    const err = akashError('AK0013', 'inject(ThemeContext)');
    expect(err.message).toContain('inject(ThemeContext)');
  });
});

describe('getErrorDef', () => {
  it('returns definition for known code', () => {
    const def = getErrorDef('AK0010');
    expect(def).toBeDefined();
    expect(def!.code).toBe('AK0010');
    expect(def!.message).toBe('provide() called outside of component setup.');
  });

  it('returns undefined for unknown code', () => {
    expect(getErrorDef('AK9999')).toBeUndefined();
  });
});

describe('getAllErrorCodes', () => {
  it('returns an array of error codes', () => {
    const codes = getAllErrorCodes();
    expect(codes.length).toBeGreaterThan(0);
    expect(codes).toContain('AK0010');
    expect(codes).toContain('AK0020');
    expect(codes).toContain('AK0050');
  });

  it('all codes follow the AK#### format', () => {
    const codes = getAllErrorCodes();
    for (const code of codes) {
      expect(code).toMatch(/^AK\d{4}$/);
    }
  });
});

describe('error catalog coverage', () => {
  it('has context errors (AK001x)', () => {
    expect(getErrorDef('AK0010')).toBeDefined(); // provide outside setup
    expect(getErrorDef('AK0012')).toBeDefined(); // inject outside setup
    expect(getErrorDef('AK0013')).toBeDefined(); // no provider found
  });

  it('has lifecycle errors (AK002x)', () => {
    expect(getErrorDef('AK0020')).toBeDefined(); // onMount outside setup
    expect(getErrorDef('AK0021')).toBeDefined(); // onUnmount outside setup
    expect(getErrorDef('AK0022')).toBeDefined(); // onError outside setup
  });

  it('has signal errors (AK003x)', () => {
    expect(getErrorDef('AK0030')).toBeDefined(); // circular computed
    expect(getErrorDef('AK0031')).toBeDefined(); // set during computation
  });

  it('has component errors (AK004x)', () => {
    expect(getErrorDef('AK0040')).toBeDefined(); // setup must return render fn
    expect(getErrorDef('AK0041')).toBeDefined(); // missing required prop
  });

  it('has router errors (AK005x)', () => {
    expect(getErrorDef('AK0050')).toBeDefined(); // useRoute outside context
    expect(getErrorDef('AK0051')).toBeDefined(); // no route matched
    expect(getErrorDef('AK0052')).toBeDefined(); // guard threw
  });

  it('has form errors (AK006x)', () => {
    expect(getErrorDef('AK0060')).toBeDefined(); // submitted while invalid
    expect(getErrorDef('AK0061')).toBeDefined(); // async validator timeout
  });

  it('has HTTP errors (AK007x)', () => {
    expect(getErrorDef('AK0070')).toBeDefined(); // HTTP request failed
    expect(getErrorDef('AK0071')).toBeDefined(); // resource fetcher error
  });
});
