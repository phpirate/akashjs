/**
 * Material Design 3 design tokens.
 *
 * Colors, typography, spacing, elevation, motion, and shape.
 * All values are exposed as CSS custom properties for theming.
 */

// =========================================================================
// Colors — Material Design 3 color system
// =========================================================================

export const colors = {
  // Primary
  primary: '#6750A4',
  onPrimary: '#FFFFFF',
  primaryContainer: '#EADDFF',
  onPrimaryContainer: '#21005D',

  // Secondary
  secondary: '#625B71',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#E8DEF8',
  onSecondaryContainer: '#1D192B',

  // Tertiary
  tertiary: '#7D5260',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#FFD8E4',
  onTertiaryContainer: '#31111D',

  // Error
  error: '#B3261E',
  onError: '#FFFFFF',
  errorContainer: '#F9DEDC',
  onErrorContainer: '#410E0B',

  // Surface
  surface: '#FFFBFE',
  onSurface: '#1C1B1F',
  surfaceVariant: '#E7E0EC',
  onSurfaceVariant: '#49454F',
  surfaceDim: '#DED8E1',
  surfaceBright: '#FFFBFE',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F7F2FA',
  surfaceContainer: '#F3EDF7',
  surfaceContainerHigh: '#ECE6F0',
  surfaceContainerHighest: '#E6E0E9',

  // Outline
  outline: '#79747E',
  outlineVariant: '#CAC4D0',

  // Inverse
  inverseSurface: '#313033',
  inverseOnSurface: '#F4EFF4',
  inversePrimary: '#D0BCFF',

  // Scrim
  scrim: '#000000',
  shadow: '#000000',
} as const;

export const darkColors = {
  primary: '#D0BCFF',
  onPrimary: '#381E72',
  primaryContainer: '#4F378B',
  onPrimaryContainer: '#EADDFF',

  secondary: '#CCC2DC',
  onSecondary: '#332D41',
  secondaryContainer: '#4A4458',
  onSecondaryContainer: '#E8DEF8',

  tertiary: '#EFB8C8',
  onTertiary: '#492532',
  tertiaryContainer: '#633B48',
  onTertiaryContainer: '#FFD8E4',

  error: '#F2B8B5',
  onError: '#601410',
  errorContainer: '#8C1D18',
  onErrorContainer: '#F9DEDC',

  surface: '#1C1B1F',
  onSurface: '#E6E1E5',
  surfaceVariant: '#49454F',
  onSurfaceVariant: '#CAC4D0',
  surfaceDim: '#141218',
  surfaceBright: '#3B383E',
  surfaceContainerLowest: '#0F0D13',
  surfaceContainerLow: '#1D1B20',
  surfaceContainer: '#211F26',
  surfaceContainerHigh: '#2B2930',
  surfaceContainerHighest: '#36343B',

  outline: '#938F99',
  outlineVariant: '#49454F',

  inverseSurface: '#E6E1E5',
  inverseOnSurface: '#313033',
  inversePrimary: '#6750A4',

  scrim: '#000000',
  shadow: '#000000',
} as const;

// =========================================================================
// Typography — Material Design 3 type scale
// =========================================================================

export const typography = {
  displayLarge: { fontSize: '57px', lineHeight: '64px', fontWeight: '400', letterSpacing: '-0.25px' },
  displayMedium: { fontSize: '45px', lineHeight: '52px', fontWeight: '400', letterSpacing: '0' },
  displaySmall: { fontSize: '36px', lineHeight: '44px', fontWeight: '400', letterSpacing: '0' },

  headlineLarge: { fontSize: '32px', lineHeight: '40px', fontWeight: '400', letterSpacing: '0' },
  headlineMedium: { fontSize: '28px', lineHeight: '36px', fontWeight: '400', letterSpacing: '0' },
  headlineSmall: { fontSize: '24px', lineHeight: '32px', fontWeight: '400', letterSpacing: '0' },

  titleLarge: { fontSize: '22px', lineHeight: '28px', fontWeight: '400', letterSpacing: '0' },
  titleMedium: { fontSize: '16px', lineHeight: '24px', fontWeight: '500', letterSpacing: '0.15px' },
  titleSmall: { fontSize: '14px', lineHeight: '20px', fontWeight: '500', letterSpacing: '0.1px' },

  bodyLarge: { fontSize: '16px', lineHeight: '24px', fontWeight: '400', letterSpacing: '0.5px' },
  bodyMedium: { fontSize: '14px', lineHeight: '20px', fontWeight: '400', letterSpacing: '0.25px' },
  bodySmall: { fontSize: '12px', lineHeight: '16px', fontWeight: '400', letterSpacing: '0.4px' },

  labelLarge: { fontSize: '14px', lineHeight: '20px', fontWeight: '500', letterSpacing: '0.1px' },
  labelMedium: { fontSize: '12px', lineHeight: '16px', fontWeight: '500', letterSpacing: '0.5px' },
  labelSmall: { fontSize: '11px', lineHeight: '16px', fontWeight: '500', letterSpacing: '0.5px' },
} as const;

