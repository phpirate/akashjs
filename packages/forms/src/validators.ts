/**
 * Built-in validators.
 *
 * Each validator is a factory that returns a validation function.
 * The validation function returns null (valid) or an error message string.
 */

import type { Validator } from './types.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Value must not be empty/null/undefined */
export function required(msg = 'This field is required'): Validator<unknown> {
  return (value) => {
    if (value == null) return msg;
    if (typeof value === 'string' && value.trim() === '') return msg;
    return null;
  };
}

/** String must have at least n characters */
export function minLength(n: number, msg?: string): Validator<string> {
  const message = msg ?? `Must be at least ${n} characters`;
  return (value) => (value.length >= n ? null : message);
}

/** String must have at most n characters */
export function maxLength(n: number, msg?: string): Validator<string> {
  const message = msg ?? `Must be at most ${n} characters`;
  return (value) => (value.length <= n ? null : message);
}

/** Number must be at least n */
export function min(n: number, msg?: string): Validator<number> {
  const message = msg ?? `Must be at least ${n}`;
  return (value) => (value >= n ? null : message);
}

/** Number must be at most n */
export function max(n: number, msg?: string): Validator<number> {
  const message = msg ?? `Must be at most ${n}`;
  return (value) => (value <= n ? null : message);
}

/** String must match a regex pattern */
export function pattern(regex: RegExp, msg?: string): Validator<string> {
  const message = msg ?? `Must match pattern ${regex}`;
  return (value) => (regex.test(value) ? null : message);
}

/** String must be a valid email address */
export function email(msg = 'Invalid email address'): Validator<string> {
  return (value) => (value === '' ? null : EMAIL_RE.test(value) ? null : msg);
}

/** Custom validator from a function */
export function custom<T>(fn: (value: T) => string | null): Validator<T> {
  return fn;
}
