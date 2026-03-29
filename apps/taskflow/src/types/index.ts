/**
 * TaskFlow type definitions.
 */

// --- User ---
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'member' | 'viewer';
}

// --- Project ---
export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  ownerId: string;
  members: string[];
  createdAt: number;
  updatedAt: number;
}

// --- Task ---
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  labels: string[];
  dueDate: number | null;
  createdAt: number;
  updatedAt: number;
  order: number;
}

// --- Label ---
export interface Label {
  id: string;
  name: string;
  color: string;
}

// --- Activity ---
export interface Activity {
  id: string;
  taskId: string;
  userId: string;
  type: 'created' | 'updated' | 'moved' | 'assigned' | 'commented';
  description: string;
  timestamp: number;
}

// --- Board Column ---
export interface BoardColumn {
  status: TaskStatus;
  label: string;
  color: string;
}

export const BOARD_COLUMNS: BoardColumn[] = [
  { status: 'backlog', label: 'Backlog', color: '#6b7280' },
  { status: 'todo', label: 'To Do', color: '#3b82f6' },
  { status: 'in_progress', label: 'In Progress', color: '#f59e0b' },
  { status: 'review', label: 'Review', color: '#8b5cf6' },
  { status: 'done', label: 'Done', color: '#10b981' },
];

// --- Status labels ---
export const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: '#6b7280',
  medium: '#3b82f6',
  high: '#f59e0b',
  urgent: '#ef4444',
};
