/**
 * Board page — Kanban board / list view for a single project.
 */

import { signal, effect, computed, createElement, createDataTable } from '@akashjs/runtime';
import type { ColumnDef } from '@akashjs/runtime';
import { authStore } from '../stores/auth.js';
import { projectStore } from '../stores/projects.js';
import { taskStore } from '../stores/tasks.js';
import type { Task, TaskStatus, TaskPriority } from '../types/index.js';
import {
  BOARD_COLUMNS,
  STATUS_LABELS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
} from '../types/index.js';

type ViewMode = 'board' | 'list';

export function renderBoardPage(container: HTMLElement, projectId: string): void {
  container.innerHTML = '';

  const project = projectStore.getById(projectId);
  if (!project) {
    const msg = createElement('div');
    Object.assign(msg.style, { padding: '48px', textAlign: 'center', color: 'var(--color-on-surface-variant)' });
    msg.textContent = 'Project not found.';
    container.appendChild(msg);
    return;
  }

  // --- Signals ---
  const viewMode = signal<ViewMode>('board');
  const searchQuery = signal('');
  const statusFilter = signal<TaskStatus | ''>('');
  const priorityFilter = signal<TaskPriority | ''>('');
  const assigneeFilter = signal<string>('');
  const sortCol = signal<string>('');
  const sortDir = signal<'asc' | 'desc'>('asc');

  // --- Page wrapper ---
  const page = createElement('div');
  Object.assign(page.style, {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  });

  // --- Project header ---
  const header = createElement('div');
  Object.assign(header.style, {
    padding: '24px 32px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    flexShrink: '0',
  });

  const topRow = createElement('div');
  Object.assign(topRow.style, { display: 'flex', alignItems: 'center', gap: '12px' });

  const icon = createElement('span');
  icon.textContent = project.icon;
  icon.style.fontSize = '24px';

  const titleArea = createElement('div');
  titleArea.style.flex = '1';
  const h1 = createElement('h1');
  Object.assign(h1.style, {
    fontSize: 'var(--font-xl)',
    fontWeight: '700',
    color: 'var(--color-on-surface)',
  });
  h1.textContent = project.name;
  const desc = createElement('p');
  Object.assign(desc.style, {
    fontSize: 'var(--font-sm)',
    color: 'var(--color-on-surface-variant)',
    marginTop: '2px',
  });
  desc.textContent = `${project.description} \u00B7 ${project.members.length} members`;
  titleArea.append(h1, desc);
  topRow.append(icon, titleArea);

  // --- View tabs + filter bar ---
  const controlRow = createElement('div');
  Object.assign(controlRow.style, {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    paddingBottom: '16px',
    borderBottom: '1px solid var(--color-outline-variant)',
  });

  // View toggle
  const tabGroup = createElement('div');
  Object.assign(tabGroup.style, {
    display: 'flex',
    background: 'var(--color-surface-container)',
    borderRadius: 'var(--radius-full)',
    padding: '3px',
  });

  function createTab(label: string, mode: ViewMode): HTMLElement {
    const btn = createElement('button');
    Object.assign(btn.style, {
      padding: '6px 16px',
      borderRadius: 'var(--radius-full)',
      fontSize: 'var(--font-sm)',
      fontWeight: '500',
      border: 'none',
      cursor: 'pointer',
      transition: 'all var(--transition-fast)',
    });
    btn.textContent = label;
    btn.addEventListener('click', () => viewMode.set(mode));

    effect(() => {
      const active = viewMode() === mode;
      btn.style.background = active ? 'var(--color-surface)' : 'transparent';
      btn.style.color = active ? 'var(--color-primary)' : 'var(--color-on-surface-variant)';
      btn.style.boxShadow = active ? 'var(--shadow-sm)' : 'none';
    });
    return btn;
  }

  tabGroup.append(createTab('Board', 'board'), createTab('List', 'list'));

  // Search input
  const searchInput = createElement('input') as HTMLInputElement;
  searchInput.type = 'search';
  searchInput.placeholder = 'Search tasks...';
  Object.assign(searchInput.style, {
    width: '200px',
    padding: '8px 12px',
    fontSize: 'var(--font-sm)',
  });
  searchInput.addEventListener('input', () => searchQuery.set(searchInput.value));

  // Status filter
  const statusSelect = createElement('select') as HTMLSelectElement;
  Object.assign(statusSelect.style, { padding: '8px 12px', fontSize: 'var(--font-sm)' });
  statusSelect.innerHTML = '<option value="">All Statuses</option>';
  for (const col of BOARD_COLUMNS) {
    const opt = createElement('option') as HTMLOptionElement;
    opt.value = col.status;
    opt.textContent = col.label;
    statusSelect.appendChild(opt);
  }
  statusSelect.addEventListener('change', () => statusFilter.set(statusSelect.value as TaskStatus | ''));

  // Priority filter
  const prioritySelect = createElement('select') as HTMLSelectElement;
  Object.assign(prioritySelect.style, { padding: '8px 12px', fontSize: 'var(--font-sm)' });
  prioritySelect.innerHTML = '<option value="">All Priorities</option>';
  for (const p of ['low', 'medium', 'high', 'urgent'] as TaskPriority[]) {
    const opt = createElement('option') as HTMLOptionElement;
    opt.value = p;
    opt.textContent = PRIORITY_LABELS[p];
    prioritySelect.appendChild(opt);
  }
  prioritySelect.addEventListener('change', () => priorityFilter.set(prioritySelect.value as TaskPriority | ''));

  // Assignee filter
  const assigneeSelect = createElement('select') as HTMLSelectElement;
  Object.assign(assigneeSelect.style, { padding: '8px 12px', fontSize: 'var(--font-sm)' });
  assigneeSelect.innerHTML = '<option value="">All Assignees</option>';
  for (const uid of project.members) {
    const user = authStore.getUser(uid);
    if (user) {
      const opt = createElement('option') as HTMLOptionElement;
      opt.value = user.id;
      opt.textContent = user.name;
      assigneeSelect.appendChild(opt);
    }
  }
  assigneeSelect.addEventListener('change', () => assigneeFilter.set(assigneeSelect.value));

  controlRow.append(tabGroup, searchInput, statusSelect, prioritySelect, assigneeSelect);
  header.append(topRow, controlRow);

  // --- Content area ---
  const content = createElement('div');
  Object.assign(content.style, {
    flex: '1',
    overflow: 'auto',
    padding: '24px 32px',
  });

  // --- Render board or list ---
  effect(() => {
    content.innerHTML = '';

    const filters: Parameters<typeof taskStore.filtered>[1] = {};
    const sq = searchQuery();
    const sf = statusFilter();
    const pf = priorityFilter();
    const af = assigneeFilter();
    if (sq) filters.search = sq;
    if (sf) filters.status = sf as TaskStatus;
    if (pf) filters.priority = pf as TaskPriority;
    if (af) filters.assigneeId = af;

    const filteredTasks = taskStore.filtered(projectId, filters);

    if (viewMode() === 'board') {
      renderKanban(content, filteredTasks, projectId);
    } else {
      renderListView(content, filteredTasks, sortCol(), sortDir(), (col) => {
        if (sortCol() === col) {
          sortDir.set(sortDir() === 'asc' ? 'desc' : 'asc');
        } else {
          sortCol.set(col);
          sortDir.set('asc');
        }
      });
    }
  });

  // --- Floating add button ---
  const fab = createElement('button');
  Object.assign(fab.style, {
    position: 'fixed',
    bottom: '32px',
    right: '32px',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'var(--color-primary)',
    color: 'var(--color-on-primary)',
    fontSize: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'var(--shadow-lg)',
    border: 'none',
    cursor: 'pointer',
    transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
    zIndex: '100',
  });
  fab.textContent = '+';
  fab.title = 'Create new task';
  fab.addEventListener('mouseenter', () => {
    fab.style.transform = 'scale(1.1)';
    fab.style.boxShadow = 'var(--shadow-xl)';
  });
  fab.addEventListener('mouseleave', () => {
    fab.style.transform = 'scale(1)';
    fab.style.boxShadow = 'var(--shadow-lg)';
  });
  fab.addEventListener('click', () => {
    openNewTaskModal(container, projectId);
  });

  page.append(header, content);
  container.append(page, fab);
}

