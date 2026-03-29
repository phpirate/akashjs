/**
 * Global styles — CSS reset, variables, dark mode, utilities.
 *
 * Injects a <style> into document.head once. Returns the element
 * so callers can remove it if needed.
 */

let injected: HTMLStyleElement | null = null;

export function injectGlobalStyles(): HTMLStyleElement {
  if (injected) return injected;

  const style = document.createElement('style');
  style.id = 'taskflow-global';
  style.textContent = /* css */ `
/* ------------------------------------------------------------------ */
/*  Reset                                                              */
/* ------------------------------------------------------------------ */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
body { line-height: 1.5; font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
img, svg { display: block; max-width: 100%; }
input, button, textarea, select { font: inherit; color: inherit; }
a { color: inherit; text-decoration: none; }
ul, ol { list-style: none; }

/* ------------------------------------------------------------------ */
/*  Color tokens (MD3-inspired)                                        */
/* ------------------------------------------------------------------ */
:root {
  --color-primary: #6750A4;
  --color-primary-light: #7f67be;
  --color-primary-container: #EADDFF;
  --color-on-primary: #ffffff;
  --color-secondary: #625B71;
  --color-secondary-container: #E8DEF8;
  --color-tertiary: #3b82f6;
  --color-error: #B3261E;
  --color-error-container: #F9DEDC;
  --color-success: #10b981;
  --color-warning: #f59e0b;

  --color-surface: #ffffff;
  --color-surface-dim: #f4f1f9;
  --color-surface-container: #f3f0f7;
  --color-surface-container-high: #ece8f0;
  --color-surface-variant: #E7E0EC;
  --color-on-surface: #1C1B1F;
  --color-on-surface-variant: #49454F;
  --color-outline: #79747E;
  --color-outline-variant: #C4C0C9;

  --color-bg: #faf8fd;
  --color-sidebar-bg: #f3f0f7;

  --shadow-sm: 0 1px 2px rgba(0,0,0,0.06);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.12);
  --shadow-xl: 0 16px 48px rgba(0,0,0,0.16);

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  --font-xs: 0.75rem;
  --font-sm: 0.8125rem;
  --font-base: 0.875rem;
  --font-md: 1rem;
  --font-lg: 1.25rem;
  --font-xl: 1.5rem;
  --font-2xl: 2rem;

  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-normal: 250ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* ------------------------------------------------------------------ */
/*  Dark mode                                                          */
/* ------------------------------------------------------------------ */
[data-theme="dark"] {
  --color-primary: #D0BCFF;
  --color-primary-light: #b69df8;
  --color-primary-container: #4F378B;
  --color-on-primary: #381E72;
  --color-secondary: #CCC2DC;
  --color-secondary-container: #4A4458;
  --color-tertiary: #60a5fa;
  --color-error: #F2B8B5;
  --color-error-container: #8C1D18;
  --color-success: #34d399;
  --color-warning: #fbbf24;

  --color-surface: #1C1B1F;
  --color-surface-dim: #141316;
  --color-surface-container: #211F26;
  --color-surface-container-high: #2B2930;
  --color-surface-variant: #49454F;
  --color-on-surface: #E6E1E5;
  --color-on-surface-variant: #CAC4D0;
  --color-outline: #938F99;
  --color-outline-variant: #49454F;

  --color-bg: #141218;
  --color-sidebar-bg: #1C1B1F;

  --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.4);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.5);
  --shadow-xl: 0 16px 48px rgba(0,0,0,0.6);
}

/* ------------------------------------------------------------------ */
/*  Base                                                               */
/* ------------------------------------------------------------------ */
body {
  background: var(--color-bg);
  color: var(--color-on-surface);
  transition: background var(--transition-normal), color var(--transition-normal);
}

/* ------------------------------------------------------------------ */
/*  Scrollbar                                                          */
/* ------------------------------------------------------------------ */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: var(--color-outline-variant);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover { background: var(--color-outline); }

/* ------------------------------------------------------------------ */
/*  Utilities                                                          */
/* ------------------------------------------------------------------ */
.flex { display: flex; }
.flex-col { display: flex; flex-direction: column; }
.flex-center { display: flex; align-items: center; justify-content: center; }
.flex-between { display: flex; align-items: center; justify-content: space-between; }
.items-center { align-items: center; }
.flex-wrap { flex-wrap: wrap; }
.flex-1 { flex: 1; }
.grid { display: grid; }
.gap-1 { gap: 4px; }
.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }
.gap-4 { gap: 16px; }
.gap-6 { gap: 24px; }
.p-2 { padding: 8px; }
.p-3 { padding: 12px; }
.p-4 { padding: 16px; }
.p-6 { padding: 24px; }
.px-3 { padding-left: 12px; padding-right: 12px; }
.px-4 { padding-left: 16px; padding-right: 16px; }
.py-2 { padding-top: 8px; padding-bottom: 8px; }
.py-3 { padding-top: 12px; padding-bottom: 12px; }
.rounded { border-radius: var(--radius-sm); }
.rounded-md { border-radius: var(--radius-md); }
.rounded-lg { border-radius: var(--radius-lg); }
.rounded-xl { border-radius: var(--radius-xl); }
.rounded-full { border-radius: var(--radius-full); }
.shadow { box-shadow: var(--shadow-sm); }
.shadow-md { box-shadow: var(--shadow-md); }
.shadow-lg { box-shadow: var(--shadow-lg); }
.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }

/* ------------------------------------------------------------------ */
/*  Transitions                                                        */
/* ------------------------------------------------------------------ */
.transition { transition: all var(--transition-fast); }
.transition-colors { transition: color var(--transition-fast), background-color var(--transition-fast), border-color var(--transition-fast); }

/* ------------------------------------------------------------------ */
/*  Focus ring                                                         */
/* ------------------------------------------------------------------ */
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* ------------------------------------------------------------------ */
/*  Button reset                                                       */
/* ------------------------------------------------------------------ */
button {
  cursor: pointer;
  border: none;
  background: none;
}

/* ------------------------------------------------------------------ */
/*  Input base                                                         */
/* ------------------------------------------------------------------ */
input[type="text"],
input[type="email"],
input[type="password"],
input[type="search"],
select {
  background: var(--color-surface);
  border: 1px solid var(--color-outline-variant);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  font-size: var(--font-base);
  color: var(--color-on-surface);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
input:focus, select:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(103, 80, 164, 0.15);
  outline: none;
}
`;

  document.head.appendChild(style);
  injected = style;
  return style;
}
