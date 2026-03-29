/**
 * Projects store — project CRUD and state.
 */

import { signal, computed } from '@akashjs/runtime';
import type { Project } from '../types/index.js';
import { DEMO_PROJECTS } from '../utils/seed.js';

const projects = signal<Project[]>([...DEMO_PROJECTS]);
const activeProjectId = signal<string | null>(null);

export const projectStore = {
  projects: () => projects(),
  activeProjectId: () => activeProjectId(),

  activeProject: computed(() => {
    const id = activeProjectId();
    return id ? projects().find((p) => p.id === id) ?? null : null;
  }),

  setActive(id: string | null): void {
    activeProjectId.set(id);
  },

  getById(id: string): Project | undefined {
    return projects().find((p) => p.id === id);
  },

  create(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project {
    const project: Project = {
      ...data,
      id: `p-${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    projects.update((list) => [...list, project]);
    return project;
  },

  update(id: string, data: Partial<Project>): void {
    projects.update((list) =>
      list.map((p) => p.id === id ? { ...p, ...data, updatedAt: Date.now() } : p),
    );
  },

  remove(id: string): void {
    projects.update((list) => list.filter((p) => p.id !== id));
    if (activeProjectId() === id) activeProjectId.set(null);
  },

  count: computed(() => projects().length),
};