// ---- Kanban Board ----

// Drag state for kanban
let _dragTaskId: string | null = null;

function renderKanban(content: HTMLElement, tasks: Task[], projectId: string): void {
  const board = createElement('div');
  Object.assign(board.style, {
    display: 'flex',
    gap: '16px',
    height: '100%',
    overflowX: 'auto',
    paddingBottom: '8px',
  });

  for (const col of BOARD_COLUMNS) {
    const colTasks = tasks.filter((t) => t.status === col.status);
    const column = createElement('div');
    column.dataset.dropStatus = col.status;
    Object.assign(column.style, {
      minWidth: '280px',
      width: '280px',
      background: 'var(--color-surface-container)',
      borderRadius: 'var(--radius-md)',
      display: 'flex',
      flexDirection: 'column',
      maxHeight: '100%',
      transition: 'background 0.2s, outline 0.2s',
    });

    // --- Drop zone ---
    column.addEventListener('dragover', (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      column.style.background = 'var(--color-primary-container)';
      column.style.outline = '2px dashed var(--color-primary)';
      column.style.outlineOffset = '-2px';
    });

    column.addEventListener('dragleave', (e: DragEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      if (!related || !column.contains(related)) {
        column.style.background = 'var(--color-surface-container)';
        column.style.outline = 'none';
      }
    });

    column.addEventListener('drop', (e: DragEvent) => {
      e.preventDefault();
      column.style.background = 'var(--color-surface-container)';
      column.style.outline = 'none';
      if (_dragTaskId) {
        taskStore.moveToStatus(_dragTaskId, col.status);
        _dragTaskId = null;
      }
    });

    // Column header
    const colHeader = createElement('div');
    Object.assign(colHeader.style, {
      padding: '14px 16px 10px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      flexShrink: '0',
    });

    const colDot = createElement('div');
    Object.assign(colDot.style, {
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      background: col.color,
    });

    const colTitle = createElement('span');
    Object.assign(colTitle.style, {
      fontSize: 'var(--font-sm)',
      fontWeight: '600',
      color: 'var(--color-on-surface)',
      flex: '1',
    });
    colTitle.textContent = col.label;

    const colCount = createElement('span');
    Object.assign(colCount.style, {
      fontSize: 'var(--font-xs)',
      fontWeight: '600',
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-full)',
      padding: '1px 8px',
      color: 'var(--color-on-surface-variant)',
    });
    colCount.textContent = String(colTasks.length);

    colHeader.append(colDot, colTitle, colCount);

    // Column body
    const colBody = createElement('div');
    Object.assign(colBody.style, {
      padding: '4px 8px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      overflowY: 'auto',
      flex: '1',
      minHeight: '40px',
    });

    for (const task of colTasks) {
      colBody.appendChild(createKanbanCard(task));
    }

    if (colTasks.length === 0) {
      const empty = createElement('div');
      Object.assign(empty.style, {
        textAlign: 'center',
        padding: '24px 8px',
        fontSize: 'var(--font-sm)',
        color: 'var(--color-outline)',
      });
      empty.textContent = 'Drop tasks here';
      colBody.appendChild(empty);
    }

    column.append(colHeader, colBody);
    board.appendChild(column);
  }

  content.appendChild(board);
}

