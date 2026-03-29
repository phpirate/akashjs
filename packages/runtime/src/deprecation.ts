/**
 * Deprecation warnings and API stability markers.
 *
 * Provides runtime warnings when deprecated APIs are used,
 * with migration hints pointing to the replacement.
 *
 * ```ts
 * // Mark an API as deprecated:
 * export const oldName = deprecated(newImplementation, {
 *   name: 'oldName',
 *   replacement: 'newName',
 *   since: '0.2.0',
 *   removeIn: '1.0.0',
 *   message: 'Use newName() instead for better performance.',
 * });
 *
 * // Users see:
 * // [AkashJS] DEPRECATED: oldName() is deprecated since v0.2.0 and will be removed in v1.0.0.
 * //   Use newName() instead for better performance.
 * //   See: https://akash.js.org/migration
 * ```
 */

// =========================================================================
// Types
// =========================================================================

export type APIStability = 'stable' | 'experimental' | 'deprecated' | 'internal';

export interface DeprecationInfo {
  /** Name of the deprecated API */
  name: string;
  /** Replacement API name */
  replacement?: string;
  /** Version when deprecated */
  since: string;
  /** Version when it will be removed */
  removeIn?: string;
  /** Custom migration message */
  message?: string;
  /** Documentation link */
  link?: string;
}

export interface APIInfo {
  /** API name */
  name: string;
  /** Stability level */
  stability: APIStability;
  /** Version introduced */
  since: string;
  /** Deprecation info (if deprecated) */
  deprecation?: DeprecationInfo;
}

// =========================================================================
// Warning state
// =========================================================================

const warned = new Set<string>();
let warningsEnabled = true;
let warningHandler: ((msg: string) => void) | null = null;

/**
 * Enable or disable deprecation warnings globally.
 */
export function setDeprecationWarnings(enabled: boolean): void {
  warningsEnabled = enabled;
}

/**
 * Set a custom warning handler (default: console.warn).
 */
export function setWarningHandler(handler: ((msg: string) => void) | null): void {
  warningHandler = handler;
}

/**
 * Reset warned-about APIs (useful for testing).
 */
export function resetDeprecationWarnings(): void {
  warned.clear();
}

// =========================================================================
// deprecated() — wrap a function with a deprecation warning
// =========================================================================

/**
 * Wrap a function so it emits a deprecation warning on first call.
 *
 * ```ts
 * // Old API that still works but warns:
 * export const createStore = deprecated(defineStore, {
 *   name: 'createStore',
 *   replacement: 'defineStore',
 *   since: '0.2.0',
 *   removeIn: '1.0.0',
 * });
 * ```
 */
export function deprecated<T extends (...args: any[]) => any>(
  fn: T,
  info: DeprecationInfo,
): T {
  const wrapper = ((...args: any[]) => {
    emitDeprecationWarning(info);
    return fn(...args);
  }) as unknown as T;

  // Copy properties from original
  Object.keys(fn).forEach((key) => {
    (wrapper as any)[key] = (fn as any)[key];
  });

  // Mark as deprecated
  (wrapper as any).__deprecated = info;

  return wrapper;
}

/**
 * Mark a value (non-function) as deprecated.
 * Returns the value but warns on first access.
 */
export function deprecatedValue<T>(value: T, info: DeprecationInfo): T {
  emitDeprecationWarning(info);
  return value;
}

// =========================================================================
// Warning emission
// =========================================================================

function emitDeprecationWarning(info: DeprecationInfo): void {
  if (!warningsEnabled) return;
  if (warned.has(info.name)) return; // Only warn once per API
  warned.add(info.name);

  const parts: string[] = [
    `[AkashJS] DEPRECATED: ${info.name}() is deprecated since v${info.since}`,
  ];

  if (info.removeIn) {
    parts[0] += ` and will be removed in v${info.removeIn}.`;
  } else {
    parts[0] += '.';
  }

  if (info.replacement) {
    parts.push(`  Migrate to: ${info.replacement}()`);
  }

  if (info.message) {
    parts.push(`  ${info.message}`);
  }

  parts.push(`  See: ${info.link ?? 'https://akash.js.org/migration'}`);

  const msg = parts.join('\n');

  if (warningHandler) {
    warningHandler(msg);
  } else if (typeof console !== 'undefined') {
    console.warn(msg);
  }
}

// =========================================================================
// API Registry — track stability of all APIs
// =========================================================================

const apiRegistry = new Map<string, APIInfo>();

/**
 * Register an API with its stability level.
 */
export function registerAPI(info: APIInfo): void {
  apiRegistry.set(info.name, info);
}

/**
 * Get all registered APIs.
 */
export function getRegisteredAPIs(): APIInfo[] {
  return Array.from(apiRegistry.values());
}

/**
 * Get APIs by stability level.
 */
export function getAPIsByStability(stability: APIStability): APIInfo[] {
  return getRegisteredAPIs().filter((api) => api.stability === stability);
}

/**
 * Check if an API is deprecated.
 */
export function isDeprecated(name: string): boolean {
  const info = apiRegistry.get(name);
  return info?.stability === 'deprecated';
}

/**
 * Get deprecation info for an API.
 */
export function getDeprecationInfo(name: string): DeprecationInfo | null {
  const info = apiRegistry.get(name);
  return info?.deprecation ?? null;
}

// =========================================================================
// Compatibility check
// =========================================================================

export interface CompatibilityResult {
  compatible: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * Check if package versions are compatible.
 *
 * ```ts
 * const result = checkCompatibility({
 *   '@akashjs/runtime': '0.2.0',
 *   '@akashjs/router': '0.1.0',
 * });
 * if (!result.compatible) {
 *   console.error(result.errors);
 * }
 * ```
 */
export function checkCompatibility(
  packages: Record<string, string>,
): CompatibilityResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  const versions = Object.entries(packages);
  if (versions.length === 0) return { compatible: true, warnings, errors };

  // Check that all @akashjs packages are on compatible versions
  const akashPackages = versions.filter(([name]) => name.startsWith('@akashjs/'));

  if (akashPackages.length > 1) {
    const majors = new Set(akashPackages.map(([, v]) => v.split('.')[0]));
    const minors = new Set(akashPackages.map(([, v]) => v.split('.').slice(0, 2).join('.')));

    if (majors.size > 1) {
      errors.push(
        `Major version mismatch: ${akashPackages.map(([n, v]) => `${n}@${v}`).join(', ')}. ` +
        'All @akashjs packages should be on the same major version.',
      );
    } else if (minors.size > 1) {
      warnings.push(
        `Minor version mismatch: ${akashPackages.map(([n, v]) => `${n}@${v}`).join(', ')}. ` +
        'Consider updating all packages to the same version with `akash update`.',
      );
    }
  }

  return {
    compatible: errors.length === 0,
    warnings,
    errors,
  };
}
