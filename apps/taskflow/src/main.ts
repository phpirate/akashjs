/**
 * TaskFlow — main entry point.
 *
 * Sets up global styles, auth check, routing, keyboard shortcuts,
 * and mounts the app shell.
 */

import { signal, effect, createElement, useTheme, useKeyboard } from '@akashjs/runtime';
import { injectGlobalStyles } from './styles/global.js';
import { authStore } from './stores/auth.js';
import { projectStore } from './stores/projects.js';
import { renderLoginPage } from './pages/login.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderBoardPage } from './pages/board.js';
import { renderSettingsPage } from './pages/settings.js';

// --- Route signal (e.g. 'dashboard', 'board:p1', 'settings') ---
const route = signal('dashboard');

// --- Bootstrap ---
function main(): void {
  injectGlobalStyles();

  const appEl = document.getElementById('app');
  if (!appEl) {
    const el = createElement('div');
    el.id = 'app';
    document.body.appendChild(el);
    boot(el);
  } else {
    boot(appEl);
  }
}

function boot(root: HTMLElement): void {
  // Theme
  const theme = useTheme({
    themes: {
      light: { '--color-bg': '#faf8fd' },
      dark: { '--color-bg': '#141218' },
    },
    storageKey: 'taskflow-theme',
  });

  // Keyboard shortcuts
  const kb = useKeyboard();
  kb.bind('mod+k', () => {
    // Focus search if visible
    const search = document.querySelector<HTMLInputElement>('input[type="search"]');
    if (search) { search.focus(); search.select(); }
  }, { description: 'Focus search' });

  kb.bind('n', (e) => {
    // Only when not in an input
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    // Trigger FAB click
    const fab = document.querySelector<HTMLButtonElement>('button[title="Create new task"]');
    if (fab) fab.click();
  }, { description: 'New task', preventDefault: false });

  // Watch auth state and re-render entire app
  effect(() => {
    root.innerHTML = '';
    const loggedIn = authStore.isLoggedIn();

    if (!loggedIn) {
      renderLoginPage(root);
      return;
    }

    renderAppShell(root, theme);
  });
}

// --- App shell: sidebar + main content ---

interface ThemeHandle {
  current: () => string;
  isDark: () => boolean;
  toggle(): void;
  set(t: string): void;
}

