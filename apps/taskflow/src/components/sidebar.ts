/**
 * Sidebar component — navigation, project list, collapse toggle.
 */

import { signal, effect } from '@akashjs/runtime';
import { projectStore } from '../stores/projects.js';

const collapsed = signal(false);

export function createSidebar(container: HTMLElement): HTMLElement {
  const sidebar = document.createElement('aside');

  const applyStyles = () => {
    Object.assign(sidebar.style, {
      width: collapsed() ? '60px' : '260px',
      minWidth: collapsed() ? '60px' : '260px',
      height: '100vh',
      background: '#1e1e2e',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s ease, min-width 0.2s ease',
      overflow: 'hidden',
      position: 'relative',
      flexShrink: '0',
    });
  };

  applyStyles();

  // --- Logo ---
  const logo = document.createElement('div');
  Object.assign(logo.style, {
    padding: '20px 16px',
    fontSize: '20px',
    fontWeight: '700',
    letterSpacing: '-0.5px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    whiteSpace: 'nowrap',
  });
  const logoIcon = document.createElement('span');
  logoIcon.textContent = '\u26A1';
  logoIcon.style.fontSize = '22px';
  logo.appendChild(logoIcon);
  const logoText = document.createElement('span');
  logoText.textContent = 'TaskFlow';
  logo.appendChild(logoText);
  sidebar.appendChild(logo);

  // --- Navigation ---
  const nav = document.createElement('nav');
  Object.assign(nav.style, {
    padding: '12px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  });

  const navItems = [
    { label: 'Dashboard', icon: '\u25A6' },
    { label: 'My Tasks', icon: '\u2713' },
  ];

  navItems.forEach((item) => {
    const link = document.createElement('a');
    link.href = '#';
    Object.assign(link.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '10px 12px',
      borderRadius: '8px',
      color: 'rgba(255,255,255,0.7)',
      textDecoration: 'none',
      fontSize: '14px',
      whiteSpace: 'nowrap',
      transition: 'background 0.15s, color 0.15s',
    });
    link.addEventListener('mouseenter', () => {
      link.style.background = 'rgba(255,255,255,0.08)';
      link.style.color = '#fff';
    });
    link.addEventListener('mouseleave', () => {
      link.style.background = 'transparent';
      link.style.color = 'rgba(255,255,255,0.7)';
    });

    const icon = document.createElement('span');
    icon.textContent = item.icon;
    icon.style.fontSize = '16px';
    icon.style.width = '20px';
    icon.style.textAlign = 'center';
    link.appendChild(icon);

    const label = document.createElement('span');
    label.textContent = item.label;
    link.appendChild(label);

    nav.appendChild(link);
  });

  sidebar.appendChild(nav);

  // --- Projects section ---
  const projectsSection = document.createElement('div');
  Object.assign(projectsSection.style, {
    flex: '1',
    padding: '0 8px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  });

  const projectsHeader = document.createElement('div');
  Object.assign(projectsHeader.style, {
    padding: '12px 12px 8px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: 'rgba(255,255,255,0.4)',
    whiteSpace: 'nowrap',
  });
  projectsHeader.textContent = 'Projects';
  projectsSection.appendChild(projectsHeader);

  const projectList = document.createElement('div');
  Object.assign(projectList.style, {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  });

  const renderProjects = () => {
    projectList.innerHTML = '';
    const projects = projectStore.projects();
    const activeId = projectStore.activeProjectId();

    projects.forEach((project) => {
      const item = document.createElement('button');
      const isActive = project.id === activeId;
      Object.assign(item.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 12px',
        borderRadius: '8px',
        border: 'none',
        background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
        color: isActive ? '#fff' : 'rgba(255,255,255,0.7)',
        cursor: 'pointer',
        fontSize: '13px',
        textAlign: 'left',
        width: '100%',
        whiteSpace: 'nowrap',
        transition: 'background 0.15s',
        fontFamily: 'inherit',
      });

      item.addEventListener('mouseenter', () => {
        if (!isActive) item.style.background = 'rgba(255,255,255,0.08)';
      });
      item.addEventListener('mouseleave', () => {
        if (!isActive) item.style.background = 'transparent';
      });

      item.addEventListener('click', () => {
        projectStore.setActive(project.id);
        renderProjects();
      });

      const dot = document.createElement('span');
      Object.assign(dot.style, {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: project.color,
        flexShrink: '0',
      });
      item.appendChild(dot);

      const name = document.createElement('span');
      name.textContent = project.name;
      name.style.overflow = 'hidden';
      name.style.textOverflow = 'ellipsis';
      item.appendChild(name);

      projectList.appendChild(item);
    });
  };

  renderProjects();
  projectsSection.appendChild(projectList);
  sidebar.appendChild(projectsSection);

  // --- New Project button ---
  const newProjectBtn = document.createElement('button');
  Object.assign(newProjectBtn.style, {
    margin: '8px',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px dashed rgba(255,255,255,0.2)',
    background: 'transparent',
    color: 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    whiteSpace: 'nowrap',
    transition: 'border-color 0.15s, color 0.15s',
    fontFamily: 'inherit',
  });
  newProjectBtn.addEventListener('mouseenter', () => {
    newProjectBtn.style.borderColor = 'rgba(255,255,255,0.4)';
    newProjectBtn.style.color = '#fff';
  });
  newProjectBtn.addEventListener('mouseleave', () => {
    newProjectBtn.style.borderColor = 'rgba(255,255,255,0.2)';
    newProjectBtn.style.color = 'rgba(255,255,255,0.6)';
  });
  const plusIcon = document.createElement('span');
  plusIcon.textContent = '+';
  plusIcon.style.fontSize = '16px';
  newProjectBtn.appendChild(plusIcon);
  const btnLabel = document.createElement('span');
  btnLabel.textContent = 'New Project';
  newProjectBtn.appendChild(btnLabel);
  sidebar.appendChild(newProjectBtn);

  // --- Collapse toggle ---
  const toggle = document.createElement('button');
  Object.assign(toggle.style, {
    padding: '12px 16px',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    border: 'none',
    borderTopStyle: 'solid',
    borderTopWidth: '1px',
    borderTopColor: 'rgba(255,255,255,0.08)',
    background: 'transparent',
    color: 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.15s',
    fontFamily: 'inherit',
  });
  toggle.addEventListener('mouseenter', () => { toggle.style.color = '#fff'; });
  toggle.addEventListener('mouseleave', () => { toggle.style.color = 'rgba(255,255,255,0.5)'; });

  const updateToggle = () => {
    toggle.textContent = collapsed() ? '\u25B6' : '\u25C0';
  };
  updateToggle();

  toggle.addEventListener('click', () => {
    collapsed.set(!collapsed());
    applyStyles();
    updateToggle();
    // Toggle text visibility
    const textEls = sidebar.querySelectorAll('span:not(:first-child)');
    textEls.forEach((el) => {
      (el as HTMLElement).style.display = collapsed() ? 'none' : '';
    });
    logoText.style.display = collapsed() ? 'none' : '';
    projectsHeader.style.display = collapsed() ? 'none' : '';
    btnLabel.style.display = collapsed() ? 'none' : '';
  });

  sidebar.appendChild(toggle);
  container.appendChild(sidebar);
  return sidebar;
}