function createKanbanCard(task: Task): HTMLElement {
  const card = createElement('div');
  card.draggable = true;
  card.dataset.taskId = task.id;
  Object.assign(card.style, {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px',
    boxShadow: 'var(--shadow-sm)',
    cursor: 'grab',
    transition: 'box-shadow var(--transition-fast), transform var(--transition-fast), opacity 0.2s',
    border: '1px solid var(--color-outline-variant)',
    userSelect: 'none',
  });
  card.addEventListener('mouseenter', () => {
    card.style.boxShadow = 'var(--shadow-md)';
    card.style.transform = 'translateY(-1px)';
  });
  card.addEventListener('mouseleave', () => {
    card.style.boxShadow = 'var(--shadow-sm)';
    card.style.transform = 'translateY(0)';
  });

  // --- Drag events ---
  card.addEventListener('dragstart', (e: DragEvent) => {
    _dragTaskId = task.id;
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
    _dragTaskId = null;
    // Reset all columns
    document.querySelectorAll('[data-drop-status]').forEach((c) => {
      (c as HTMLElement).style.background = 'var(--color-surface-container)';
      (c as HTMLElement).style.outline = 'none';
    });
  });

  // Title
  const title = createElement('div');
  Object.assign(title.style, {
    fontSize: 'var(--font-base)',
    fontWeight: '500',
    color: 'var(--color-on-surface)',
    marginBottom: '8px',
    lineHeight: '1.4',
  });
  title.textContent = task.title;

  // Labels row
  const labelsRow = createElement('div');
  Object.assign(labelsRow.style, {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    marginBottom: '8px',
  });
  for (const labelId of task.labels) {
    const label = taskStore.labels().find((l) => l.id === labelId);
    if (!label) continue;
    const chip = createElement('span');
    Object.assign(chip.style, {
      fontSize: '10px',
      padding: '1px 8px',
      borderRadius: 'var(--radius-full)',
      background: `${label.color}20`,
      color: label.color,
      fontWeight: '500',
    });
    chip.textContent = label.name;
    labelsRow.appendChild(chip);
  }

  // Bottom row
  const bottom = createElement('div');
  Object.assign(bottom.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '4px',
  });

  // Priority badge
  const pBadge = createElement('span');
  Object.assign(pBadge.style, {
    fontSize: '10px',
    padding: '2px 8px',
    borderRadius: 'var(--radius-full)',
    background: `${PRIORITY_COLORS[task.priority]}18`,
    color: PRIORITY_COLORS[task.priority],
    fontWeight: '600',
  });
  pBadge.textContent = PRIORITY_LABELS[task.priority];

  // Assignee avatar
  const avatarEl = createElement('div');
  if (task.assigneeId) {
    const user = authStore.getUser(task.assigneeId);
    Object.assign(avatarEl.style, {
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      background: 'var(--color-primary-container)',
      color: 'var(--color-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '11px',
      fontWeight: '600',
    });
    avatarEl.textContent = user ? user.name.charAt(0) : '?';
    avatarEl.title = user?.name ?? '';
  }

  bottom.append(pBadge, avatarEl);

  card.append(title, labelsRow, bottom);
  return card;
}

