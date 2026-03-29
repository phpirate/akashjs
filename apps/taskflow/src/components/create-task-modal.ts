/**
 * CreateTaskModal component — modal form for creating a new task.
 */

import { signal, escapeHtml } from '@akashjs/runtime';
import type { TaskStatus, TaskPriority } from '../types/index.js';
import { STATUS_LABELS, PRIORITY_LABELS } from '../types/index.js';
import { taskStore } from '../stores/tasks.js';
import { authStore } from '../stores/auth.js';

export function createTaskModal(
  container: HTMLElement,
  projectId: string,
  onClose: () => void,
  options?: { defaultStatus?: TaskStatus },
): HTMLElement {
  // Form state signals
  const formTitle = signal('');
  const formDescription = signal('');
  const formStatus = signal<TaskStatus>(options?.defaultStatus ?? 'todo');
  const formPriority = signal<TaskPriority>('medium');
  const formAssignee = signal<string | null>(null);
  const formLabels = signal<string[]>([]);

  // --- Overlay ---
  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '1000',
    backdropFilter: 'blur(2px)',
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) onClose();
  });

  // --- Modal card ---
  const modal = document.createElement('div');
  Object.assign(modal.style, {
    background: '#fff',
    borderRadius: '16px',
    width: '480px',
    maxWidth: '90vw',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
    overflow: 'hidden',
    animation: 'none',
  });

  // --- Header ---
  const header = document.createElement('div');
  Object.assign(header.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px 16px',
    borderBottom: '1px solid #e5e5e5',
  });

  const title = document.createElement('h2');
  title.textContent = 'Create Task';
  Object.assign(title.style, {
    margin: '0',
    fontSize: '18px',
    fontWeight: '700',
    color: '#1C1B1F',
  });
  header.appendChild(title);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '\u2715';
  Object.assign(closeBtn.style, {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '16px',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.15s',
  });
  closeBtn.addEventListener('mouseenter', () => { closeBtn.style.background = '#f3f4f6'; });
  closeBtn.addEventListener('mouseleave', () => { closeBtn.style.background = 'transparent'; });
  closeBtn.addEventListener('click', onClose);
  header.appendChild(closeBtn);
  modal.appendChild(header);

  // --- Body (scrollable form) ---
  const body = document.createElement('div');
  Object.assign(body.style, {
    flex: '1',
    overflowY: 'auto',
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  });

  // Helpers
  function inputStyle(el: HTMLElement) {
    Object.assign(el.style, {
      width: '100%',
      padding: '10px 12px',
      borderRadius: '8px',
      border: '1px solid #e5e5e5',
      fontSize: '13px',
      color: '#1C1B1F',
      fontFamily: 'inherit',
      outline: 'none',
      boxSizing: 'border-box',
      transition: 'border-color 0.15s',
    });
    el.addEventListener('focus', () => { el.style.borderColor = '#6750A4'; });
    el.addEventListener('blur', () => { el.style.borderColor = '#e5e5e5'; });
  }

  function selectStyle(el: HTMLSelectElement) {
    Object.assign(el.style, {
      width: '100%',
      padding: '10px 12px',
      borderRadius: '8px',
      border: '1px solid #e5e5e5',
      fontSize: '13px',
      color: '#1C1B1F',
      fontFamily: 'inherit',
      outline: 'none',
      background: '#fff',
      cursor: 'pointer',
      boxSizing: 'border-box',
    });
  }

  function fieldGroup(labelText: string): { group: HTMLElement; content: HTMLElement } {
    const group = document.createElement('div');
    group.style.display = 'flex';
    group.style.flexDirection = 'column';
    group.style.gap = '6px';

    const lbl = document.createElement('label');
    lbl.textContent = labelText;
    Object.assign(lbl.style, {
      fontSize: '12px',
      fontWeight: '600',
      color: '#374151',
    });
    group.appendChild(lbl);

    const content = document.createElement('div');
    group.appendChild(content);
    return { group, content };
  }

  // --- Title ---
  const { group: titleGroup, content: titleContent } = fieldGroup('Title *');
  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.placeholder = 'What needs to be done?';
  inputStyle(titleInput);
  titleInput.addEventListener('input', () => formTitle.set(titleInput.value));
  titleContent.appendChild(titleInput);
  body.appendChild(titleGroup);

  // --- Description ---
  const { group: descGroup, content: descContent } = fieldGroup('Description');
  const descTextarea = document.createElement('textarea');
  descTextarea.placeholder = 'Add details about this task...';
  descTextarea.rows = 3;
  inputStyle(descTextarea);
  descTextarea.style.resize = 'vertical';
  descTextarea.style.lineHeight = '1.5';
  descTextarea.addEventListener('input', () => formDescription.set(descTextarea.value));
  descContent.appendChild(descTextarea);
  body.appendChild(descGroup);

  // --- Status + Priority row ---
  const row = document.createElement('div');
  Object.assign(row.style, {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  });

  // Status
  const { group: statusGroup, content: statusContent } = fieldGroup('Status');
  const statusSelect = document.createElement('select');
  (Object.keys(STATUS_LABELS) as TaskStatus[]).forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = STATUS_LABELS[s];
    opt.selected = s === (options?.defaultStatus ?? 'todo');
    statusSelect.appendChild(opt);
  });
  selectStyle(statusSelect);
  statusSelect.addEventListener('change', () => formStatus.set(statusSelect.value as TaskStatus));
  statusContent.appendChild(statusSelect);
  row.appendChild(statusGroup);

  // Priority
  const { group: priorityGroup, content: priorityContent } = fieldGroup('Priority');
  const prioritySelect = document.createElement('select');
  (Object.keys(PRIORITY_LABELS) as TaskPriority[]).forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = PRIORITY_LABELS[p];
    opt.selected = p === 'medium';
    prioritySelect.appendChild(opt);
  });
  selectStyle(prioritySelect);
  prioritySelect.addEventListener('change', () => formPriority.set(prioritySelect.value as TaskPriority));
  priorityContent.appendChild(prioritySelect);
  row.appendChild(priorityGroup);

  body.appendChild(row);

  // --- Assignee ---
  const { group: assigneeGroup, content: assigneeContent } = fieldGroup('Assignee');
  const assigneeSelect = document.createElement('select');
  const unassigned = document.createElement('option');
  unassigned.value = '';
  unassigned.textContent = 'Unassigned';
  assigneeSelect.appendChild(unassigned);
  authStore.allUsers().forEach((u) => {
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = u.name;
    assigneeSelect.appendChild(opt);
  });
  selectStyle(assigneeSelect);
  assigneeSelect.addEventListener('change', () => {
    formAssignee.set(assigneeSelect.value || null);
  });
  assigneeContent.appendChild(assigneeSelect);
  body.appendChild(assigneeGroup);

  // --- Labels ---
  const { group: labelsGroup, content: labelsContent } = fieldGroup('Labels');
  const labelsWrap = document.createElement('div');
  Object.assign(labelsWrap.style, {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  });

  const allLabels = taskStore.labels();
  allLabels.forEach((label) => {
    const chip = document.createElement('button');
    chip.textContent = label.name;

    const applyChipStyle = () => {
      const selected = formLabels().includes(label.id);
      Object.assign(chip.style, {
        padding: '5px 12px',
        borderRadius: '14px',
        border: `1.5px solid ${label.color}`,
        background: selected ? label.color + '20' : 'transparent',
        color: label.color,
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'background 0.15s',
      });
    };
    applyChipStyle();

    chip.addEventListener('click', (e) => {
      e.preventDefault();
      const current = formLabels();
      if (current.includes(label.id)) {
        formLabels.set(current.filter((id) => id !== label.id));
      } else {
        formLabels.set([...current, label.id]);
      }
      applyChipStyle();
    });

    labelsWrap.appendChild(chip);
  });

  labelsContent.appendChild(labelsWrap);
  body.appendChild(labelsGroup);

  modal.appendChild(body);

  // --- Footer ---
  const footer = document.createElement('div');
  Object.assign(footer.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: '16px 24px',
    borderTop: '1px solid #e5e5e5',
    gap: '8px',
  });

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  Object.assign(cancelBtn.style, {
    padding: '10px 20px',
    borderRadius: '8px',
    border: '1px solid #e5e5e5',
    background: '#fff',
    color: '#6b7280',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.15s',
  });
  cancelBtn.addEventListener('mouseenter', () => { cancelBtn.style.background = '#f9fafb'; });
  cancelBtn.addEventListener('mouseleave', () => { cancelBtn.style.background = '#fff'; });
  cancelBtn.addEventListener('click', onClose);
  footer.appendChild(cancelBtn);

  const createBtn = document.createElement('button');
  createBtn.textContent = 'Create Task';
  Object.assign(createBtn.style, {
    padding: '10px 24px',
    borderRadius: '8px',
    border: 'none',
    background: '#6750A4',
    color: '#fff',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.15s',
  });
  createBtn.addEventListener('mouseenter', () => { createBtn.style.background = '#574394'; });
  createBtn.addEventListener('mouseleave', () => { createBtn.style.background = '#6750A4'; });

  createBtn.addEventListener('click', () => {
    const titleVal = formTitle().trim();
    if (!titleVal) {
      titleInput.style.borderColor = '#ef4444';
      titleInput.focus();
      return;
    }

    // Sanitize user input to prevent XSS when rendering task content
    const safeTitle = escapeHtml(titleVal);
    const safeDescription = escapeHtml(formDescription());

    taskStore.create({
      projectId,
      title: safeTitle,
      description: safeDescription,
      status: formStatus(),
      priority: formPriority(),
      assigneeId: formAssignee(),
      labels: formLabels(),
      dueDate: null,
    });

    onClose();
  });

  footer.appendChild(createBtn);
  modal.appendChild(footer);

  overlay.appendChild(modal);
  container.appendChild(overlay);

  // Focus title input on open
  requestAnimationFrame(() => titleInput.focus());

  // Close on Escape
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      document.removeEventListener('keydown', onKeyDown);
    }
  };
  document.addEventListener('keydown', onKeyDown);

  return overlay;
}
