/**
 * Dashboard page — overview stats, my tasks, recent projects.
 */

import { signal, effect, createElement } from '@akashjs/runtime';
import { authStore } from '../stores/auth.js';
import { projectStore } from '../stores/projects.js';
import { taskStore } from '../stores/tasks.js';
import type { Task, TaskStatus } from '../types/index.js';
import { STATUS_LABELS, PRIORITY_LABELS, PRIORITY_COLORS } from '../types/index.js';

export function renderDashboard(container: HTMLElement): void {
  container.innerHTML = '';

  const user = authStore.user();
  const page = createElement('div');
  Object.assign(page.style, {
    padding: '32px',
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
  });

  // --- Greeting ---
  const greeting = createElement('div');
  const greetH1 = createElement('h1');
  Object.assign(greetH1.style, {
    fontSize: 'var(--font-2xl)',
    fontWeight: '700',
    color: 'var(--color-on-surface)',
    letterSpacing: '-0.02em',
  });
  greetH1.textContent = `Welcome back, ${user?.name?.split(' ')[0] ?? 'there'}`;

  const greetSub = createElement('p');
  Object.assign(greetSub.style, {
    fontSize: 'var(--font-base)',
    color: 'var(--color-on-surface-variant)',
    marginTop: '4px',
  });
  greetSub.textContent = 'Here\'s an overview of your projects and tasks.';
  greeting.append(greetH1, greetSub);

  // --- Stats row ---
  const allTasks = taskStore.tasks();
  const projects = projectStore.projects();
  const totalProjects = projects.length;
  const totalTasks = allTasks.length;
  const inProgress = allTasks.filter((t) => t.status === 'in_progress').length;
  const now = Date.now();
  const overdue = allTasks.filter((t) => t.status !== 'done' && t.dueDate !== null && t.dueDate < now).length;

  const statsRow = createElement('div');
  Object.assign(statsRow.style, {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  });

  const statConfigs = [
    { label: 'Total Projects', value: totalProjects, color: '#6750A4', icon: '📁' },
    { label: 'Total Tasks', value: totalTasks, color: '#3b82f6', icon: '📋' },
    { label: 'In Progress', value: inProgress, color: '#f59e0b', icon: '🔄' },
    { label: 'Overdue', value: overdue, color: '#ef4444', icon: '⚠️' },
  ];

  for (const stat of statConfigs) {
    const card = createElement('div');
    Object.assign(card.style, {
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-md)',
      padding: '20px',
      boxShadow: 'var(--shadow-sm)',
      border: '1px solid var(--color-outline-variant)',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      transition: 'box-shadow var(--transition-fast), transform var(--transition-fast)',
    });
    card.addEventListener('mouseenter', () => {
      card.style.boxShadow = 'var(--shadow-md)';
      card.style.transform = 'translateY(-2px)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.boxShadow = 'var(--shadow-sm)';
      card.style.transform = 'translateY(0)';
    });

    const iconCircle = createElement('div');
    Object.assign(iconCircle.style, {
      width: '44px',
      height: '44px',
      borderRadius: '12px',
      background: `${stat.color}18`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '20px',
      flexShrink: '0',
    });
    iconCircle.textContent = stat.icon;

    const textArea = createElement('div');
    const valEl = createElement('div');
    Object.assign(valEl.style, {
      fontSize: 'var(--font-xl)',
      fontWeight: '700',
      color: stat.color,
      lineHeight: '1.2',
    });
    valEl.textContent = String(stat.value);

    const labEl = createElement('div');
    Object.assign(labEl.style, {
      fontSize: 'var(--font-sm)',
      color: 'var(--color-on-surface-variant)',
    });
    labEl.textContent = stat.label;

    textArea.append(valEl, labEl);
    card.append(iconCircle, textArea);
    statsRow.appendChild(card);
  }

  // --- My Tasks section ---
  const myTasksSection = createElement('div');

  const myTasks = user
    ? allTasks.filter((t) => t.assigneeId === user.id && t.status !== 'done')
    : [];

  const myHeader = createSectionHeader('My Tasks', myTasks.length);
  myTasksSection.appendChild(myHeader);

  if (myTasks.length === 0) {
    const empty = createElement('p');
    Object.assign(empty.style, {
      color: 'var(--color-on-surface-variant)',
      fontSize: 'var(--font-base)',
      padding: '16px 0',
    });
    empty.textContent = 'No open tasks assigned to you. Nice work!';
    myTasksSection.appendChild(empty);
  } else {
    // Group by status
    const grouped: Record<string, Task[]> = {};
    for (const t of myTasks) {
      (grouped[t.status] ||= []).push(t);
    }

    const taskList = createElement('div');
    Object.assign(taskList.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      marginTop: '12px',
    });

    const statusOrder: TaskStatus[] = ['in_progress', 'review', 'todo', 'backlog'];
    for (const status of statusOrder) {
      const group = grouped[status];
      if (!group || group.length === 0) continue;

      const statusLabel = createElement('div');
      Object.assign(statusLabel.style, {
        fontSize: 'var(--font-xs)',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--color-on-surface-variant)',
        marginTop: '8px',
        marginBottom: '4px',
      });
      statusLabel.textContent = `${STATUS_LABELS[status]} (${group.length})`;
      taskList.appendChild(statusLabel);

      for (const task of group) {
        taskList.appendChild(createTaskRow(task));
      }
    }

    myTasksSection.appendChild(taskList);
  }

  // --- Recent Projects section ---
  const projectsSection = createElement('div');

  const projectHeader = createSectionHeader('Recent Projects', projects.length);
  projectsSection.appendChild(projectHeader);

  const projectGrid = createElement('div');
  Object.assign(projectGrid.style, {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
    marginTop: '12px',
  });

  for (const project of projects) {
    const pCard = createElement('div');
    Object.assign(pCard.style, {
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-md)',
      padding: '20px',
      boxShadow: 'var(--shadow-sm)',
      border: '1px solid var(--color-outline-variant)',
      cursor: 'pointer',
      transition: 'box-shadow var(--transition-fast), transform var(--transition-fast)',
    });
    pCard.addEventListener('mouseenter', () => {
      pCard.style.boxShadow = 'var(--shadow-md)';
      pCard.style.transform = 'translateY(-2px)';
    });
    pCard.addEventListener('mouseleave', () => {
      pCard.style.boxShadow = 'var(--shadow-sm)';
      pCard.style.transform = 'translateY(0)';
    });

    // Color bar
    const colorBar = createElement('div');
    Object.assign(colorBar.style, {
      width: '100%',
      height: '4px',
      borderRadius: '2px',
      background: project.color,
      marginBottom: '14px',
    });

    const pTitle = createElement('div');
    Object.assign(pTitle.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '6px',
    });

    const pIcon = createElement('span');
    pIcon.textContent = project.icon;
    pIcon.style.fontSize = '18px';

    const pName = createElement('span');
    Object.assign(pName.style, {
      fontSize: 'var(--font-md)',
      fontWeight: '600',
      color: 'var(--color-on-surface)',
    });
    pName.textContent = project.name;

    pTitle.append(pIcon, pName);

    const pDesc = createElement('p');
    Object.assign(pDesc.style, {
      fontSize: 'var(--font-sm)',
      color: 'var(--color-on-surface-variant)',
      lineHeight: '1.5',
      marginBottom: '14px',
    });
    pDesc.textContent = project.description;

    // Stat chips
    const counts = taskStore.countByStatus(project.id);
    const totalP = Object.values(counts).reduce((s, n) => s + n, 0);
    const doneP = counts.done;

    const statsLine = createElement('div');
    Object.assign(statsLine.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      fontSize: 'var(--font-xs)',
      color: 'var(--color-on-surface-variant)',
    });

    const taskChip = createElement('span');
    taskChip.textContent = `${totalP} tasks`;
    const doneChip = createElement('span');
    doneChip.style.color = 'var(--color-success)';
    doneChip.textContent = `${doneP} done`;
    const memberChip = createElement('span');
    memberChip.textContent = `${project.members.length} members`;

    statsLine.append(taskChip, createDot(), doneChip, createDot(), memberChip);

    pCard.append(colorBar, pTitle, pDesc, statsLine);
    pCard.dataset.projectId = project.id;
    projectGrid.appendChild(pCard);
  }

  projectsSection.appendChild(projectGrid);

  // --- Assemble ---
  page.append(greeting, statsRow, myTasksSection, projectsSection);
  container.appendChild(page);
}

