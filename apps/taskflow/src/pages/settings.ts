/**
 * Settings page — profile, appearance, language, shortcuts, about.
 */

import { signal, effect, createElement, useTheme } from '@akashjs/runtime';
import { authStore } from '../stores/auth.js';

export function renderSettingsPage(container: HTMLElement): void {
  container.innerHTML = '';

  const user = authStore.user();
  const theme = useTheme({
    themes: {
      light: { '--color-bg': '#faf8fd' },
      dark: { '--color-bg': '#141218' },
    },
    storageKey: 'taskflow-theme',
  });

  const locale = signal(localStorage.getItem('taskflow-locale') ?? 'en');

  const page = createElement('div');
  Object.assign(page.style, {
    padding: '32px',
    maxWidth: '720px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
  });

  // --- Header ---
  const h1 = createElement('h1');
  Object.assign(h1.style, {
    fontSize: 'var(--font-2xl)',
    fontWeight: '700',
    color: 'var(--color-on-surface)',
    letterSpacing: '-0.02em',
  });
  h1.textContent = 'Settings';

  // --- Profile section ---
  const profileSection = createSection('Profile');

  const profileGrid = createElement('div');
  Object.assign(profileGrid.style, {
    display: 'grid',
    gridTemplateColumns: '80px 1fr',
    gap: '20px',
    alignItems: 'start',
  });

  const avatar = createElement('div');
  Object.assign(avatar.style, {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--color-primary), var(--color-tertiary))',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    fontWeight: '700',
  });
  avatar.textContent = user?.name?.charAt(0) ?? '?';

  const profileFields = createElement('div');
  Object.assign(profileFields.style, {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  });

  profileFields.append(
    createReadonlyField('Name', user?.name ?? ''),
    createReadonlyField('Email', user?.email ?? ''),
    createReadonlyField('Role', user?.role ?? ''),
  );

  profileGrid.append(avatar, profileFields);
  profileSection.appendChild(profileGrid);

  // --- Appearance section ---
  const appearanceSection = createSection('Appearance');

  const themeRow = createElement('div');
  Object.assign(themeRow.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  });

  const themeLabel = createElement('div');
  const themeTitleEl = createElement('div');
  Object.assign(themeTitleEl.style, { fontWeight: '500', fontSize: 'var(--font-base)' });
  themeTitleEl.textContent = 'Theme';
  const themeDesc = createElement('div');
  Object.assign(themeDesc.style, { fontSize: 'var(--font-sm)', color: 'var(--color-on-surface-variant)' });
  themeDesc.textContent = 'Switch between light and dark mode.';
  themeLabel.append(themeTitleEl, themeDesc);

  // Toggle switch
  const toggle = createElement('button');
  Object.assign(toggle.style, {
    width: '52px',
    height: '28px',
    borderRadius: '14px',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background var(--transition-fast)',
    flexShrink: '0',
  });

  const toggleKnob = createElement('div');
  Object.assign(toggleKnob.style, {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    background: '#fff',
    position: 'absolute',
    top: '3px',
    transition: 'left var(--transition-fast)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  });
  toggle.appendChild(toggleKnob);

  effect(() => {
    const dark = theme.isDark();
    toggle.style.background = dark ? 'var(--color-primary)' : 'var(--color-outline-variant)';
    toggleKnob.style.left = dark ? '27px' : '3px';
  });

  toggle.addEventListener('click', () => theme.toggle());

  themeRow.append(themeLabel, toggle);
  appearanceSection.appendChild(themeRow);

  // --- Language section ---
  const langSection = createSection('Language');

  const langRow = createElement('div');
  Object.assign(langRow.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  });

  const langLabel = createElement('div');
  const langTitleEl = createElement('div');
  Object.assign(langTitleEl.style, { fontWeight: '500', fontSize: 'var(--font-base)' });
  langTitleEl.textContent = 'Locale';
  const langDesc = createElement('div');
  Object.assign(langDesc.style, { fontSize: 'var(--font-sm)', color: 'var(--color-on-surface-variant)' });
  langDesc.textContent = 'Set your preferred language.';
  langLabel.append(langTitleEl, langDesc);

  const langSelect = createElement('select') as HTMLSelectElement;
  Object.assign(langSelect.style, {
    padding: '8px 14px',
    fontSize: 'var(--font-sm)',
    minWidth: '160px',
  });

  const locales = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Espa\u00f1ol' },
    { code: 'ar', label: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629' },
  ];
  for (const loc of locales) {
    const opt = createElement('option') as HTMLOptionElement;
    opt.value = loc.code;
    opt.textContent = loc.label;
    langSelect.appendChild(opt);
  }

  effect(() => { langSelect.value = locale(); });

  langSelect.addEventListener('change', () => {
    locale.set(langSelect.value);
    localStorage.setItem('taskflow-locale', langSelect.value);
    document.documentElement.dir = langSelect.value === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = langSelect.value;
  });

  langRow.append(langLabel, langSelect);
  langSection.appendChild(langRow);

  // --- Keyboard shortcuts ---
  const shortcutsSection = createSection('Keyboard Shortcuts');

  const shortcuts = [
    { keys: 'Mod + K', description: 'Open search' },
    { keys: 'N', description: 'Create new task' },
    { keys: 'J / K', description: 'Navigate tasks down / up' },
    { keys: 'E', description: 'Edit selected task' },
    { keys: 'D', description: 'Mark as done' },
    { keys: '1-5', description: 'Switch board columns' },
    { keys: 'Esc', description: 'Close modal / clear selection' },
  ];

  const shortcutTable = createElement('div');
  Object.assign(shortcutTable.style, {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-outline-variant)',
    overflow: 'hidden',
  });

  for (let i = 0; i < shortcuts.length; i++) {
    const s = shortcuts[i];
    const row = createElement('div');
    Object.assign(row.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 16px',
      background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-container)',
    });

    const descEl = createElement('span');
    Object.assign(descEl.style, { fontSize: 'var(--font-base)', color: 'var(--color-on-surface)' });
    descEl.textContent = s.description;

    const keysEl = createElement('span');
    Object.assign(keysEl.style, {
      fontSize: 'var(--font-sm)',
      fontFamily: 'monospace',
      background: 'var(--color-surface-container-high)',
      padding: '3px 10px',
      borderRadius: 'var(--radius-sm)',
      color: 'var(--color-on-surface-variant)',
      fontWeight: '500',
    });
    keysEl.textContent = s.keys;

    row.append(descEl, keysEl);
    shortcutTable.appendChild(row);
  }

  shortcutsSection.appendChild(shortcutTable);

  // --- About section ---
  const aboutSection = createSection('About');

  const aboutGrid = createElement('div');
  Object.assign(aboutGrid.style, {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    fontSize: 'var(--font-sm)',
    color: 'var(--color-on-surface-variant)',
  });

  const aboutItems = [
    ['Application', 'TaskFlow'],
    ['Version', '0.1.0-alpha'],
    ['Built with', 'AkashJS Runtime'],
    ['License', 'MIT'],
  ];

  for (const [key, val] of aboutItems) {
    const row = createElement('div');
    Object.assign(row.style, { display: 'flex', gap: '12px' });

    const k = createElement('span');
    Object.assign(k.style, { fontWeight: '500', minWidth: '120px', color: 'var(--color-on-surface)' });
    k.textContent = key;

    const v = createElement('span');
    v.textContent = val;

    row.append(k, v);
    aboutGrid.appendChild(row);
  }

  aboutSection.appendChild(aboutGrid);

  // --- Logout button ---
  const logoutBtn = createElement('button');
  Object.assign(logoutBtn.style, {
    padding: '12px 24px',
    borderRadius: 'var(--radius-full)',
    fontSize: 'var(--font-base)',
    fontWeight: '600',
    background: 'var(--color-error-container)',
    color: 'var(--color-error)',
    border: 'none',
    cursor: 'pointer',
    alignSelf: 'flex-start',
    transition: 'opacity var(--transition-fast)',
  });
  logoutBtn.textContent = 'Logout';
  logoutBtn.addEventListener('mouseenter', () => { logoutBtn.style.opacity = '0.85'; });
  logoutBtn.addEventListener('mouseleave', () => { logoutBtn.style.opacity = '1'; });
  logoutBtn.addEventListener('click', () => authStore.logout());

  // --- Assemble ---
  page.append(h1, profileSection, appearanceSection, langSection, shortcutsSection, aboutSection, logoutBtn);
  container.appendChild(page);
}

// --- Helpers ---

function createSection(title: string): HTMLElement {
  const section = createElement('div');
  Object.assign(section.style, {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-md)',
    padding: '24px',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--color-outline-variant)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  });

  const h2 = createElement('h2');
  Object.assign(h2.style, {
    fontSize: 'var(--font-md)',
    fontWeight: '600',
    color: 'var(--color-on-surface)',
    paddingBottom: '12px',
    borderBottom: '1px solid var(--color-outline-variant)',
  });
  h2.textContent = title;
  section.appendChild(h2);

  return section;
}

function createReadonlyField(label: string, value: string): HTMLElement {
  const field = createElement('div');

  const lab = createElement('div');
  Object.assign(lab.style, {
    fontSize: 'var(--font-xs)',
    fontWeight: '500',
    color: 'var(--color-on-surface-variant)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '2px',
  });
  lab.textContent = label;

  const val = createElement('div');
  Object.assign(val.style, {
    fontSize: 'var(--font-base)',
    color: 'var(--color-on-surface)',
    fontWeight: '500',
  });
  val.textContent = value;

  field.append(lab, val);
  return field;
}