// ---- List view ----

function renderListView(
  content: HTMLElement,
  tasks: Task[],
  sortColumn: string,
  sortDirection: 'asc' | 'desc',
  onSort: (col: string) => void,
): void {
  // Sort tasks in place
  const sorted = [...tasks];
  if (sortColumn) {
    sorted.sort((a, b) => {
      let aVal: unknown = (a as Record<string, unknown>)[sortColumn];
      let bVal: unknown = (b as Record<string, unknown>)[sortColumn];
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const table = createElement('table');
  Object.assign(table.style, {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 'var(--font-base)',
  });

  // Header
  const thead = createElement('thead');
  const headRow = createElement('tr');

  const columns = [
    { key: 'title', label: 'Title' },
    { key: 'status', label: 'Status' },
    { key: 'priority', label: 'Priority' },
    { key: 'assigneeId', label: 'Assignee' },
    { key: 'dueDate', label: 'Due Date' },
  ];

  for (const col of columns) {
    const th = createElement('th');
    Object.assign(th.style, {
      textAlign: 'left',
      padding: '10px 14px',
      fontSize: 'var(--font-sm)',
      fontWeight: '600',
      color: 'var(--color-on-surface-variant)',
      borderBottom: '2px solid var(--color-outline-variant)',
      cursor: 'pointer',
      userSelect: 'none',
      whiteSpace: 'nowrap',
    });
    th.addEventListener('mouseenter', () => { th.style.color = 'var(--color-primary)'; });
    th.addEventListener('mouseleave', () => { th.style.color = 'var(--color-on-surface-variant)'; });

    const arrow = sortColumn === col.key ? (sortDirection === 'asc' ? ' \u2191' : ' \u2193') : '';
    th.textContent = col.label + arrow;
    th.addEventListener('click', () => onSort(col.key));
    headRow.appendChild(th);
  }

  thead.appendChild(headRow);

  // Body
  const tbody = createElement('tbody');

  for (const task of sorted) {
    const tr = createElement('tr');
    Object.assign(tr.style, {
      transition: 'background var(--transition-fast)',
      cursor: 'pointer',
    });
    tr.addEventListener('mouseenter', () => { tr.style.background = 'var(--color-surface-container)'; });
    tr.addEventListener('mouseleave', () => { tr.style.background = 'transparent'; });

    // Title
    const tdTitle = createElement('td');
    Object.assign(tdTitle.style, { padding: '10px 14px', fontWeight: '500', borderBottom: '1px solid var(--color-outline-variant)' });
    tdTitle.textContent = task.title;

    // Status
    const tdStatus = createElement('td');
    Object.assign(tdStatus.style, { padding: '10px 14px', borderBottom: '1px solid var(--color-outline-variant)' });
    const statusChip = createElement('span');
    const statusCol = BOARD_COLUMNS.find((c) => c.status === task.status);
    Object.assign(statusChip.style, {
      fontSize: 'var(--font-xs)',
      padding: '3px 10px',
      borderRadius: 'var(--radius-full)',
      background: `${statusCol?.color ?? '#6b7280'}18`,
      color: statusCol?.color ?? '#6b7280',
      fontWeight: '500',
    });
    statusChip.textContent = STATUS_LABELS[task.status];
    tdStatus.appendChild(statusChip);

    // Priority
    const tdPriority = createElement('td');
    Object.assign(tdPriority.style, { padding: '10px 14px', borderBottom: '1px solid var(--color-outline-variant)' });
    const prioChip = createElement('span');
    Object.assign(prioChip.style, {
      fontSize: 'var(--font-xs)',
      padding: '3px 10px',
      borderRadius: 'var(--radius-full)',
      background: `${PRIORITY_COLORS[task.priority]}18`,
      color: PRIORITY_COLORS[task.priority],
      fontWeight: '500',
    });
    prioChip.textContent = PRIORITY_LABELS[task.priority];
    tdPriority.appendChild(prioChip);

    // Assignee
    const tdAssignee = createElement('td');
    Object.assign(tdAssignee.style, { padding: '10px 14px', borderBottom: '1px solid var(--color-outline-variant)' });
    if (task.assigneeId) {
      const user = authStore.getUser(task.assigneeId);
      tdAssignee.textContent = user?.name ?? 'Unknown';
    } else {
      tdAssignee.textContent = '\u2014';
      tdAssignee.style.color = 'var(--color-outline)';
    }

    // Due date
    const tdDue = createElement('td');
    Object.assign(tdDue.style, { padding: '10px 14px', borderBottom: '1px solid var(--color-outline-variant)', whiteSpace: 'nowrap' });
    if (task.dueDate) {
      const d = new Date(task.dueDate);
      tdDue.textContent = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      if (task.dueDate < Date.now() && task.status !== 'done') {
        tdDue.style.color = 'var(--color-error)';
        tdDue.style.fontWeight = '500';
      }
    } else {
      tdDue.textContent = '\u2014';
      tdDue.style.color = 'var(--color-outline)';
    }

    tr.append(tdTitle, tdStatus, tdPriority, tdAssignee, tdDue);
    tbody.appendChild(tr);
  }

  table.append(thead, tbody);

  const wrapper = createElement('div');
  Object.assign(wrapper.style, {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-outline-variant)',
    overflow: 'auto',
  });
  wrapper.appendChild(table);
  content.appendChild(wrapper);
}

// ---- New task modal ----

function openNewTaskModal(pageContainer: HTMLElement, projectId: string): void {
  const overlay = createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '1000',
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  const modal = createElement('div');
  Object.assign(modal.style, {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    padding: '32px',
    width: '100%',
    maxWidth: '480px',
    boxShadow: 'var(--shadow-xl)',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  });

  const modalTitle = createElement('h2');
  Object.assign(modalTitle.style, { fontSize: 'var(--font-lg)', fontWeight: '600' });
  modalTitle.textContent = 'New Task';

  // Title input
  const titleInput = createElement('input') as HTMLInputElement;
  titleInput.type = 'text';
  titleInput.placeholder = 'Task title';
  Object.assign(titleInput.style, { width: '100%' });

  // Description
  const descInput = createElement('textarea') as HTMLTextAreaElement;
  descInput.placeholder = 'Description (optional)';
  Object.assign(descInput.style, {
    width: '100%',
    minHeight: '80px',
    resize: 'vertical',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-outline-variant)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    fontSize: 'var(--font-base)',
    fontFamily: 'inherit',
    color: 'var(--color-on-surface)',
  });

  // Priority select
  const prioLabel = createElement('label');
  Object.assign(prioLabel.style, {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: 'var(--font-sm)',
    fontWeight: '500',
    color: 'var(--color-on-surface-variant)',
  });
  prioLabel.textContent = 'Priority';
  const prioSelect = createElement('select') as HTMLSelectElement;
  Object.assign(prioSelect.style, { padding: '8px 12px', fontSize: 'var(--font-sm)' });
  for (const p of ['low', 'medium', 'high', 'urgent'] as TaskPriority[]) {
    const opt = createElement('option') as HTMLOptionElement;
    opt.value = p;
    opt.textContent = PRIORITY_LABELS[p];
    if (p === 'medium') opt.selected = true;
    prioSelect.appendChild(opt);
  }
  prioLabel.appendChild(prioSelect);

  // Buttons
  const btnRow = createElement('div');
  Object.assign(btnRow.style, { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' });

  const cancelBtn = createElement('button');
  Object.assign(cancelBtn.style, {
    padding: '10px 20px',
    borderRadius: 'var(--radius-full)',
    fontSize: 'var(--font-sm)',
    fontWeight: '500',
    background: 'var(--color-surface-container)',
    color: 'var(--color-on-surface)',
    border: '1px solid var(--color-outline-variant)',
  });
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => overlay.remove());

  const createBtn = createElement('button');
  Object.assign(createBtn.style, {
    padding: '10px 20px',
    borderRadius: 'var(--radius-full)',
    fontSize: 'var(--font-sm)',
    fontWeight: '600',
    background: 'var(--color-primary)',
    color: 'var(--color-on-primary)',
  });
  createBtn.textContent = 'Create Task';
  createBtn.addEventListener('click', () => {
    const t = titleInput.value.trim();
    if (!t) { titleInput.style.borderColor = 'var(--color-error)'; return; }
    const user = authStore.user();
    taskStore.create({
      projectId,
      title: t,
      description: descInput.value.trim(),
      status: 'todo',
      priority: prioSelect.value as TaskPriority,
      assigneeId: user?.id ?? null,
      labels: [],
      dueDate: null,
    });
    overlay.remove();
  });

  btnRow.append(cancelBtn, createBtn);
  modal.append(modalTitle, titleInput, descInput, prioLabel, btnRow);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  titleInput.focus();
}
