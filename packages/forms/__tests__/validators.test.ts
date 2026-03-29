import { describe, it, expect } from 'vitest';
import { required, minLength, maxLength, min, max, pattern, email, custom } from '../src/validators.js';

describe('required', () => {
  const validate = required();

  it('rejects null', () => {
    expect(validate(null)).toBe('This field is required');
  });

  it('rejects undefined', () => {
    expect(validate(undefined)).toBe('This field is required');
  });

  it('rejects empty string', () => {
    expect(validate('')).toBe('This field is required');
  });

  it('rejects whitespace-only string', () => {
    expect(validate('   ')).toBe('This field is required');
  });

  it('accepts non-empty string', () => {
    expect(validate('hello')).toBeNull();
  });

  it('accepts zero', () => {
    expect(validate(0)).toBeNull();
  });

  it('accepts false', () => {
    expect(validate(false)).toBeNull();
  });

  it('uses custom message', () => {
    const v = required('Email is required');
    expect(v('')).toBe('Email is required');
  });
});

describe('minLength', () => {
  const validate = minLength(3);

  it('rejects short strings', () => {
    expect(validate('ab')).toBe('Must be at least 3 characters');
  });

  it('accepts exact length', () => {
    expect(validate('abc')).toBeNull();
  });

  it('accepts longer strings', () => {
    expect(validate('abcd')).toBeNull();
  });

  it('uses custom message', () => {
    const v = minLength(8, 'Min 8 chars');
    expect(v('short')).toBe('Min 8 chars');
  });
});

describe('maxLength', () => {
  const validate = maxLength(5);

  it('accepts short strings', () => {
    expect(validate('ab')).toBeNull();
  });

  it('accepts exact length', () => {
    expect(validate('abcde')).toBeNull();
  });

  it('rejects long strings', () => {
    expect(validate('abcdef')).toBe('Must be at most 5 characters');
  });
});

describe('min', () => {
  const validate = min(0);

  it('rejects below minimum', () => {
    expect(validate(-1)).toBe('Must be at least 0');
  });

  it('accepts exact minimum', () => {
    expect(validate(0)).toBeNull();
  });

  it('accepts above minimum', () => {
    expect(validate(5)).toBeNull();
  });
});

describe('max', () => {
  const validate = max(100);

  it('accepts below maximum', () => {
    expect(validate(50)).toBeNull();
  });

  it('accepts exact maximum', () => {
    expect(validate(100)).toBeNull();
  });

  it('rejects above maximum', () => {
    expect(validate(101)).toBe('Must be at most 100');
  });
});

describe('pattern', () => {
  const validate = pattern(/^\d+$/);

  it('accepts matching string', () => {
    expect(validate('123')).toBeNull();
  });

  it('rejects non-matching string', () => {
    expect(validate('abc')).not.toBeNull();
  });

  it('uses custom message', () => {
    const v = pattern(/^\d{5}$/, 'Invalid ZIP');
    expect(v('123')).toBe('Invalid ZIP');
    expect(v('12345')).toBeNull();
  });
});

describe('email', () => {
  const validate = email();

  it('accepts valid emails', () => {
    expect(validate('user@example.com')).toBeNull();
    expect(validate('a@b.co')).toBeNull();
  });

  it('rejects invalid emails', () => {
    expect(validate('notanemail')).toBe('Invalid email address');
    expect(validate('@example.com')).toBe('Invalid email address');
    expect(validate('user@')).toBe('Invalid email address');
  });

  it('accepts empty string (use required() for that)', () => {
    expect(validate('')).toBeNull();
  });

  it('uses custom message', () => {
    const v = email('Bad email');
    expect(v('nope')).toBe('Bad email');
  });
});

describe('custom', () => {
  it('runs a custom validation function', () => {
    const validate = custom<string>((v) => (v.includes('x') ? 'No x allowed' : null));
    expect(validate('hello')).toBeNull();
    expect(validate('hexllo')).toBe('No x allowed');
  });
});
