/**
 * CSS utility functions.
 *
 * cx() for class name merging and css() for dynamic style objects.
 * Tiny but used in every component.
 */

// --- cx() — class name merging ---

type CxInput = string | boolean | null | undefined | Record<string, boolean> | CxInput[];

/**
 * Merge class names conditionally. Falsy values are filtered out.
 * Object keys are included when their value is truthy.
 *
 * ```ts
 * cx('btn', isActive && 'btn-active', { 'btn-lg': isLarge })
 * // 'btn btn-active btn-lg'
 *
 * cx('card', undefined, false, null, 'card-primary')
 * // 'card card-primary'
 * ```
 */
export function cx(...inputs: CxInput[]): string {
  const classes: string[] = [];

  for (const input of inputs) {
    if (!input) continue;

    if (typeof input === 'string') {
      classes.push(input);
    } else if (Array.isArray(input)) {
      const nested = cx(...input);
      if (nested) classes.push(nested);
    } else if (typeof input === 'object') {
      for (const [key, value] of Object.entries(input)) {
        if (value) classes.push(key);
      }
    }
  }

  return classes.join(' ');
}

// --- css() — dynamic style objects ---

type CssValue = string | number | null | undefined;
type CssProperties = Record<string, CssValue>;

/**
 * Build a CSS style string from an object. Handles camelCase → kebab-case
 * conversion and filters out null/undefined values.
 *
 * ```ts
 * css({ backgroundColor: 'red', fontSize: 14, display: isVisible ? 'block' : 'none' })
 * // 'background-color: red; font-size: 14px; display: block'
 * ```
 */
export function css(styles: CssProperties): string {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(styles)) {
    if (value == null) continue;

    const prop = camelToKebab(key);
    const val = typeof value === 'number' && !UNITLESS_PROPS.has(key)
      ? `${value}px`
      : String(value);

    parts.push(`${prop}: ${val}`);
  }

  return parts.join('; ');
}

/**
 * Apply a style object to an element.
 *
 * ```ts
 * applyStyles(el, { color: 'red', marginTop: 10 });
 * ```
 */
export function applyStyles(el: HTMLElement, styles: CssProperties): void {
  for (const [key, value] of Object.entries(styles)) {
    if (value == null) {
      el.style.removeProperty(camelToKebab(key));
    } else {
      const val = typeof value === 'number' && !UNITLESS_PROPS.has(key)
        ? `${value}px`
        : String(value);
      el.style.setProperty(camelToKebab(key), val);
    }
  }
}

// --- Helpers ---

function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

/** CSS properties that don't get automatic px units */
const UNITLESS_PROPS = new Set([
  'animationIterationCount', 'boxFlex', 'boxFlexGroup', 'boxOrdinalGroup',
  'columnCount', 'fillOpacity', 'flex', 'flexGrow', 'flexPositive',
  'flexShrink', 'flexNegative', 'flexOrder', 'fontWeight', 'gridColumn',
  'gridRow', 'lineClamp', 'lineHeight', 'opacity', 'order', 'orphans',
  'tabSize', 'widows', 'zIndex', 'zoom',
]);
