/**
 * Seed data for demo / development.
 */

import type { User, Project, Task, Label } from '../types/index.js';

let idCounter = 0;
function uid(): string { return `id-${++idCounter}-${Date.now()}`; }

export const DEMO_USERS: User[] = [
  { id: 'u1', name: "Ma'moon Al-Akash", email: 'maamoon@taskflow.dev', role: 'admin', avatar: undefined },
  { id: 'u2', name: 'Sarah Chen', email: 'sarah@taskflow.dev', role: 'member', avatar: undefined },
  { id: 'u3', name: 'Alex Rivera', email: 'alex@taskflow.dev', role: 'member', avatar: undefined },
  { id: 'u4', name: 'Priya Sharma', email: 'priya@taskflow.dev', role: 'viewer', avatar: undefined },
];

export const DEMO_LABELS: Label[] = [
  { id: 'l1', name: 'Bug', color: '#ef4444' },
  { id: 'l2', name: 'Feature', color: '#3b82f6' },
  { id: 'l3', name: 'Enhancement', color: '#8b5cf6' },
  { id: 'l4', name: 'Documentation', color: '#10b981' },
  { id: 'l5', name: 'Design', color: '#f59e0b' },
  { id: 'l6', name: 'Performance', color: '#ec4899' },
];

export const DEMO_PROJECTS: Project[] = [
  {
    id: 'p1',
    name: 'AkashJS Framework',
    description: 'Core framework development — runtime, compiler, and tooling',
    color: '#6750A4',
    icon: '⚡',
    ownerId: 'u1',
    members: ['u1', 'u2', 'u3'],
    createdAt: Date.now() - 30 * 86400000,
    updatedAt: Date.now(),
  },
  {
    id: 'p2',
    name: 'TaskFlow App',
    description: 'Project management application built with AkashJS',
    color: '#3b82f6',
    icon: '📋',
    ownerId: 'u1',
    members: ['u1', 'u2', 'u3', 'u4'],
    createdAt: Date.now() - 14 * 86400000,
    updatedAt: Date.now(),
  },
  {
    id: 'p3',
    name: 'Marketing Site',
    description: 'Landing page and documentation site for AkashJS',
    color: '#10b981',
    icon: '🌐',
    ownerId: 'u2',
    members: ['u2', 'u4'],
    createdAt: Date.now() - 7 * 86400000,
    updatedAt: Date.now(),
  },
];

const now = Date.now();

