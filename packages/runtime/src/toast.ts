/**
 * Toast notification system.
 *
 * Signal-based toast queue with auto-dismiss, stacking, and positions.
 *
 * ```ts
 * const toast = createToaster();
 * toast.success('Saved!');
 * toast.error('Something went wrong');
 * toast.info('Tip: try dark mode', { duration: 5000 });
 * toast.toasts(); // reactive list of active toasts
 * ```
 */

import { signal } from './signals.js';
import type { ReadonlySignal } from './signals.js';

// --- Types ---

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export type ToastPosition =
  | 'top-right' | 'top-left' | 'top-center'
  | 'bottom-right' | 'bottom-left' | 'bottom-center';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
  dismissible: boolean;
  createdAt: number;
}

export interface ToastOptions {
  /** Duration in ms (default: 3000, 0 = no auto-dismiss) */
  duration?: number;
  /** Whether the toast can be manually dismissed (default: true) */
  dismissible?: boolean;
}

export interface ToasterOptions {
  /** Max visible toasts (default: 5) */
  maxVisible?: number;
  /** Default duration in ms (default: 3000) */
  defaultDuration?: number;
  /** Position (default: 'top-right') */
  position?: ToastPosition;
}

export interface Toaster {
  /** Active toasts (reactive signal) */
  toasts: ReadonlySignal<Toast[]>;
  /** Position setting */
  position: ToastPosition;
  /** Show a success toast */
  success(message: string, options?: ToastOptions): string;
  /** Show an error toast */
  error(message: string, options?: ToastOptions): string;
  /** Show an info toast */
  info(message: string, options?: ToastOptions): string;
  /** Show a warning toast */
  warning(message: string, options?: ToastOptions): string;
  /** Show a toast with custom type */
  add(type: ToastType, message: string, options?: ToastOptions): string;
  /** Dismiss a specific toast */
  dismiss(id: string): void;
  /** Dismiss all toasts */
  dismissAll(): void;
}

// --- Implementation ---

let idCounter = 0;

/**
 * Create a toast notification manager.
 */
export function createToaster(options: ToasterOptions = {}): Toaster {
  const {
    maxVisible = 5,
    defaultDuration = 3000,
    position = 'top-right',
  } = options;

  const toasts = signal<Toast[]>([]);
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  function add(type: ToastType, message: string, opts?: ToastOptions): string {
    const id = `toast-${++idCounter}`;
    const duration = opts?.duration ?? defaultDuration;
    const dismissible = opts?.dismissible ?? true;

    const toast: Toast = {
      id,
      type,
      message,
      duration,
      dismissible,
      createdAt: Date.now(),
    };

    toasts.update((list) => {
      const next = [...list, toast];
      // Trim to maxVisible
      if (next.length > maxVisible) {
        const removed = next.shift()!;
        clearTimer(removed.id);
      }
      return next;
    });

    // Auto-dismiss
    if (duration > 0) {
      const timer = setTimeout(() => dismiss(id), duration);
      timers.set(id, timer);
    }

    return id;
  }

  function dismiss(id: string): void {
    clearTimer(id);
    toasts.update((list) => list.filter((t) => t.id !== id));
  }

  function dismissAll(): void {
    for (const [id] of timers) {
      clearTimer(id);
    }
    toasts.set([]);
  }

  function clearTimer(id: string): void {
    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
    }
  }

  return {
    toasts: (() => toasts()) as ReadonlySignal<Toast[]>,
    position,
    success: (msg, opts) => add('success', msg, opts),
    error: (msg, opts) => add('error', msg, opts),
    info: (msg, opts) => add('info', msg, opts),
    warning: (msg, opts) => add('warning', msg, opts),
    add,
    dismiss,
    dismissAll,
  };
}
