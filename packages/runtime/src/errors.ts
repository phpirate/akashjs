/**
 * Error message catalog.
 *
 * Every AkashJS runtime error has a unique code (AK0001, AK0002, etc.),
 * a one-line description, and a link to detailed documentation.
 *
 * Usage:
 *   throw akashError('AK0010', 'provide()');
 */

// --- Error registry ---

export interface ErrorDef {
  /** Error code */
  code: string;
  /** Short description */
  message: string;
  /** Extended explanation and fix suggestion */
  hint: string;
}

const errors: Record<string, ErrorDef> = {
  // --- Context errors (AK001x) ---
  AK0010: {
    code: 'AK0010',
    message: 'provide() called outside of component setup.',
    hint: 'provide() must be called inside defineComponent().',
  },
  AK0012: {
    code: 'AK0012',
    message: 'inject() called outside of component setup.',
    hint: 'inject() must be called inside defineComponent().',
  },
  AK0013: {
    code: 'AK0013',
    message: 'No provider found for injected context.',
    hint: 'Make sure an ancestor component calls provide() with this key.',
  },

  // --- Lifecycle errors (AK002x) ---
  AK0020: {
    code: 'AK0020',
    message: 'onMount() called outside of component setup.',
    hint: 'onMount() must be called inside defineComponent().',
  },
  AK0021: {
    code: 'AK0021',
    message: 'onUnmount() called outside of component setup.',
    hint: 'onUnmount() must be called inside defineComponent().',
  },
  AK0022: {
    code: 'AK0022',
    message: 'onError() called outside of component setup.',
    hint: 'onError() must be called inside defineComponent().',
  },

  // --- Signal errors (AK003x) ---
  AK0030: {
    code: 'AK0030',
    message: 'Circular dependency detected in computed signal.',
    hint: 'A computed signal is reading itself, directly or via other computeds.',
  },
  AK0031: {
    code: 'AK0031',
    message: 'Signal set() called during computation.',
    hint: 'Do not set signals inside computed() or during effect execution. Use batch() or set signals in event handlers.',
  },

  // --- Component errors (AK004x) ---
  AK0040: {
    code: 'AK0040',
    message: 'Component setup must return a render function.',
    hint: 'The function passed to defineComponent() must return () => AkashNode.',
  },
  AK0041: {
    code: 'AK0041',
    message: 'Required prop is missing.',
    hint: 'Check that the parent component is passing all required props.',
  },

  // --- Router errors (AK005x) ---
  AK0050: {
    code: 'AK0050',
    message: 'useRoute() called outside of router context.',
    hint: 'Make sure your component is rendered inside a router provider.',
  },
  AK0051: {
    code: 'AK0051',
    message: 'No route matched the current URL.',
    hint: 'Add a catch-all route ([...rest]) to handle unmatched paths.',
  },
  AK0052: {
    code: 'AK0052',
    message: 'Route guard threw an error.',
    hint: 'Check the guard function for unhandled exceptions.',
  },

  // --- Form errors (AK006x) ---
  AK0060: {
    code: 'AK0060',
    message: 'Form submitted while invalid.',
    hint: 'The submit handler was not called because validation failed. Check form.errors().',
  },
  AK0061: {
    code: 'AK0061',
    message: 'Async validator timed out.',
    hint: 'The async validator did not resolve within the expected time. Check your async validation logic.',
  },

  // --- HTTP errors (AK007x) ---
  AK0070: {
    code: 'AK0070',
    message: 'HTTP request failed.',
    hint: 'Check the server response status and network connectivity.',
  },
  AK0071: {
    code: 'AK0071',
    message: 'createResource() fetcher threw an error.',
    hint: 'Check the fetcher function passed to createResource().',
  },
};

// --- Public API ---

const DOC_BASE = 'https://akashjs.dev/errors';

/**
 * Format an AkashJS error with code, message, hint, and doc link.
 */
export function formatError(code: string, context?: string): string {
  const def = errors[code];
  if (!def) {
    return `[AkashJS ${code}] Unknown error code.`;
  }

  let msg = `[AkashJS ${code}] ${def.message}`;
  if (context) {
    msg += `\n  ${context}`;
  }
  msg += `\n  ${def.hint}`;
  msg += `\n  See: ${DOC_BASE}/${code}`;
  return msg;
}

/**
 * Create and throw an AkashJS error.
 */
export function akashError(code: string, context?: string): Error {
  return new Error(formatError(code, context));
}

/**
 * Get the error definition for a code.
 */
export function getErrorDef(code: string): ErrorDef | undefined {
  return errors[code];
}

/**
 * Get all registered error codes.
 */
export function getAllErrorCodes(): string[] {
  return Object.keys(errors);
}
