# Dark Mode

## Problem

You need a theme toggle that respects system preference, persists the user's choice, and smoothly transitions between light and dark with CSS variables.

## Solution

Use `useTheme` from `@akashjs/runtime` for signal-based theme management with automatic system preference detection.

### 1. Theme Setup

```ts
// src/theme.ts
import { useTheme } from '@akashjs/runtime';

export const theme = useTheme({
  themes: {
    light: {
      '--color-bg': '#ffffff',
      '--color-surface': '#f5f5f5',
      '--color-text': '#1a1a1a',
      '--color-text-muted': '#666666',
      '--color-primary': '#6750a4',
      '--color-primary-text': '#ffffff',
      '--color-border': '#e0e0e0',
      '--color-shadow': 'rgba(0, 0, 0, 0.1)',
    },
    dark: {
      '--color-bg': '#121212',
      '--color-surface': '#1e1e1e',
      '--color-text': '#e0e0e0',
      '--color-text-muted': '#999999',
      '--color-primary': '#d0bcff',
      '--color-primary-text': '#381e72',
      '--color-border': '#333333',
      '--color-shadow': 'rgba(0, 0, 0, 0.4)',
    },
  },
  storageKey: 'akash-theme',
  syncSystem: true,
});
```

### 2. Global CSS

```css
/* src/styles/global.css */

/* Smooth transitions between themes */
html {
  background-color: var(--color-bg);
  color: var(--color-text);
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* Apply transitions to common elements */
body, .card, .sidebar, nav, button, input {
  transition: background-color 0.3s ease,
              color 0.3s ease,
              border-color 0.3s ease,
              box-shadow 0.3s ease;
}

/* Use variables everywhere */
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: 0 2px 8px var(--color-shadow);
  border-radius: 12px;
  padding: 1.5rem;
}

.text-muted {
  color: var(--color-text-muted);
}

.btn-primary {
  background: var(--color-primary);
  color: var(--color-primary-text);
}
```

::: tip
Put transitions on `html` and key elements, not on `*`. Wildcard transitions cause layout jank and hurt performance.
:::

### 3. Toggle Component

```ts
// src/components/ThemeToggle.ts
import { theme } from '../theme';

function ThemeToggle() {
  return () => {
    const isDark = theme.isDark();
    return `
      <button
        @click={theme.toggle}
        class="theme-toggle"
        aria-label="${isDark ? 'Switch to light mode' : 'Switch to dark mode'}"
        title="${isDark ? 'Light mode' : 'Dark mode'}"
      >
        <span class="icon">${isDark ? '☀️' : '🌙'}</span>
      </button>
    `;
  };
}
```

```css
.theme-toggle {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 9999px;
  padding: 0.5rem;
  cursor: pointer;
  font-size: 1.25rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
}
```

### 4. Three-Way Toggle (Light / System / Dark)

```ts
function ThemeSelector() {
  return () => {
    const current = theme.current();
    return `
      <div class="theme-selector" role="radiogroup" aria-label="Theme">
        <button role="radio" aria-checked="${current === 'light'}"
                @click={() => theme.set('light')}>Light</button>
        <button role="radio" aria-checked="${current !== 'light' && current !== 'dark'}"
                @click={() => theme.setSystem()}>System</button>
        <button role="radio" aria-checked="${current === 'dark'}"
                @click={() => theme.set('dark')}>Dark</button>
      </div>
    `;
  };
}
```

::: info
`theme.setSystem()` clears the persisted preference and reverts to matching the OS setting. The `syncSystem: true` option keeps it reactive when the user changes their OS theme.
:::

### 5. Material Design Token Integration

```ts
// Map Material Design 3 tokens to your theme
export const theme = useTheme({
  themes: {
    light: {
      '--md-sys-color-primary': '#6750a4',
      '--md-sys-color-on-primary': '#ffffff',
      '--md-sys-color-surface': '#fffbfe',
      '--md-sys-color-on-surface': '#1c1b1f',
      '--md-sys-color-surface-variant': '#e7e0ec',
      '--md-sys-color-outline': '#79747e',
    },
    dark: {
      '--md-sys-color-primary': '#d0bcff',
      '--md-sys-color-on-primary': '#381e72',
      '--md-sys-color-surface': '#1c1b1f',
      '--md-sys-color-on-surface': '#e6e1e5',
      '--md-sys-color-surface-variant': '#49454f',
      '--md-sys-color-outline': '#938f99',
    },
  },
});
```

::: warning
Avoid reading `theme.isDark()` inside CSS. Use CSS variables for all color values so the theme switch only needs to update variable values, not re-render components.
:::

## Result

A dark mode system where the toggle persists to localStorage, respects OS preference on first visit, transitions smoothly with CSS, and works with any design token system including Material Design 3.