function renderAppShell(root: HTMLElement, theme: ThemeHandle): void {
  const shell = createElement('div');
  Object.assign(shell.style, {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
  });

  // ---- Sidebar ----
  const sidebar = createElement('nav');
  Object.assign(sidebar.style, {
    width: '260px',
    background: 'var(--color-sidebar-bg)',
    borderRight: '1px solid var(--color-outline-variant)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: '0',
    transition: 'background var(--transition-normal)',
  });

  // Sidebar header
  const sidebarHeader = createElement('div');
  Object.assign(sidebarHeader.style, {
    padding: '20px 20px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  });

  const logoBox = createElement('div');
  Object.assign(logoBox.style, {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #6750A4, #3b82f6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '16px',
    fontWeight: '700',
  });
  logoBox.textContent = 'T';

  const logoText = createElement('span');
  Object.assign(logoText.style, {
    fontSize: 'var(--font-md)',
    fontWeight: '700',
    color: 'var(--color-on-surface)',
  });
  logoText.textContent = 'TaskFlow';

  sidebarHeader.append(logoBox, logoText);

  // Nav items
  const navSection = createElement('div');
  Object.assign(navSection.style, {
    padding: '0 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: '1',
  });

  // Dashboard link
  navSection.appendChild(
    createNavItem('Dashboard', '\u{1F4CA}', 'dashboard'),
  );

  // Projects label
  const projLabel = createElement('div');
  Object.assign(projLabel.style, {
    fontSize: 'var(--font-xs)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--color-outline)',
    padding: '16px 12px 6px',
  });
  projLabel.textContent = 'Projects';
  navSection.appendChild(projLabel);

  // Project links
  const projects = projectStore.projects();
  for (const p of projects) {
    navSection.appendChild(
      createNavItem(p.name, p.icon, `board:${p.id}`),
    );
  }

  // Spacer
  const spacer = createElement('div');
  spacer.style.flex = '1';
  navSection.appendChild(spacer);

  // Settings link
  navSection.appendChild(
    createNavItem('Settings', '\u2699\uFE0F', 'settings'),
  );

  // Sidebar footer — user info
  const sidebarFooter = createElement('div');
  Object.assign(sidebarFooter.style, {
    padding: '16px 20px',
    borderTop: '1px solid var(--color-outline-variant)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  });

  const user = authStore.user();
  const userAvatar = createElement('div');
  Object.assign(userAvatar.style, {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'var(--color-primary-container)',
    color: 'var(--color-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: '600',
    flexShrink: '0',
  });
  userAvatar.textContent = user?.name?.charAt(0) ?? '?';

  const userInfo = createElement('div');
  userInfo.style.overflow = 'hidden';
  const userName = createElement('div');
  Object.assign(userName.style, {
    fontSize: 'var(--font-sm)',
    fontWeight: '500',
    color: 'var(--color-on-surface)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  });
  userName.textContent = user?.name ?? '';
  const userRole = createElement('div');
  Object.assign(userRole.style, {
    fontSize: 'var(--font-xs)',
    color: 'var(--color-outline)',
  });
  userRole.textContent = user?.role ?? '';
  userInfo.append(userName, userRole);

  // Theme toggle (small)
  const themeBtn = createElement('button');
  Object.assign(themeBtn.style, {
    marginLeft: 'auto',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    background: 'var(--color-surface-container)',
    border: 'none',
    cursor: 'pointer',
    transition: 'background var(--transition-fast)',
  });
  effect(() => {
    themeBtn.textContent = theme.isDark() ? '\u2600\uFE0F' : '\uD83C\uDF19';
  });
  themeBtn.addEventListener('click', () => theme.toggle());

  sidebarFooter.append(userAvatar, userInfo, themeBtn);
  sidebar.append(sidebarHeader, navSection, sidebarFooter);

  // ---- Main area ----
  const mainArea = createElement('div');
  Object.assign(mainArea.style, {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: 'var(--color-bg)',
    transition: 'background var(--transition-normal)',
  });

  // Top header bar
  const topBar = createElement('div');
  Object.assign(topBar.style, {
    height: '56px',
    padding: '0 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid var(--color-outline-variant)',
    background: 'var(--color-surface)',
    flexShrink: '0',
  });

  const breadcrumb = createElement('div');
  Object.assign(breadcrumb.style, {
    fontSize: 'var(--font-sm)',
    fontWeight: '500',
    color: 'var(--color-on-surface-variant)',
  });

  const searchBox = createElement('div');
  Object.assign(searchBox.style, {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'var(--color-surface-container)',
    borderRadius: 'var(--radius-full)',
    padding: '6px 14px',
    cursor: 'pointer',
    fontSize: 'var(--font-sm)',
    color: 'var(--color-outline)',
    transition: 'background var(--transition-fast)',
  });
  searchBox.addEventListener('mouseenter', () => { searchBox.style.background = 'var(--color-surface-container-high)'; });
  searchBox.addEventListener('mouseleave', () => { searchBox.style.background = 'var(--color-surface-container)'; });
  searchBox.addEventListener('click', () => {
    const search = document.querySelector<HTMLInputElement>('input[type="search"]');
    if (search) { search.focus(); search.select(); }
  });
  const searchIcon = createElement('span');
  searchIcon.textContent = '\uD83D\uDD0D';
  searchIcon.style.fontSize = '13px';
  const searchLabel = createElement('span');
  searchLabel.textContent = 'Search...';
  const searchKbd = createElement('kbd');
  Object.assign(searchKbd.style, {
    fontSize: '10px',
    background: 'var(--color-surface)',
    padding: '1px 6px',
    borderRadius: '4px',
    border: '1px solid var(--color-outline-variant)',
    marginLeft: '8px',
    fontFamily: 'monospace',
  });
  searchKbd.textContent = '\u2318K';
  searchBox.append(searchIcon, searchLabel, searchKbd);

  topBar.append(breadcrumb, searchBox);

  // Page content area
  const pageContent = createElement('div');
  Object.assign(pageContent.style, {
    flex: '1',
    overflow: 'auto',
  });

  mainArea.append(topBar, pageContent);
  shell.append(sidebar, mainArea);
  root.appendChild(shell);

  // ---- Route effect — swap page content ----
  effect(() => {
    const r = route();
    pageContent.innerHTML = '';

    if (r === 'dashboard') {
      breadcrumb.textContent = 'Dashboard';
      renderDashboard(pageContent);
    } else if (r.startsWith('board:')) {
      const projectId = r.slice(6);
      const proj = projectStore.getById(projectId);
      breadcrumb.textContent = proj ? `Projects \u203A ${proj.name}` : 'Board';
      renderBoardPage(pageContent, projectId);
    } else if (r === 'settings') {
      breadcrumb.textContent = 'Settings';
      renderSettingsPage(pageContent);
    } else {
      breadcrumb.textContent = 'Dashboard';
      renderDashboard(pageContent);
    }
  });

  // Wire project card clicks to navigate to board
  pageContent.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-project-id]');
    if (target?.dataset.projectId) {
      route.set(`board:${target.dataset.projectId}`);
    }
  });
}

// --- Sidebar nav item ---

function createNavItem(label: string, icon: string, targetRoute: string): HTMLElement {
  const item = createElement('button');
  Object.assign(item.style, {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--font-base)',
    fontWeight: '500',
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    transition: 'background var(--transition-fast), color var(--transition-fast)',
  });

  const iconEl = createElement('span');
  iconEl.style.fontSize = '16px';
  iconEl.style.width = '20px';
  iconEl.style.textAlign = 'center';
  iconEl.textContent = icon;

  const labelEl = createElement('span');
  labelEl.style.flex = '1';
  labelEl.textContent = label;

  effect(() => {
    const r = route();
    const active = r === targetRoute || (targetRoute.startsWith('board:') && r === targetRoute);
    item.style.background = active ? 'var(--color-primary-container)' : 'transparent';
    item.style.color = active ? 'var(--color-primary)' : 'var(--color-on-surface-variant)';
  });

  item.addEventListener('mouseenter', () => {
    if (item.style.background === 'transparent') {
      item.style.background = 'var(--color-surface-container-high)';
    }
  });
  item.addEventListener('mouseleave', () => {
    const r = route();
    const active = r === targetRoute;
    item.style.background = active ? 'var(--color-primary-container)' : 'transparent';
  });

  item.addEventListener('click', () => route.set(targetRoute));

  item.append(iconEl, labelEl);
  return item;
}

// --- Start the app ---
main();
