/**
 * Developer-friendly error hints.
 *
 * Wraps common runtime errors with actionable messages.
 * Only active in development mode.
 */

const __DEV__ = typeof process === 'undefined' || process.env?.NODE_ENV !== 'production';

interface ErrorHint {
  pattern: RegExp;
  hint: (match: RegExpMatchArray) => string;
}

const HINTS: ErrorHint[] = [
  {
    // signal() called but assigned with = instead of .set()
    pattern: /Cannot set property '?(\w+)'? of/,
    hint: (m) => `Did you try to reassign a signal? Use ${m[1]}.set(value) instead of ${m[1]} = value.`,
  },
  {
    // signal() return value used without calling it
    pattern: /(\w+) is not a function/,
    hint: (m) => `"${m[1]}" may be a signal. Read it with ${m[1]}(), set it with ${m[1]}.set(value).`,
  },
  {
    // Accessing property on null/undefined (common with unloaded data)
    pattern: /Cannot read propert(?:y|ies) of (null|undefined)/,
    hint: () => `A value is null/undefined. Use optional chaining (?.) or wrap in <Show when={value()}>.`,
  },
  {
    // forEach/map on non-array (signal not unwrapped)
    pattern: /(\w+)\.(?:forEach|map|filter|reduce) is not a function/,
    hint: (m) => `"${m[1]}" might be a signal containing an array. Call ${m[1]}() first to get the value: ${m[1]}().map(...)`,
  },
  {
    // .set is not a function (calling .set on a computed or plain value)
    pattern: /(\w+)\.set is not a function/,
    hint: (m) => `"${m[1]}" is not a writable signal. Only signal() values have .set(). Computed values are read-only.`,
  },
  {
    // Maximum call stack (circular dependency)
    pattern: /Maximum call stack size exceeded/,
    hint: () => `Possible circular dependency. Check if two computed values or effects read and write to each other.`,
  },
];

/**
 * Enhance an error with a developer hint if one matches.
 */
export function enhanceError(error: Error): Error {
  if (!__DEV__) return error;

  for (const { pattern, hint } of HINTS) {
    const match = pattern.exec(error.message);
    if (match) {
      error.message += `\n\n💡 Hint: ${hint(match)}`;
      break;
    }
  }

  return error;
}

/**
 * Install global error handler that adds hints to unhandled errors.
 * Call once in your app's entry point during development.
 */
export function installErrorHints(): void {
  if (!__DEV__) return;

  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      if (event.error instanceof Error) {
        enhanceError(event.error);
      }
    });
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason instanceof Error) {
        enhanceError(event.reason);
      }
    });
  }

  if (typeof process !== 'undefined' && process.on) {
    process.on('uncaughtException', (err) => {
      enhanceError(err);
      console.error(err);
      process.exit(1);
    });
  }
}