// =========================================================================
// Spacing
// =========================================================================

export const spacing = {
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
} as const;

// =========================================================================
// Elevation — Material Design 3 elevation levels
// =========================================================================

export const elevation = {
  0: 'none',
  1: '0 1px 2px 0 rgba(0,0,0,0.3), 0 1px 3px 1px rgba(0,0,0,0.15)',
  2: '0 1px 2px 0 rgba(0,0,0,0.3), 0 2px 6px 2px rgba(0,0,0,0.15)',
  3: '0 4px 8px 3px rgba(0,0,0,0.15), 0 1px 3px 0 rgba(0,0,0,0.3)',
  4: '0 6px 10px 4px rgba(0,0,0,0.15), 0 2px 3px 0 rgba(0,0,0,0.3)',
  5: '0 8px 12px 6px rgba(0,0,0,0.15), 0 4px 4px 0 rgba(0,0,0,0.3)',
} as const;

// =========================================================================
// Shape — Border radius
// =========================================================================

export const shape = {
  none: '0',
  extraSmall: '4px',
  small: '8px',
  medium: '12px',
  large: '16px',
  extraLarge: '28px',
  full: '9999px',
} as const;

// =========================================================================
// Motion — Transition durations and easings
// =========================================================================

export const motion = {
  duration: {
    short1: '50ms',
    short2: '100ms',
    short3: '150ms',
    short4: '200ms',
    medium1: '250ms',
    medium2: '300ms',
    medium3: '350ms',
    medium4: '400ms',
    long1: '450ms',
    long2: '500ms',
  },
  easing: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    standardDecelerate: 'cubic-bezier(0, 0, 0, 1)',
    standardAccelerate: 'cubic-bezier(0.3, 0, 1, 1)',
    emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
    emphasizedDecelerate: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
    emphasizedAccelerate: 'cubic-bezier(0.3, 0, 0.8, 0.15)',
  },
} as const;

// =========================================================================
// CSS custom properties generation
// =========================================================================

/**
 * Generate CSS custom properties string from tokens.
 * Inject this into your app's root styles.
 */
export function generateTokenCSS(dark = false): string {
  const c = dark ? darkColors : colors;
  let css = ':root {\n';

  // Colors
  for (const [key, value] of Object.entries(c)) {
    css += `  --md-sys-color-${camelToKebab(key)}: ${value};\n`;
  }

  // Typography
  for (const [key, value] of Object.entries(typography)) {
    const prefix = `--md-sys-typescale-${camelToKebab(key)}`;
    css += `  ${prefix}-font-size: ${value.fontSize};\n`;
    css += `  ${prefix}-line-height: ${value.lineHeight};\n`;
    css += `  ${prefix}-font-weight: ${value.fontWeight};\n`;
    css += `  ${prefix}-letter-spacing: ${value.letterSpacing};\n`;
  }

  // Elevation
  for (const [level, shadow] of Object.entries(elevation)) {
    css += `  --md-sys-elevation-${level}: ${shadow};\n`;
  }

  // Shape
  for (const [key, value] of Object.entries(shape)) {
    css += `  --md-sys-shape-${camelToKebab(key)}: ${value};\n`;
  }

  // Spacing
  for (const [key, value] of Object.entries(spacing)) {
    css += `  --md-sys-spacing-${key}: ${value};\n`;
  }

  css += '}\n';
  return css;
}

function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}