export const DEMO_TASKS: Task[] = [
  // AkashJS Framework
  { id: 't1', projectId: 'p1', title: 'Implement SSR streaming', description: 'Add streaming support to renderToStream with Suspense boundaries for progressive page loads.', status: 'done', priority: 'high', assigneeId: 'u1', labels: ['l2'], dueDate: now - 2 * 86400000, createdAt: now - 20 * 86400000, updatedAt: now - 2 * 86400000, order: 0 },
  { id: 't2', projectId: 'p1', title: 'Fix signal memory leak in nested effects', description: 'Effects inside conditional blocks are not properly disposed when the condition becomes false.', status: 'done', priority: 'urgent', assigneeId: 'u2', labels: ['l1'], dueDate: now - 5 * 86400000, createdAt: now - 15 * 86400000, updatedAt: now - 5 * 86400000, order: 1 },
  { id: 't3', projectId: 'p1', title: 'Add source maps to compiler output', description: 'Integrate SourceMapBuilder into the transform pipeline for accurate .akash → .js debugging.', status: 'in_progress', priority: 'medium', assigneeId: 'u1', labels: ['l2'], dueDate: now + 3 * 86400000, createdAt: now - 10 * 86400000, updatedAt: now - 1 * 86400000, order: 2 },
  { id: 't4', projectId: 'p1', title: 'Benchmark against Solid and Svelte', description: 'Run js-framework-benchmark and document results. Target: within 10% of Solid on all metrics.', status: 'todo', priority: 'medium', assigneeId: 'u3', labels: ['l6'], dueDate: now + 7 * 86400000, createdAt: now - 7 * 86400000, updatedAt: now - 7 * 86400000, order: 3 },
  { id: 't5', projectId: 'p1', title: 'Write migration guide from Angular', description: 'Document common patterns and their AkashJS equivalents for Angular developers migrating.', status: 'todo', priority: 'low', assigneeId: null, labels: ['l4'], dueDate: now + 14 * 86400000, createdAt: now - 5 * 86400000, updatedAt: now - 5 * 86400000, order: 4 },
  { id: 't6', projectId: 'p1', title: 'Implement CSS containment in compiler', description: 'Add contain: layout style paint to scoped components for rendering performance.', status: 'backlog', priority: 'low', assigneeId: null, labels: ['l6', 'l3'], dueDate: null, createdAt: now - 3 * 86400000, updatedAt: now - 3 * 86400000, order: 5 },
  { id: 't7', projectId: 'p1', title: 'Tree-shake unused runtime APIs', description: 'Ensure dead code elimination works correctly for all optional runtime modules.', status: 'review', priority: 'high', assigneeId: 'u2', labels: ['l6'], dueDate: now + 1 * 86400000, createdAt: now - 8 * 86400000, updatedAt: now, order: 6 },

  // TaskFlow App
  { id: 't8', projectId: 'p2', title: 'Build Kanban board drag-and-drop', description: 'Implement drag-and-drop between columns using pointer events and FLIP animations.', status: 'in_progress', priority: 'high', assigneeId: 'u1', labels: ['l2'], dueDate: now + 2 * 86400000, createdAt: now - 5 * 86400000, updatedAt: now, order: 0 },
  { id: 't9', projectId: 'p2', title: 'Add real-time collaboration', description: 'Use createSync() to sync task state across connected clients in real time.', status: 'todo', priority: 'high', assigneeId: 'u1', labels: ['l2'], dueDate: now + 5 * 86400000, createdAt: now - 4 * 86400000, updatedAt: now - 4 * 86400000, order: 1 },
  { id: 't10', projectId: 'p2', title: 'Implement task filtering and search', description: 'Add useQueryState-backed search, status filter, assignee filter, and label filter.', status: 'todo', priority: 'medium', assigneeId: 'u3', labels: ['l2'], dueDate: now + 7 * 86400000, createdAt: now - 3 * 86400000, updatedAt: now - 3 * 86400000, order: 2 },
  { id: 't11', projectId: 'p2', title: 'Design dark mode theme', description: 'Create dark mode using useTheme() with MD3 dark color tokens.', status: 'done', priority: 'medium', assigneeId: 'u4', labels: ['l5'], dueDate: now - 1 * 86400000, createdAt: now - 6 * 86400000, updatedAt: now - 1 * 86400000, order: 3 },
  { id: 't12', projectId: 'p2', title: 'Add keyboard shortcuts', description: 'Use useKeyboard() for: N=new task, /=search, J/K=navigate, E=edit, D=done.', status: 'backlog', priority: 'low', assigneeId: null, labels: ['l3'], dueDate: null, createdAt: now - 2 * 86400000, updatedAt: now - 2 * 86400000, order: 4 },
  { id: 't13', projectId: 'p2', title: 'Offline support with sync', description: 'Use createOfflineStore() so the app works without internet and syncs when back online.', status: 'backlog', priority: 'medium', assigneeId: null, labels: ['l2'], dueDate: null, createdAt: now - 1 * 86400000, updatedAt: now - 1 * 86400000, order: 5 },

  // Marketing Site
  { id: 't14', projectId: 'p3', title: 'Write homepage hero section', description: 'Angular structure, Svelte simplicity — compelling headline with animated code example.', status: 'in_progress', priority: 'high', assigneeId: 'u2', labels: ['l5'], dueDate: now + 3 * 86400000, createdAt: now - 4 * 86400000, updatedAt: now, order: 0 },
  { id: 't15', projectId: 'p3', title: 'Create comparison table', description: 'Feature comparison vs React, Vue, Angular, Svelte, Solid. Highlight unique features.', status: 'todo', priority: 'medium', assigneeId: 'u4', labels: ['l4'], dueDate: now + 5 * 86400000, createdAt: now - 3 * 86400000, updatedAt: now - 3 * 86400000, order: 1 },
  { id: 't16', projectId: 'p3', title: 'Set up VitePress documentation', description: 'Deploy docs with search, dark mode, and auto-generated API pages.', status: 'done', priority: 'high', assigneeId: 'u2', labels: ['l4'], dueDate: now - 3 * 86400000, createdAt: now - 7 * 86400000, updatedAt: now - 3 * 86400000, order: 2 },
];
