/**
 * TaskCard component — compact card for board/list views.
 */

import type { Task } from '../types/index.js';
import { PRIORITY_COLORS } from '../types/index.js';
import { taskStore } from '../stores/tasks.js';
import { authStore } from '../stores/auth.js';

export interface TaskCardOptions {
  onClick?: (task: Task) => void;
  compact?: boolean;
}

function formatDueDate(dueDate: number | null): { text: string; color: string } {
  if (dueDate === null) return { text: '', color: '#6b7280' };

  const now = Date.now();
  const diff = dueDate - now;
  const days = Math.ceil(diff / 86400000);

  if (days < 0) return { text: `${Math.abs(days)}d overdue`, color: '#ef4444' };
  if (days === 0) return { text: 'Due today', color: '#f59e0b' };
  if (days === 1) return { text: 'Tomorrow', color: '#f59e0b' };
  if (days <= 7) return { text: `${days} days left`, color: '#6b7280' };
  return { text: `${days} days left`, color: '#6b7280' };
}

function getInitials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

export function createTaskCard(task: Task, options?: TaskCardOptions): HTMLElement {
  const card = document.createElement('div');
  Object.assign(card.style, {
    background: '#fff',
    borderRadius: '10px',
    border: '1px solid #e8e8ec',
    padding: '14px',
    cursor: 'pointer',
    transition: 'box-shadow 0.2s, transform 0.15s',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  });

  card.addEventListener('mouseenter', () => {
    card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
    card.style.transform = 'translateY(-1px)';
  });
  card.addEventListener('mouseleave', () => {
    card.style.boxShadow = 'none';
    card.style.transform = 'none';
  });

  if (options?.onClick) {
    card.addEventListener('click', () => options.onClick!(task));
  }

  // --- Top row: priority dot + title ---
  const titleRow = document.createElement('div');
  Object.assign(titleRow.style, {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
  });

  const priorityDot = document.createElement('span');
  Object.assign(priorityDot.style, {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: PRIORITY_COLORS[task.priority],
    flexShrink: '0',
    marginTop: '5px',
  });
  titleRow.appendChild(priorityDot);

  const title = document.createElement('span');
  title.textContent = task.title;
  Object.assign(title.style, {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1C1B1F',
    lineHeight: '1.4',
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: '2',
    WebkitBoxOrient: 'vertical',
  });
  titleRow.appendChild(title);
  card.appendChild(titleRow);

  // --- Labels ---
  if (task.labels.length > 0) {
    const labelsRow = document.createElement('div');
    Object.assign(labelsRow.style, {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '4px',
    });

    const allLabels = taskStore.labels();
    task.labels.forEach((labelId) => {
      const labelDef = allLabels.find((l) => l.id === labelId);
      if (!labelDef) return;

      const chip = document.createElement('span');
      chip.textContent = labelDef.name;
      Object.assign(chip.style, {
        fontSize: '10px',
        fontWeight: '500',
        padding: '2px 8px',
        borderRadius: '10px',
        background: labelDef.color + '18',
        color: labelDef.color,
        whiteSpace: 'nowrap',
      });
      labelsRow.appendChild(chip);
    });

    card.appendChild(labelsRow);
  }

  // --- Bottom row: assignee + due date ---
  const bottomRow = document.createElement('div');
  Object.assign(bottomRow.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  });

  // Assignee
  if (task.assigneeId) {
    const user = authStore.getUser(task.assigneeId);
    if (user) {
      const avatarCircle = document.createElement('div');
      avatarCircle.textContent = getInitials(user.name);
      Object.assign(avatarCircle.style, {
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        background: '#6750A4',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '10px',
        fontWeight: '600',
        flexShrink: '0',
      });
      avatarCircle.title = user.name;
      bottomRow.appendChild(avatarCircle);
    }
  } else {
    const spacer = document.createElement('div');
    bottomRow.appendChild(spacer);
  }

  // Due date
  const due = formatDueDate(task.dueDate);
  if (due.text) {
    const dueEl = document.createElement('span');
    dueEl.textContent = due.text;
    Object.assign(dueEl.style, {
      fontSize: '11px',
      color: due.color,
      fontWeight: due.color === '#ef4444' ? '600' : '400',
      whiteSpace: 'nowrap',
    });
    bottomRow.appendChild(dueEl);
  }

  card.appendChild(bottomRow);

  return card;
}
