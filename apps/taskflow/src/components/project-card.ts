/**
 * ProjectCard component — overview card for a project.
 */

import type { Project } from '../types/index.js';
import { taskStore } from '../stores/tasks.js';
import { authStore } from '../stores/auth.js';
import { projectStore } from '../stores/projects.js';

function getInitials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

export function createProjectCard(
  project: Project,
  options?: { onClick?: (project: Project) => void },
): HTMLElement {
  const card = document.createElement('div');
  Object.assign(card.style, {
    background: '#fff',
    borderRadius: '12px',
    border: '1px solid #e8e8ec',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'box-shadow 0.2s, transform 0.15s',
    display: 'flex',
    flexDirection: 'column',
  });

  card.addEventListener('mouseenter', () => {
    card.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
    card.style.transform = 'translateY(-2px)';
  });
  card.addEventListener('mouseleave', () => {
    card.style.boxShadow = 'none';
    card.style.transform = 'none';
  });

  card.addEventListener('click', () => {
    if (options?.onClick) {
      options.onClick(project);
    } else {
      projectStore.setActive(project.id);
    }
  });

  // --- Color accent bar ---
  const accentBar = document.createElement('div');
  Object.assign(accentBar.style, {
    height: '4px',
    background: project.color,
  });
  card.appendChild(accentBar);

  // --- Body ---
  const body = document.createElement('div');
  Object.assign(body.style, {
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  });

  // Icon + Name
  const titleRow = document.createElement('div');
  Object.assign(titleRow.style, {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  });

  const icon = document.createElement('span');
  icon.textContent = project.icon;
  icon.style.fontSize = '24px';
  titleRow.appendChild(icon);

  const name = document.createElement('span');
  name.textContent = project.name;
  Object.assign(name.style, {
    fontSize: '15px',
    fontWeight: '700',
    color: '#1C1B1F',
  });
  titleRow.appendChild(name);
  body.appendChild(titleRow);

  // Description
  const desc = document.createElement('p');
  desc.textContent = project.description;
  Object.assign(desc.style, {
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: '1.4',
    margin: '0',
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: '2',
    WebkitBoxOrient: 'vertical',
  });
  body.appendChild(desc);

  // Member avatars (overlapping)
  const membersRow = document.createElement('div');
  Object.assign(membersRow.style, {
    display: 'flex',
    alignItems: 'center',
  });

  project.members.forEach((memberId, i) => {
    const user = authStore.getUser(memberId);
    if (!user) return;

    const avatar = document.createElement('div');
    avatar.textContent = getInitials(user.name);
    avatar.title = user.name;
    Object.assign(avatar.style, {
      width: '28px',
      height: '28px',
      borderRadius: '50%',
      background: project.color,
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '10px',
      fontWeight: '600',
      border: '2px solid #fff',
      marginLeft: i === 0 ? '0' : '-8px',
      position: 'relative',
      zIndex: String(project.members.length - i),
    });
    membersRow.appendChild(avatar);
  });

  body.appendChild(membersRow);

  // Task counts + progress
  const projectTasks = taskStore.byProject(project.id);
  const total = projectTasks.length;
  const done = taskStore.completedCount(project.id);
  const overdue = taskStore.overdueCount(project.id);
  const progress = total > 0 ? done / total : 0;

  const statsRow = document.createElement('div');
  Object.assign(statsRow.style, {
    display: 'flex',
    gap: '12px',
    fontSize: '12px',
    color: '#6b7280',
  });

  const statItems = [
    { label: 'Total', value: total, color: '#1C1B1F' },
    { label: 'Done', value: done, color: '#10b981' },
    { label: 'Overdue', value: overdue, color: overdue > 0 ? '#ef4444' : '#6b7280' },
  ];

  statItems.forEach((stat) => {
    const item = document.createElement('span');
    item.innerHTML = `<strong style="color:${stat.color}">${stat.value}</strong> ${stat.label}`;
    item.style.whiteSpace = 'nowrap';
    statsRow.appendChild(item);
  });

  body.appendChild(statsRow);

  // Progress bar
  const progressWrap = document.createElement('div');
  Object.assign(progressWrap.style, {
    width: '100%',
    height: '6px',
    background: '#e5e7eb',
    borderRadius: '3px',
    overflow: 'hidden',
  });

  const progressFill = document.createElement('div');
  Object.assign(progressFill.style, {
    width: `${Math.round(progress * 100)}%`,
    height: '100%',
    background: project.color,
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  });
  progressWrap.appendChild(progressFill);
  body.appendChild(progressWrap);

  card.appendChild(body);
  return card;
}
