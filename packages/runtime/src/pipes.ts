/**
 * Pipes — template transform functions.
 *
 * Pure functions that transform display values. Chainable, memoized,
 * and usable both in templates and in script.
 *
 * ```ts
 * import { pipe, uppercase, date, currency } from '@akashjs/runtime';
 *
 * pipe('hello', uppercase);                    // 'HELLO'
 * pipe(new Date(), date, 'short');             // '3/29/26'
 * pipe(1234.5, currency, 'USD');               // '$1,234.50'
 * pipe('hello world', capitalize, truncate, 5); // 'Hello...'
 * ```
 */

// =========================================================================
// Pipe type and runner
// =========================================================================

export type PipeFn<TIn = any, TOut = any> = (value: TIn, ...args: any[]) => TOut;

/**
 * Apply a pipe transform to a value.
 *
 * ```ts
 * pipe('hello', uppercase); // 'HELLO'
 * pipe(1234, currency, 'USD'); // '$1,234.00'
 * ```
 */
export function pipe<TIn, TOut>(value: TIn, transform: PipeFn<TIn, TOut>, ...args: any[]): TOut {
  return transform(value, ...args);
}

/**
 * Chain multiple pipes together.
 *
 * ```ts
 * const format = chain(trim, capitalize, truncate);
 * format('  hello world  ', 10); // 'Hello w...'
 * ```
 */
export function chain<T>(...pipes: PipeFn[]): PipeFn<T, any> {
  return (value: T, ...args: any[]) => {
    let result: any = value;
    for (const p of pipes) {
      result = p(result, ...args);
    }
    return result;
  };
}

/**
 * Define a custom pipe.
 *
 * ```ts
 * const reverse = definePipe<string, string>((value) =>
 *   value.split('').reverse().join('')
 * );
 * pipe('hello', reverse); // 'olleh'
 * ```
 */
export function definePipe<TIn, TOut>(fn: PipeFn<TIn, TOut>): PipeFn<TIn, TOut> {
  return fn;
}

// =========================================================================
// Built-in pipes
// =========================================================================

/** Convert string to uppercase */
export const uppercase: PipeFn<string, string> = (value) => String(value).toUpperCase();

/** Convert string to lowercase */
export const lowercase: PipeFn<string, string> = (value) => String(value).toLowerCase();

