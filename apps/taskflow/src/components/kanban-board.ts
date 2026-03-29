/**
 * KanbanBoard component — multi-column board with drag-and-drop task cards.
 */

import { effect } from '@akashjs/runtime';
import { BOARD_COLUMNS } from '../types/index.js';
import type { TaskStatus } from '../types/index.js';
import { taskStore } from '../stores/tasks.js';
import { createTaskCard } from './task-card.js';

// --- Drag state ---
let draggedTaskId: string | null = null;
let draggedElement: HTMLElement | null = null;
let dragPlaceholder: HTMLElement | null = null;

function createPlaceholder(): HTMLElement {
  const el = document.createElement('div');
  Object.assign(el.style, {
    height: '60px',
    borderRadius: '10px',
    border: '2px dashed #6750A4',
    background: 'rgba(103, 80, 164, 0.06)',
    transition: 'all 0.15s ease',
    margin: '4px 0',
  });
  return el;
}

export function createKanbanBoard(
  container: HTMLElement,
  projectId: string,
  options?: {
    onTaskClick?: (taskId: string) => void;
    onAddTask?: (status: TaskStatus) => void;
  },
): HTMLElement {
  const board = document.createElement('div');
  Object.assign(board.style, {
    display: 'flex',
    gap: '16px',
    padding: '20px 24px',
    flex: '1',
    overflowX: 'auto',
    overflowY: 'hidden',
    background: '#fafafa',
    alignItems: 'flex-start',
  });

  const renderBoard = () => {
    board.innerHTML = '';

    BOARD_COLUMNS.forEach((col) => {
      const tasks = taskStore.byStatus(projectId, col.status);

      const column = document.createElement('div');
      column.dataset.status = col.status;
      Object.assign(column.style, {
        flex: '1',
        minWidth: '260px',
        maxWidth: '320px',
        display: 'flex',
        flexDirection: 'column',
        background: '#f3f4f6',
        borderRadius: '12px',
        maxHeight: '100%',
        overflow: 'hidden',
        transition: 'background 0.2s',
      });

      // --- Drop zone handling ---
      column.addEventListener('dragover', (e: DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        column.style.background = '#e8e5f0';

        const taskList = column.querySelector('[data-task-list]') as HTMLElement;
        if (!taskList || !dragPlaceholder) return;

        if (dragPlaceholder.parentNode !== taskList) {
          dragPlaceholder.remove();
        }
        if (!dragPlaceholder.parentNode) {
          const cards = Array.from(taskList.querySelectorAll('[data-task-id]'));
          const mouseY = e.clientY;
          let inserted = false;

          for (const card of cards) {
            const rect = card.getBoundingClientRect();
            if (mouseY < rect.top + rect.height / 2) {
              taskList.insertBefore(dragPlaceholder, card);
              inserted = true;
              break;
            }
          }
          if (!inserted) {
            taskList.appendChild(dragPlaceholder);
          }
        }
      });

      column.addEventListener('dragleave', (e: DragEvent) => {
        const related = e.relatedTarget as HTMLElement | null;
        if (!related || !column.contains(related)) {
          column.style.background = '#f3f4f6';
          if (dragPlaceholder?.parentNode) {
            dragPlaceholder.remove();
          }
        }
      });

      column.addEventListener('drop', (e: DragEvent) => {
        e.preventDefault();
        column.style.background = '#f3f4f6';

        if (dragPlaceholder?.parentNode) {
          dragPlaceholder.remove();
        }

        if (draggedTaskId) {
          taskStore.moveToStatus(draggedTaskId, col.status as TaskStatus);
          draggedTaskId = null;
        }
      });

      // --- Color bar ---
      const colorBar = document.createElement('div');
      Object.assign(colorBar.style, {
        height: '3px',
        background: col.color,
        borderRadius: '12px 12px 0 0',
      });
      column.appendChild(colorBar);

      // --- Column header ---
      const header = document.createElement('div');
      Object.assign(header.style, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 14px 10px',
      });

      const headerLeft = document.createElement('div');
      Object.assign(headerLeft.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      });

      const label = document.createElement('span');
      label.textContent = col.label;
      Object.assign(label.style, {
        fontSize: '13px',
        fontWeight: '600',
        color: '#1C1B1F',
      });
      headerLeft.appendChild(label);

      const countBadge = document.createElement('span');
      countBadge.textContent = String(tasks.length);
      Object.assign(countBadge.style, {
        fontSize: '11px',
        fontWeight: '600',
        color: '#6b7280',
        background: '#e5e7eb',
        padding: '1px 7px',
        borderRadius: '10px',
      });
      headerLeft.appendChild(countBadge);

      header.appendChild(headerLeft);
      column.appendChild(header);

      // --- Task list (scrollable, drop target) ---
      const taskList = document.createElement('div');
      taskList.dataset.taskList = col.status;
      Object.assign(taskList.style, {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '0 10px',
        overflowY: 'auto',
        flex: '1',
        minHeight: '40px',
        paddingBottom: '8px',
      });

      tasks.forEach((task) => {
        const card = createTaskCard(task, {
          onClick: () => options?.onTaskClick?.(task.id),
        });

        // --- Make card draggable ---
        card.draggable = true;
        card.dataset.taskId = task.id;
        card.style.cursor = 'grab';

        card.addEventListener('dragstart', (e: DragEvent) => {
          draggedTaskId = task.id;
          draggedElement = card;
          dragPlaceholder = createPlaceholder();

          card.style.opacity = '0.4';
          card.style.cursor = 'grabbing';
          if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', task.id);
          }
        });

        card.addEventListener('dragend', () => {
          card.style.opacity = '1';
          card.style.cursor = 'grab';
          if (dragPlaceholder?.parentNode) {
            dragPlaceholder.remove();
          }
          draggedTaskId = null;
          draggedElement = null;
          dragPlaceholder = null;

          board.querySelectorAll('[data-status]').forEach((c) => {
            (c as HTMLElement).style.background = '#f3f4f6';
          });
        });

        taskList.appendChild(card);
      });

      column.appendChild(taskList);

      // --- Add task button ---
      const addBtn = document.createElement('button');
      addBtn.textContent = '+ Add task';
      Object.assign(addBtn.style, {
        margin: '8px 10px 12px',
        padding: '8px',
        borderRadius: '8px',
        border: '1px dashed #d1d5db',
        background: 'transparent',
        color: '#6b7280',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: '500',
        transition: 'background 0.15s, color 0.15s, border-color 0.15s',
        fontFamily: 'inherit',
      });
      addBtn.addEventListener('mouseenter', () => {
        addBtn.style.background = '#e5e7eb';
        addBtn.style.color = '#374151';
        addBtn.style.borderColor = '#9ca3af';
      });
      addBtn.addEventListener('mouseleave', () => {
        addBtn.style.background = 'transparent';
        addBtn.style.color = '#6b7280';
        addBtn.style.borderColor = '#d1d5db';
      });
      addBtn.addEventListener('click', () => {
        options?.onAddTask?.(col.status);
      });
      column.appendChild(addBtn);

      board.appendChild(column);
    });
  };

  effect(() => {
    taskStore.tasks();
    renderBoard();
  });

  container.appendChild(board);
  return board;
}
