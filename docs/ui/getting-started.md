# Getting Started with @akashjs/ui

`@akashjs/ui` is a Material Design 3 component library built for AkashJS. It provides a complete set of UI primitives -- buttons, text fields, dialogs, layout helpers, and more -- all styled with MD3 design tokens and wired for reactive state via Signals.

## Installation

```bash
npm install @akashjs/ui
```

Or with your preferred package manager:

```bash
pnpm add @akashjs/ui
yarn add @akashjs/ui
```

## Injecting Design Tokens

Before using any components, inject the Material Design 3 CSS custom properties into your app. The `generateTokenCSS` function produces a `:root` block with all color, typography, spacing, elevation, and shape tokens.

```ts
import { generateTokenCSS } from '@akashjs/ui';

// Inject light-mode tokens
const style = document.createElement('style');
style.textContent = generateTokenCSS();
document.head.appendChild(style);
```

This sets up custom properties like `--md-sys-color-primary`, `--md-sys-typescale-body-large-font-size`, `--md-sys-spacing-4`, and so on. Every component reads from these properties, so theming is as simple as overriding them.

## Basic Usage

```ts
import { Button } from '@akashjs/ui';

const app = document.getElementById('app')!;

const btn = Button({
  variant: 'filled',
  onClick: () => alert('Clicked!'),
  children: 'Get Started',
});

app.appendChild(btn);
```

All components follow the same pattern: import the component function, pass a props object, and receive a DOM node you can mount anywhere.

## Dark Mode

Pass `true` to `generateTokenCSS` to switch to the dark color palette:

```ts
import { generateTokenCSS } from '@akashjs/ui';

// Dark mode
const style = document.createElement('style');
style.textContent = generateTokenCSS(true);
document.head.appendChild(style);
```

To implement a toggle, swap the style element's `textContent` between `generateTokenCSS(false)` and `generateTokenCSS(true)`:

```ts
import { signal } from '@akashjs/runtime';
import { generateTokenCSS, Switch } from '@akashjs/ui';

const dark = signal(false);
const tokenStyle = document.createElement('style');
tokenStyle.textContent = generateTokenCSS(false);
document.head.appendChild(tokenStyle);

const toggle = Switch({
  checked: dark,
  label: 'Dark mode',
  onChange: (on) => {
    tokenStyle.textContent = generateTokenCSS(on);
  },
});
```

## Customizing Tokens via CSS Custom Properties

You do not need to use `generateTokenCSS` at all if you prefer to define tokens yourself. Every component reads from standard CSS custom property names. Override any token in your own stylesheet:

```css
:root {
  /* Custom brand primary */
  --md-sys-color-primary: #1a73e8;
  --md-sys-color-on-primary: #ffffff;
  --md-sys-color-primary-container: #d2e3fc;
  --md-sys-color-on-primary-container: #174ea6;

  /* Adjust shape */
  --md-sys-shape-medium: 8px;

  /* Adjust spacing */
  --md-sys-spacing-4: 20px;
}
```

This makes it straightforward to align `@akashjs/ui` with any brand or design system -- just set the custom properties and every component picks them up automatically.

## Next Steps

- [Design Tokens](/ui/tokens) -- full reference for every token category
- [Button](/ui/button) -- start with the most common component
- [Layout](/ui/layout) -- Grid, Stack, Divider, and Breadcrumb for page structure
