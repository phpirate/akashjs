/**
 * Header component — breadcrumb, search, view toggle, user menu.
 */

import { signal, effect, useClickOutside } from '@akashjs/runtime';
import { projectStore } from '../stores/projects.js';
import { authStore } from '../stores/auth.js';

const searchText = signal('');
const activeView = signal<'board' | 'list'>('board');

export { searchText, activeView };

export function createHeader(
  container: HTMLElement,
  options?: {
    onSearch?: (query: string) => void;
    onViewChange?: (view: 'board' | 'list') => void;
  },
): HTMLElement {
  const header = document.createElement('header');
  Object.assign(header.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 24px',
    background: '#fff',
    borderBottom: '1px solid #e5e5e5',
    height: '56px',
    gap: '16px',
    flexShrink: '0',
  });

  // --- Left: Breadcrumb ---
  const breadcrumb = document.createElement('div');
  Object.assign(breadcrumb.style, {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#1C1B1F',
    minWidth: '0',
  });

  const updateBreadcrumb = () => {
    breadcrumb.innerHTML = '';
    const project = projectStore.activeProject();
    const base = document.createElement('span');
    base.textContent = 'Projects';
    base.style.color = '#6b7280';
    base.style.cursor = 'pointer';
    breadcrumb.appendChild(base);

    if (project) {
      const sep = document.createElement('span');
      sep.textContent = '/';
      sep.style.color = '#d1d5db';
      breadcrumb.appendChild(sep);

      const name = document.createElement('span');
      name.textContent = project.name;
      name.style.fontWeight = '600';
      breadcrumb.appendChild(name);
    }
  };

  updateBreadcrumb();
  // Re-render breadcrumb when active project changes
  effect(() => {
    projectStore.activeProject();
    updateBreadcrumb();
  });

  header.appendChild(breadcrumb);

  // --- Center: Search ---
  const searchWrap = document.createElement('div');
  Object.assign(searchWrap.style, {
    display: 'flex',
    alignItems: 'center',
    background: '#f3f4f6',
    borderRadius: '8px',
    padding: '0 12px',
    flex: '0 1 320px',
    height: '36px',
  });

  const searchIcon = document.createElement('span');
  searchIcon.textContent = '\uD83D\uDD0D';
  searchIcon.style.fontSize = '14px';
  searchIcon.style.marginRight = '8px';
  searchIcon.style.opacity = '0.5';
  searchWrap.appendChild(searchIcon);

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search tasks...';
  Object.assign(searchInput.style, {
    border: 'none',
    background: 'transparent',
    outline: 'none',
    fontSize: '13px',
    color: '#1C1B1F',
    width: '100%',
    fontFamily: 'inherit',
  });
  searchInput.addEventListener('input', () => {
    searchText.set(searchInput.value);
    options?.onSearch?.(searchInput.value);
  });
  searchWrap.appendChild(searchInput);
  header.appendChild(searchWrap);

  // --- Right section ---
  const rightSection = document.createElement('div');
  Object.assign(rightSection.style, {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  });

  // --- View toggle ---
  const viewToggle = document.createElement('div');
  Object.assign(viewToggle.style, {
    display: 'flex',
    background: '#f3f4f6',
    borderRadius: '8px',
    overflow: 'hidden',
  });

  const views: Array<{ id: 'board' | 'list'; label: string }> = [
    { id: 'board', label: 'Board' },
    { id: 'list', label: 'List' },
  ];

  const viewButtons: HTMLButtonElement[] = [];

  views.forEach((v) => {
    const btn = document.createElement('button');
    btn.textContent = v.label;
    Object.assign(btn.style, {
      padding: '6px 14px',
      border: 'none',
      fontSize: '12px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'background 0.15s, color 0.15s',
      fontFamily: 'inherit',
    });

    const applyActive = () => {
      const isActive = activeView() === v.id;
      btn.style.background = isActive ? '#6750A4' : 'transparent';
      btn.style.color = isActive ? '#fff' : '#6b7280';
    };
    applyActive();

    btn.addEventListener('click', () => {
      activeView.set(v.id);
      viewButtons.forEach((b) => b.dispatchEvent(new CustomEvent('viewchange')));
      options?.onViewChange?.(v.id);
    });

    btn.addEventListener('viewchange', applyActive);
    viewButtons.push(btn);
    viewToggle.appendChild(btn);
  });

  rightSection.appendChild(viewToggle);

  // --- Notification bell ---
  const bell = document.createElement('button');
  Object.assign(bell.style, {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    transition: 'background 0.15s',
  });
  bell.textContent = '\uD83D\uDD14';
  bell.addEventListener('mouseenter', () => { bell.style.background = '#f3f4f6'; });
  bell.addEventListener('mouseleave', () => { bell.style.background = 'transparent'; });

  // Notification badge
  const badge = document.createElement('span');
  Object.assign(badge.style, {
    position: 'absolute',
    top: '4px',
    right: '4px',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#ef4444',
  });
  bell.appendChild(badge);
  rightSection.appendChild(bell);

  // --- User avatar + dropdown ---
  const userWrap = document.createElement('div');
  Object.assign(userWrap.style, {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '8px',
    transition: 'background 0.15s',
  });
  userWrap.addEventListener('mouseenter', () => { userWrap.style.background = '#f3f4f6'; });
  userWrap.addEventListener('mouseleave', () => {
    userWrap.style.background = 'transparent';
    dropdown.style.display = 'none';
  });

  const avatar = document.createElement('div');
  const user = authStore.user();
  const initials = user
    ? user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '??';
  avatar.textContent = initials;
  Object.assign(avatar.style, {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: '#6750A4',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '600',
  });
  userWrap.appendChild(avatar);

  const userName = document.createElement('span');
  userName.textContent = user?.name ?? 'Guest';
  userName.style.fontSize = '13px';
  userName.style.fontWeight = '500';
  userName.style.color = '#1C1B1F';
  userWrap.appendChild(userName);

  // Dropdown
  const dropdown = document.createElement('div');
  Object.assign(dropdown.style, {
    position: 'absolute',
    top: '100%',
    right: '0',
    marginTop: '4px',
    background: '#fff',
    border: '1px solid #e5e5e5',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    padding: '4px',
    display: 'none',
    zIndex: '100',
    minWidth: '140px',
  });

  const logoutBtn = document.createElement('button');
  logoutBtn.textContent = 'Log out';
  Object.assign(logoutBtn.style, {
    display: 'block',
    width: '100%',
    padding: '8px 12px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '13px',
    textAlign: 'left',
    borderRadius: '6px',
    color: '#ef4444',
    fontFamily: 'inherit',
    transition: 'background 0.15s',
  });
  logoutBtn.addEventListener('mouseenter', () => { logoutBtn.style.background = '#fef2f2'; });
  logoutBtn.addEventListener('mouseleave', () => { logoutBtn.style.background = 'transparent'; });
  logoutBtn.addEventListener('click', () => { authStore.logout(); });
  dropdown.appendChild(logoutBtn);

  userWrap.addEventListener('click', () => {
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
  });

  userWrap.appendChild(dropdown);

  // Close dropdown when clicking outside the user menu
  useClickOutside(userWrap, () => {
    dropdown.style.display = 'none';
  });

  rightSection.appendChild(userWrap);

  header.appendChild(rightSection);
  container.appendChild(header);
  return header;
}