// --- Helpers ---

function createSectionHeader(title: string, count: number): HTMLElement {
  const header = createElement('div');
  Object.assign(header.style, {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  });

  const h2 = createElement('h2');
  Object.assign(h2.style, {
    fontSize: 'var(--font-lg)',
    fontWeight: '600',
    color: 'var(--color-on-surface)',
  });
  h2.textContent = title;

  const badge = createElement('span');
  Object.assign(badge.style, {
    fontSize: 'var(--font-xs)',
    fontWeight: '600',
    background: 'var(--color-primary-container)',
    color: 'var(--color-primary)',
    borderRadius: 'var(--radius-full)',
    padding: '2px 10px',
  });
  badge.textContent = String(count);

  header.append(h2, badge);
  return header;
}

function createTaskRow(task: Task): HTMLElement {
  const row = createElement('div');
  Object.assign(row.style, {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-outline-variant)',
    transition: 'background var(--transition-fast)',
    cursor: 'pointer',
  });
  row.addEventListener('mouseenter', () => { row.style.background = 'var(--color-surface-container)'; });
  row.addEventListener('mouseleave', () => { row.style.background = 'var(--color-surface)'; });

  // Priority dot
  const dot = createElement('div');
  Object.assign(dot.style, {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: PRIORITY_COLORS[task.priority],
    flexShrink: '0',
  });

  // Title
  const title = createElement('span');
  Object.assign(title.style, {
    flex: '1',
    fontSize: 'var(--font-base)',
    color: 'var(--color-on-surface)',
    fontWeight: '500',
  });
  title.textContent = task.title;

  // Priority badge
  const pBadge = createElement('span');
  Object.assign(pBadge.style, {
    fontSize: 'var(--font-xs)',
    padding: '2px 8px',
    borderRadius: 'var(--radius-full)',
    background: `${PRIORITY_COLORS[task.priority]}18`,
    color: PRIORITY_COLORS[task.priority],
    fontWeight: '500',
  });
  pBadge.textContent = PRIORITY_LABELS[task.priority];

  // Project name
  const project = projectStore.getById(task.projectId);
  const pLabel = createElement('span');
  Object.assign(pLabel.style, {
    fontSize: 'var(--font-xs)',
    color: 'var(--color-outline)',
  });
  pLabel.textContent = project?.name ?? '';

  row.append(dot, title, pBadge, pLabel);
  return row;
}

function createDot(): HTMLElement {
  const d = createElement('span');
  Object.assign(d.style, {
    width: '3px',
    height: '3px',
    borderRadius: '50%',
    background: 'var(--color-outline-variant)',
    display: 'inline-block',
  });
  return d;
}
