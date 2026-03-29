/**
 * TaskDetail component — full detail panel for viewing/editing a task.
 */

import { signal, effect } from '@akashjs/runtime';
import type { Task, TaskStatus, TaskPriority } from '../types/index.js';
import { STATUS_LABELS, PRIORITY_LABELS, PRIORITY_COLORS } from '../types/index.js';
import { taskStore } from '../stores/tasks.js';
import { authStore } from '../stores/auth.js';

export function createTaskDetail(
  container: HTMLElement,
  taskId: string,
  options?: {
    onClose?: () => void;
    onDelete?: (taskId: string) => void;
  },
): HTMLElement {
  const task = taskStore.byId(taskId);
  if (!task) {
    const empty = document.createElement('div');
    empty.textContent = 'Task not found';
    empty.style.padding = '24px';
    container.appendChild(empty);
    return empty;
  }

  // Local form state
  const formTitle = signal(task.title);
  const formDescription = signal(task.description);
  const formStatus = signal<TaskStatus>(task.status);
  const formPriority = signal<TaskPriority>(task.priority);
  const formAssignee = signal<string | null>(task.assigneeId);
  const formLabels = signal<string[]>([...task.labels]);
  const formDueDate = signal<number | null>(task.dueDate);

  const panel = document.createElement('div');
  Object.assign(panel.style, {
    width: '480px',
    maxWidth: '100%',
    height: '100%',
    background: '#fff',
    borderLeft: '1px solid #e5e5e5',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  });

  // --- Header bar ---
  const headerBar = document.createElement('div');
  Object.assign(headerBar.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #e5e5e5',
  });

  const headerLabel = document.createElement('span');
  headerLabel.textContent = 'Task Details';
  Object.assign(headerLabel.style, {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1C1B1F',
  });
  headerBar.appendChild(headerLabel);

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
  closeBtn.addEventListener('click', () => options?.onClose?.());
  headerBar.appendChild(closeBtn);
  panel.appendChild(headerBar);

  // --- Scrollable body ---
  const body = document.createElement('div');
  Object.assign(body.style, {
    flex: '1',
    overflowY: 'auto',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  });

  // Helper: create a field group
  function fieldGroup(labelText: string): { group: HTMLElement; content: HTMLElement } {
    const group = document.createElement('div');
    group.style.display = 'flex';
    group.style.flexDirection = 'column';
    group.style.gap = '6px';

    const lbl = document.createElement('label');
    lbl.textContent = labelText;
    Object.assign(lbl.style, {
      fontSize: '11px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      color: '#6b7280',
    });
    group.appendChild(lbl);

    const content = document.createElement('div');
    group.appendChild(content);
    return { group, content };
  }

  function inputStyle(el: HTMLElement) {
    Object.assign(el.style, {
      width: '100%',
      padding: '8px 12px',
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
      padding: '8px 12px',
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

  // --- Title ---
  const { group: titleGroup, content: titleContent } = fieldGroup('Title');
  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.value = task.title;
  inputStyle(titleInput);
  titleInput.style.fontSize = '15px';
  titleInput.style.fontWeight = '600';
  titleInput.addEventListener('input', () => formTitle.set(titleInput.value));
  titleContent.appendChild(titleInput);
  body.appendChild(titleGroup);

  // --- Status + Priority row ---
  const statusPriorityRow = document.createElement('div');
  Object.assign(statusPriorityRow.style, {
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
    opt.selected = s === task.status;
    statusSelect.appendChild(opt);
  });
  selectStyle(statusSelect);
  statusSelect.addEventListener('change', () => formStatus.set(statusSelect.value as TaskStatus));
  statusContent.appendChild(statusSelect);
  statusPriorityRow.appendChild(statusGroup);

  // Priority
  const { group: priorityGroup, content: priorityContent } = fieldGroup('Priority');
  const prioritySelect = document.createElement('select');
  (Object.keys(PRIORITY_LABELS) as TaskPriority[]).forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = PRIORITY_LABELS[p];
    opt.selected = p === task.priority;
    prioritySelect.appendChild(opt);
  });
  selectStyle(prioritySelect);
  prioritySelect.addEventListener('change', () => formPriority.set(prioritySelect.value as TaskPriority));
  priorityContent.appendChild(prioritySelect);
  statusPriorityRow.appendChild(priorityGroup);

  body.appendChild(statusPriorityRow);

  // --- Assignee ---
  const { group: assigneeGroup, content: assigneeContent } = fieldGroup('Assignee');
  const assigneeSelect = document.createElement('select');
  const unassigned = document.createElement('option');
  unassigned.value = '';
  unassigned.textContent = 'Unassigned';
  unassigned.selected = task.assigneeId === null;
  assigneeSelect.appendChild(unassigned);
  authStore.allUsers().forEach((u) => {
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = u.name;
    opt.selected = u.id === task.assigneeId;
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
    const isSelected = () => formLabels().includes(label.id);
    const applyChipStyle = () => {
      const selected = isSelected();
      Object.assign(chip.style, {
        padding: '4px 10px',
        borderRadius: '12px',
        border: `1.5px solid ${label.color}`,
        background: selected ? label.color + '20' : 'transparent',
        color: label.color,
        fontSize: '11px',
        fontWeight: '600',
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'background 0.15s',
      });
    };

    chip.textContent = label.name;
    applyChipStyle();

    chip.addEventListener('click', () => {
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

  // --- Description ---
  const { group: descGroup, content: descContent } = fieldGroup('Description');
  const descTextarea = document.createElement('textarea');
  descTextarea.value = task.description;
  descTextarea.rows = 4;
  inputStyle(descTextarea);
  descTextarea.style.resize = 'vertical';
  descTextarea.style.lineHeight = '1.5';
  descTextarea.addEventListener('input', () => formDescription.set(descTextarea.value));
  descContent.appendChild(descTextarea);
  body.appendChild(descGroup);

  // --- Due date ---
  const { group: dueGroup, content: dueContent } = fieldGroup('Due Date');
  const dueDateInput = document.createElement('input');
  dueDateInput.type = 'date';
  if (task.dueDate) {
    dueDateInput.value = new Date(task.dueDate).toISOString().split('T')[0];
  }
  inputStyle(dueDateInput);
  dueDateInput.addEventListener('change', () => {
    formDueDate.set(dueDateInput.value ? new Date(dueDateInput.value).getTime() : null);
  });
  dueContent.appendChild(dueDateInput);
  body.appendChild(dueGroup);

  // --- Activity feed ---
  const { group: actGroup, content: actContent } = fieldGroup('Activity');
  const activities = [
    { type: 'created', text: `Created ${new Date(task.createdAt).toLocaleDateString()}` },
    { type: 'updated', text: `Last updated ${new Date(task.updatedAt).toLocaleDateString()}` },
  ];

  const actList = document.createElement('div');
  Object.assign(actList.style, {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  });

  activities.forEach((act) => {
    const item = document.createElement('div');
    Object.assign(item.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '12px',
      color: '#6b7280',
    });

    const dot = document.createElement('span');
    Object.assign(dot.style, {
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      background: '#d1d5db',
      flexShrink: '0',
    });
    item.appendChild(dot);

    const text = document.createElement('span');
    text.textContent = act.text;
    item.appendChild(text);

    actList.appendChild(item);
  });

  actContent.appendChild(actList);
  body.appendChild(actGroup);

  panel.appendChild(body);

  // --- Footer: actions ---
  const footer = document.createElement('div');
  Object.assign(footer.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderTop: '1px solid #e5e5e5',
    gap: '8px',
  });

  // Delete
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Delete';
  Object.assign(deleteBtn.style, {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid #fca5a5',
    background: 'transparent',
    color: '#ef4444',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.15s',
  });
  deleteBtn.addEventListener('mouseenter', () => { deleteBtn.style.background = '#fef2f2'; });
  deleteBtn.addEventListener('mouseleave', () => { deleteBtn.style.background = 'transparent'; });
  deleteBtn.addEventListener('click', () => {
    if (confirm('Delete this task? This cannot be undone.')) {
      taskStore.remove(taskId);
      options?.onDelete?.(taskId);
      options?.onClose?.();
    }
  });
  footer.appendChild(deleteBtn);

  const rightBtns = document.createElement('div');
  rightBtns.style.display = 'flex';
  rightBtns.style.gap = '8px';

  // Cancel
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  Object.assign(cancelBtn.style, {
    padding: '8px 16px',
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
  cancelBtn.addEventListener('click', () => options?.onClose?.());
  rightBtns.appendChild(cancelBtn);

  // Save
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save Changes';
  Object.assign(saveBtn.style, {
    padding: '8px 20px',
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
  saveBtn.addEventListener('mouseenter', () => { saveBtn.style.background = '#574394'; });
  saveBtn.addEventListener('mouseleave', () => { saveBtn.style.background = '#6750A4'; });
  saveBtn.addEventListener('click', () => {
    taskStore.update(taskId, {
      title: formTitle(),
      description: formDescription(),
      status: formStatus(),
      priority: formPriority(),
      assigneeId: formAssignee(),
      labels: formLabels(),
      dueDate: formDueDate(),
    });
    options?.onClose?.();
  });
  rightBtns.appendChild(saveBtn);

  footer.appendChild(rightBtns);
  panel.appendChild(footer);

  container.appendChild(panel);
  return panel;
}
