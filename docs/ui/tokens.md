# Design Tokens

`@akashjs/ui` uses Material Design 3 design tokens for consistent theming across every component. Tokens are exposed as both TypeScript objects and CSS custom properties.

## Color System

The color system follows MD3 with five key color families, each providing a main color, its "on" contrast color, a container, and an "on-container" contrast.

### Primary

| Token | Light | Dark |
|---|---|---|
| `--md-sys-color-primary` | `#6750A4` | `#D0BCFF` |
| `--md-sys-color-on-primary` | `#FFFFFF` | `#381E72` |
| `--md-sys-color-primary-container` | `#EADDFF` | `#4F378B` |
| `--md-sys-color-on-primary-container` | `#21005D` | `#EADDFF` |

### Secondary

| Token | Light | Dark |
|---|---|---|
| `--md-sys-color-secondary` | `#625B71` | `#CCC2DC` |
| `--md-sys-color-on-secondary` | `#FFFFFF` | `#332D41` |
| `--md-sys-color-secondary-container` | `#E8DEF8` | `#4A4458` |
| `--md-sys-color-on-secondary-container` | `#1D192B` | `#E8DEF8` |

### Tertiary

| Token | Light | Dark |
|---|---|---|
| `--md-sys-color-tertiary` | `#7D5260` | `#EFB8C8` |
| `--md-sys-color-on-tertiary` | `#FFFFFF` | `#492532` |
| `--md-sys-color-tertiary-container` | `#FFD8E4` | `#633B48` |
| `--md-sys-color-on-tertiary-container` | `#31111D` | `#FFD8E4` |

### Error

| Token | Light | Dark |
|---|---|---|
| `--md-sys-color-error` | `#B3261E` | `#F2B8B5` |
| `--md-sys-color-on-error` | `#FFFFFF` | `#601410` |
| `--md-sys-color-error-container` | `#F9DEDC` | `#8C1D18` |
| `--md-sys-color-on-error-container` | `#410E0B` | `#F9DEDC` |

### Surface

| Token | Light | Dark |
|---|---|---|
| `--md-sys-color-surface` | `#FFFBFE` | `#1C1B1F` |
| `--md-sys-color-on-surface` | `#1C1B1F` | `#E6E1E5` |
| `--md-sys-color-surface-variant` | `#E7E0EC` | `#49454F` |
| `--md-sys-color-on-surface-variant` | `#49454F` | `#CAC4D0` |
| `--md-sys-color-surface-dim` | `#DED8E1` | `#141218` |
| `--md-sys-color-surface-bright` | `#FFFBFE` | `#3B383E` |
| `--md-sys-color-surface-container-lowest` | `#FFFFFF` | `#0F0D13` |
| `--md-sys-color-surface-container-low` | `#F7F2FA` | `#1D1B20` |
| `--md-sys-color-surface-container` | `#F3EDF7` | `#211F26` |
| `--md-sys-color-surface-container-high` | `#ECE6F0` | `#2B2930` |
| `--md-sys-color-surface-container-highest` | `#E6E0E9` | `#36343B` |

### Outline & Utility

| Token | Light | Dark |
|---|---|---|
| `--md-sys-color-outline` | `#79747E` | `#938F99` |
| `--md-sys-color-outline-variant` | `#CAC4D0` | `#49454F` |
| `--md-sys-color-inverse-surface` | `#313033` | `#E6E1E5` |
| `--md-sys-color-inverse-on-surface` | `#F4EFF4` | `#313033` |
| `--md-sys-color-inverse-primary` | `#D0BCFF` | `#6750A4` |
| `--md-sys-color-scrim` | `#000000` | `#000000` |
| `--md-sys-color-shadow` | `#000000` | `#000000` |

### Accessing Colors in TypeScript

```ts
import { colors, darkColors } from '@akashjs/ui';

console.log(colors.primary);          // '#6750A4'
console.log(darkColors.primary);      // '#D0BCFF'
console.log(colors.surfaceContainer); // '#F3EDF7'
```

## Typography Scale

The type scale provides 15 roles across 5 categories (display, headline, title, body, label), each in large/medium/small sizes.

| Token prefix | Font Size | Line Height | Weight | Letter Spacing |
|---|---|---|---|---|
| `display-large` | 57px | 64px | 400 | -0.25px |
| `display-medium` | 45px | 52px | 400 | 0 |
| `display-small` | 36px | 44px | 400 | 0 |
| `headline-large` | 32px | 40px | 400 | 0 |
| `headline-medium` | 28px | 36px | 400 | 0 |
| `headline-small` | 24px | 32px | 400 | 0 |
| `title-large` | 22px | 28px | 400 | 0 |
| `title-medium` | 16px | 24px | 500 | 0.15px |
| `title-small` | 14px | 20px | 500 | 0.1px |
| `body-large` | 16px | 24px | 400 | 0.5px |
| `body-medium` | 14px | 20px | 400 | 0.25px |
| `body-small` | 12px | 16px | 400 | 0.4px |
| `label-large` | 14px | 20px | 500 | 0.1px |
| `label-medium` | 12px | 16px | 500 | 0.5px |
| `label-small` | 11px | 16px | 500 | 0.5px |

Each role generates four CSS custom properties:

```css
--md-sys-typescale-body-large-font-size: 16px;
--md-sys-typescale-body-large-line-height: 24px;
--md-sys-typescale-body-large-font-weight: 400;
--md-sys-typescale-body-large-letter-spacing: 0.5px;
```

### Accessing Typography in TypeScript

```ts
import { typography } from '@akashjs/ui';

console.log(typography.bodyLarge);
// { fontSize: '16px', lineHeight: '24px', fontWeight: '400', letterSpacing: '0.5px' }
```

## Spacing Scale

A linear spacing scale for margins, paddings, and gaps.

| Key | Value | CSS Property |
|---|---|---|
| `0` | `0` | `--md-sys-spacing-0` |
| `1` | `4px` | `--md-sys-spacing-1` |
| `2` | `8px` | `--md-sys-spacing-2` |
| `3` | `12px` | `--md-sys-spacing-3` |
| `4` | `16px` | `--md-sys-spacing-4` |
| `5` | `20px` | `--md-sys-spacing-5` |
| `6` | `24px` | `--md-sys-spacing-6` |
| `8` | `32px` | `--md-sys-spacing-8` |
| `10` | `40px` | `--md-sys-spacing-10` |
| `12` | `48px` | `--md-sys-spacing-12` |
| `16` | `64px` | `--md-sys-spacing-16` |

```ts
import { spacing } from '@akashjs/ui';

console.log(spacing[4]); // '16px'
```

## Elevation

Five elevation levels with Material Design shadow values.

| Level | Shadow | CSS Property |
|---|---|---|
| `0` | `none` | `--md-sys-elevation-0` |
| `1` | `0 1px 2px 0 rgba(0,0,0,0.3), 0 1px 3px 1px rgba(0,0,0,0.15)` | `--md-sys-elevation-1` |
| `2` | `0 1px 2px 0 rgba(0,0,0,0.3), 0 2px 6px 2px rgba(0,0,0,0.15)` | `--md-sys-elevation-2` |
| `3` | `0 4px 8px 3px rgba(0,0,0,0.15), 0 1px 3px 0 rgba(0,0,0,0.3)` | `--md-sys-elevation-3` |
| `4` | `0 6px 10px 4px rgba(0,0,0,0.15), 0 2px 3px 0 rgba(0,0,0,0.3)` | `--md-sys-elevation-4` |
| `5` | `0 8px 12px 6px rgba(0,0,0,0.15), 0 4px 4px 0 rgba(0,0,0,0.3)` | `--md-sys-elevation-5` |

```ts
import { elevation } from '@akashjs/ui';

console.log(elevation[3]);
// '0 4px 8px 3px rgba(0,0,0,0.15), 0 1px 3px 0 rgba(0,0,0,0.3)'
```

## Shape (Border Radius)

| Key | Value | CSS Property |
|---|---|---|
| `none` | `0` | `--md-sys-shape-none` |
| `extraSmall` | `4px` | `--md-sys-shape-extra-small` |
| `small` | `8px` | `--md-sys-shape-small` |
| `medium` | `12px` | `--md-sys-shape-medium` |
| `large` | `16px` | `--md-sys-shape-large` |
| `extraLarge` | `28px` | `--md-sys-shape-extra-large` |
| `full` | `9999px` | `--md-sys-shape-full` |

```ts
import { shape } from '@akashjs/ui';

console.log(shape.medium); // '12px'
console.log(shape.full);   // '9999px'
```

## Motion (Durations and Easings)

### Durations

| Key | Value |
|---|---|
| `short1` | `50ms` |
| `short2` | `100ms` |
| `short3` | `150ms` |
| `short4` | `200ms` |
| `medium1` | `250ms` |
| `medium2` | `300ms` |
| `medium3` | `350ms` |
| `medium4` | `400ms` |
| `long1` | `450ms` |
| `long2` | `500ms` |

### Easings

| Key | Value |
|---|---|
| `standard` | `cubic-bezier(0.2, 0, 0, 1)` |
| `standardDecelerate` | `cubic-bezier(0, 0, 0, 1)` |
| `standardAccelerate` | `cubic-bezier(0.3, 0, 1, 1)` |
| `emphasized` | `cubic-bezier(0.2, 0, 0, 1)` |
| `emphasizedDecelerate` | `cubic-bezier(0.05, 0.7, 0.1, 1)` |
| `emphasizedAccelerate` | `cubic-bezier(0.3, 0, 0.8, 0.15)` |

```ts
import { motion } from '@akashjs/ui';

console.log(motion.duration.medium2); // '300ms'
console.log(motion.easing.standard);  // 'cubic-bezier(0.2, 0, 0, 1)'
```

## generateTokenCSS() API

```ts
function generateTokenCSS(dark?: boolean): string
```

Returns a complete CSS string with a `:root` block containing all token custom properties.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `dark` | `boolean` | `false` | When `true`, uses the dark color palette instead of light |

**Returns:** A string of CSS that sets all `--md-sys-*` custom properties on `:root`.

```ts
import { generateTokenCSS } from '@akashjs/ui';

// Light theme
const lightCSS = generateTokenCSS();

// Dark theme
const darkCSS = generateTokenCSS(true);

// Inject into the document
const style = document.createElement('style');
style.textContent = lightCSS;
document.head.appendChild(style);
```
