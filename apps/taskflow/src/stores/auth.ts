/**
 * Auth store — user authentication state.
 *
 * Uses defineStore for global state + useStorage for persistence.
 */

import { signal, computed } from '@akashjs/runtime';
import type { User } from '../types/index.js';
import { DEMO_USERS } from '../utils/seed.js';

const currentUser = signal<User | null>(null);
const isLoggedIn = computed(() => currentUser() !== null);

// Persist to localStorage
const stored = typeof localStorage !== 'undefined'
  ? localStorage.getItem('taskflow-user')
  : null;

if (stored) {
  try { currentUser.set(JSON.parse(stored)); } catch {}
}

export const authStore = {
  user: () => currentUser(),
  isLoggedIn,

  login(email: string, _password: string): boolean {
    const user = DEMO_USERS.find((u) => u.email === email);
    if (!user) return false;
    currentUser.set(user);
    localStorage.setItem('taskflow-user', JSON.stringify(user));
    return true;
  },

  loginAsDemo(): void {
    currentUser.set(DEMO_USERS[0]);
    localStorage.setItem('taskflow-user', JSON.stringify(DEMO_USERS[0]));
  },

  logout(): void {
    currentUser.set(null);
    localStorage.removeItem('taskflow-user');
  },

  getUser(id: string): User | undefined {
    return DEMO_USERS.find((u) => u.id === id);
  },

  allUsers: () => DEMO_USERS,
};