/** Capitalize first letter */
export const capitalize: PipeFn<string, string> = (value) => {
  const s = String(value);
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Title case — capitalize each word */
export const titleCase: PipeFn<string, string> = (value) => {
  return String(value).replace(/\b\w/g, (c) => c.toUpperCase());
};

/** Trim whitespace */
export const trim: PipeFn<string, string> = (value) => String(value).trim();

/**
 * Truncate string to a max length, adding ellipsis.
 *
 * ```ts
 * pipe('Hello World', truncate, 8); // 'Hello...'
 * ```
 */
export const truncate: PipeFn<string, string> = (value, maxLength: number = 50, suffix = '...') => {
  const s = String(value);
  if (s.length <= maxLength) return s;
  return s.slice(0, maxLength - suffix.length) + suffix;
};

/**
 * Format a date.
 *
 * ```ts
 * pipe(new Date(), date);             // '3/29/2026'
 * pipe(new Date(), date, 'short');    // '3/29/26'
 * pipe(new Date(), date, 'long');     // 'March 29, 2026'
 * pipe(new Date(), date, 'time');     // '2:30 PM'
 * pipe(new Date(), date, 'iso');      // '2026-03-29T...'
 * ```
 */
export const date: PipeFn<Date | string | number, string> = (
  value,
  format: 'short' | 'medium' | 'long' | 'full' | 'time' | 'iso' = 'medium',
  locale?: string,
) => {
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return String(value);

  if (format === 'iso') return d.toISOString();

  const loc = locale ?? 'en-US';

  const options: Record<string, Intl.DateTimeFormatOptions> = {
    short: { year: '2-digit', month: 'numeric', day: 'numeric' },
    medium: { year: 'numeric', month: 'numeric', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric' },
    full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
    time: { hour: 'numeric', minute: '2-digit' },
  };

  return new Intl.DateTimeFormat(loc, options[format]).format(d);
};

/**
 * Format a number as currency.
 *
 * ```ts
 * pipe(1234.5, currency);         // '$1,234.50'
 * pipe(1234.5, currency, 'EUR');  // '€1,234.50'
 * ```
 */
export const currency: PipeFn<number, string> = (value, currencyCode = 'USD', locale?: string) => {
  return new Intl.NumberFormat(locale ?? 'en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(Number(value));
};

/**
 * Format a number with locale formatting.
 *
 * ```ts
 * pipe(1234567.89, number);           // '1,234,567.89'
 * pipe(1234567.89, number, '0-2');    // '1,234,567.89' (0-2 decimal digits)
 * ```
 */
export const number: PipeFn<number, string> = (value, digitsInfo?: string, locale?: string) => {
  const opts: Intl.NumberFormatOptions = {};
  if (digitsInfo) {
    const [min, max] = digitsInfo.split('-').map(Number);
    opts.minimumFractionDigits = min;
    opts.maximumFractionDigits = max ?? min;
  }
  return new Intl.NumberFormat(locale ?? 'en-US', opts).format(Number(value));
};

/**
 * Format a number as a percentage.
 *
 * ```ts
 * pipe(0.85, percent);   // '85%'
 * pipe(0.856, percent);  // '86%'
 * ```
 */
export const percent: PipeFn<number, string> = (value, decimals = 0, locale?: string) => {
  return new Intl.NumberFormat(locale ?? 'en-US', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(value));
};

/**
 * JSON stringify with formatting.
 *
 * ```ts
 * pipe({ a: 1 }, json);     // '{\n  "a": 1\n}'
 * pipe({ a: 1 }, json, 0);  // '{"a":1}'
 * ```
 */
export const json: PipeFn<unknown, string> = (value, indent = 2) => {
  return JSON.stringify(value, null, indent);
};

/**
 * Pluralize a string based on count.
 *
 * ```ts
 * pipe(1, plural, 'item', 'items');  // '1 item'
 * pipe(5, plural, 'item', 'items');  // '5 items'
 * ```
 */
export const plural: PipeFn<number, string> = (value, singular: string, pluralForm?: string) => {
  const p = pluralForm ?? `${singular}s`;
  return `${value} ${value === 1 ? singular : p}`;
};

/**
 * Relative time formatting.
 *
 * ```ts
 * pipe(Date.now() - 60000, relativeTime);  // '1 minute ago'
 * ```
 */
export const relativeTime: PipeFn<Date | number, string> = (value, locale?: string) => {
  const d = value instanceof Date ? value.getTime() : Number(value);
  const diff = d - Date.now();
  const absDiff = Math.abs(diff);

  const units: Array<[number, Intl.RelativeTimeFormatUnit]> = [
    [60000, 'second'],
    [3600000, 'minute'],
    [86400000, 'hour'],
    [2592000000, 'day'],
    [31536000000, 'month'],
    [Infinity, 'year'],
  ];

  const divisors: Record<string, number> = {
    second: 1000, minute: 60000, hour: 3600000,
    day: 86400000, month: 2592000000, year: 31536000000,
  };

  let unit: Intl.RelativeTimeFormatUnit = 'second';
  for (const [threshold, u] of units) {
    if (absDiff < threshold) { unit = u; break; }
  }

  const n = Math.round(diff / divisors[unit]);

  if (typeof Intl !== 'undefined' && Intl.RelativeTimeFormat) {
    return new Intl.RelativeTimeFormat(locale ?? 'en', { numeric: 'auto' }).format(n, unit);
  }

  const abs = Math.abs(n);
  const suffix = n < 0 ? 'ago' : 'from now';
  return `${abs} ${unit}${abs !== 1 ? 's' : ''} ${suffix}`;
};
