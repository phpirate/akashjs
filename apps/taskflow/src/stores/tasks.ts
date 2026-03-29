/**
 * Tasks store — task CRUD, filtering, and workflow state machine.
 */

import { signal, computed } from '@akashjs/runtime';
import type { Task, TaskStatus, TaskPriority } from '../types/index.js';
import { DEMO_TASKS, DEMO_LABELS } from '../utils/seed.js';

const tasks = signal<Task[]>([...DEMO_TASKS]);

// --- Task workflow state machine transitions ---
const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  backlog: ['todo'],
  todo: ['in_progress', 'backlog'],
  in_progress: ['review', 'todo'],
  review: ['done', 'in_progress'],
  done: ['todo'], // reopen
};

export const taskStore = {
  tasks: () => tasks(),
  labels: () => DEMO_LABELS,

  // --- Queries ---

  byProject(projectId: string): Task[] {
    return tasks().filter((t) => t.projectId === projectId);
  },

  byStatus(projectId: string, status: TaskStatus): Task[] {
    return tasks()
      .filter((t) => t.projectId === projectId && t.status === status)
      .sort((a, b) => a.order - b.order);
  },

  byId(id: string): Task | undefined {
    return tasks().find((t) => t.id === id);
  },

  countByStatus(projectId: string): Record<TaskStatus, number> {
    const projectTasks = tasks().filter((t) => t.projectId === projectId);
    return {
      backlog: projectTasks.filter((t) => t.status === 'backlog').length,
      todo: projectTasks.filter((t) => t.status === 'todo').length,
      in_progress: projectTasks.filter((t) => t.status === 'in_progress').length,
      review: projectTasks.filter((t) => t.status === 'review').length,
      done: projectTasks.filter((t) => t.status === 'done').length,
    };
  },

  search(projectId: string, query: string): Task[] {
    const q = query.toLowerCase();
    return tasks().filter((t) =>
      t.projectId === projectId &&
      (t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)),
    );
  },

  filtered(projectId: string, filters: {
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeId?: string;
    label?: string;
    search?: string;
  }): Task[] {
    let result = tasks().filter((t) => t.projectId === projectId);

    if (filters.status) result = result.filter((t) => t.status === filters.status);
    if (filters.priority) result = result.filter((t) => t.priority === filters.priority);
    if (filters.assigneeId) result = result.filter((t) => t.assigneeId === filters.assigneeId);
    if (filters.label) result = result.filter((t) => t.labels.includes(filters.label!));
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter((t) =>
        t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
      );
    }

    return result.sort((a, b) => a.order - b.order);
  },

  // --- Mutations ---

  create(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'order'>): Task {
    const projectTasks = tasks().filter((t) => t.projectId === data.projectId);
    const task: Task = {
      ...data,
      id: `t-${Date.now()}`,
      order: projectTasks.length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    tasks.update((list) => [...list, task]);
    return task;
  },

  update(id: string, data: Partial<Task>): void {
    tasks.update((list) =>
      list.map((t) => t.id === id ? { ...t, ...data, updatedAt: Date.now() } : t),
    );
  },

  remove(id: string): void {
    tasks.update((list) => list.filter((t) => t.id !== id));
  },

  // --- Workflow ---

  canTransition(taskId: string, targetStatus: TaskStatus): boolean {
    const task = tasks().find((t) => t.id === taskId);
    if (!task) return false;
    return VALID_TRANSITIONS[task.status]?.includes(targetStatus) ?? false;
  },

  moveToStatus(taskId: string, targetStatus: TaskStatus): boolean {
    const task = tasks().find((t) => t.id === taskId);
    if (!task) return false;

    // Allow direct moves in board view (less strict than workflow)
    tasks.update((list) =>
      list.map((t) => t.id === taskId
        ? { ...t, status: targetStatus, updatedAt: Date.now() }
        : t,
      ),
    );
    return true;
  },

  reorder(taskId: string, targetStatus: TaskStatus, newOrder: number): void {
    tasks.update((list) => {
      const updated = list.map((t) => {
        if (t.id === taskId) {
          return { ...t, status: targetStatus, order: newOrder, updatedAt: Date.now() };
        }
        return t;
      });
      return updated;
    });
  },

  // --- Stats ---

  totalCount: computed(() => tasks().length),

  completedCount(projectId: string): number {
    return tasks().filter((t) => t.projectId === projectId && t.status === 'done').length;
  },

  overdueCount(projectId: string): number {
    const now = Date.now();
    return tasks().filter((t) =>
      t.projectId === projectId &&
      t.status !== 'done' &&
      t.dueDate !== null &&
      t.dueDate < now,
    ).length;
  },
};
