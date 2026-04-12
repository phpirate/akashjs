/**
 * Snippets, $inspect, form actions, and navigation snapshots.
 */

import { signal, effect } from './signals.js';
import type { AkashNode } from './types.js';
import type { ReadonlySignal } from './signals.js';

// =========================================================================
// Snippets — reusable template fragments
// =========================================================================

export type Snippet<TArgs extends unknown[] = []> = (...args: TArgs) => AkashNode;

/**
 * Define a reusable template snippet.
 *
 * ```ts
 * const UserBadge = defineSnippet((name: string, role: string) => {
 *   const el = document.createElement('span');
 *   el.textContent = `${name} (${role})`;
 *   el.className = 'badge';
 *   return el;
 * });
 *
 * // Reuse anywhere:
 * container.appendChild(nodeToDOM(UserBadge('Alice', 'admin')));
 * container.appendChild(nodeToDOM(UserBadge('Bob', 'user')));
 * ```
 */
export function defineSnippet<TArgs extends unknown[]>(
  render: (...args: TArgs) => AkashNode,
): Snippet<TArgs> {
  return render;
}

// =========================================================================
// $inspect — debug reactive values
// =========================================================================

export interface InspectOptions {
  /** Label prefix for console output */
  label?: string;
  /** Log level (default: 'log') */
  level?: 'log' | 'warn' | 'debug' | 'trace';
  /** Custom logger */
  logger?: (label: string, ...values: unknown[]) => void;
  /** Only log when a condition is true */
  when?: () => boolean;
}

/**
 * Debug helper — logs when reactive values change.
 *
 * ```ts
 * const count = signal(0);
 * const name = signal('Alice');
 *
 * inspect(count, name); // logs: [inspect] 0, 'Alice'
 * count.set(1);         // logs: [inspect] 1, 'Alice'
 *
 * // With label:
 * inspect(count, { label: 'counter' });
 * // logs: [counter] 1
 * ```
 */
export function inspect(
  ...args: Array<(() => unknown) | InspectOptions>
): () => void {
  let options: InspectOptions = {};
  const sources: Array<() => unknown> = [];

  for (const arg of args) {
    if (typeof arg === 'function') {
      sources.push(arg);
    } else if (typeof arg === 'object' && arg !== null) {
      options = arg as InspectOptions;
    }
  }

  const {
    label = 'inspect',
    level = 'log',
    logger,
    when,
  } = options;

  const result = {
    dispose: null as unknown as () => void,
    get values() { return sources.map(s => s()); },
    get value() { return sources.length === 1 ? sources[0]() : sources.map(s => s()); },
    label,
    sources: sources.length,
  };

  result.dispose = effect(() => {
    if (when && !when()) return;

    const values = sources.map((s) => s());

    if (logger) {
      logger(label, ...values);
    } else {
      (console as any)[level](`[${label}]`, ...values);
    }
  });

  return result as any;
}

// =========================================================================
// Form actions — server-side form handling
// =========================================================================

export interface FormAction<T = unknown> {
  /** The action URL */
  url: string;
  /** Submit method */
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Whether a submission is in progress */
  submitting: ReadonlySignal<boolean>;
  /** The last result */
  result: ReadonlySignal<T | null>;
  /** The last error */
  error: ReadonlySignal<Error | null>;
  /** Create an onSubmit handler for a <form> */
  handle(formData?: Record<string, unknown>): (e: Event) => void;
  /** Submit programmatically */
  submit(data: Record<string, unknown>): Promise<T>;
}

/**
 * Define a server-side form action with progressive enhancement.
 *
 * ```ts
 * const createPost = defineFormAction<Post>('/api/posts', {
 *   method: 'POST',
 *   onSuccess: (post) => navigate(`/posts/${post.id}`),
 *   onError: (err) => toast.error(err.message),
 * });
 *
 * // In template:
 * <form onSubmit={createPost.handle()}>
 *   <input name="title" />
 *   <button disabled={createPost.submitting()}>Create</button>
 * </form>
 * ```
 */
export function defineFormAction<T = unknown>(
  url: string,
  options: {
    method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    headers?: Record<string, string>;
    onSuccess?: (result: T) => void;
    onError?: (error: Error) => void;
    fetch?: typeof globalThis.fetch;
  } = {},
): FormAction<T> {
  const {
    method = 'POST',
    headers = {},
    onSuccess,
    onError,
    fetch: customFetch = globalThis.fetch.bind(globalThis),
  } = options;

  const submitting = signal(false);
  const result = signal<T | null>(null);
  const error = signal<Error | null>(null);

  async function submit(data: Record<string, unknown>): Promise<T> {
    submitting.set(true);
    error.set(null);

    try {
      const response = await customFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Form action failed: ${response.status}`);
      }

      const res = await response.json() as T;
      result.set(res);
      submitting.set(false);
      onSuccess?.(res);
      return res;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      error.set(e);
      submitting.set(false);
      onError?.(e);
      throw e;
    }
  }

  return {
    url,
    method,
    submitting: () => submitting(),
    result: () => result(),
    error: () => error(),
    handle(extraData?: Record<string, unknown>) {
      return (e: Event) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const data: Record<string, unknown> = { ...extraData };
        formData.forEach((value, key) => { data[key] = value; });
        submit(data);
      };
    },
    submit,
  };
}

// =========================================================================
// Navigation snapshots — preserve scroll & form state
// =========================================================================

export interface SnapshotConfig {
  /** Storage key prefix (default: 'akash-snapshot') */
  keyPrefix?: string;
  /** What to capture */
  capture?: ('scroll' | 'forms')[];
}

interface PageSnapshot {
  scrollX: number;
  scrollY: number;
  forms: Record<string, Record<string, string>>;
  timestamp: number;
}

/**
 * Enable navigation snapshots — preserves scroll position and form
 * state when navigating with back/forward.
 *
 * ```ts
 * enableSnapshots();
 * // Now back/forward restores scroll position and form inputs
 * ```
 */
export function enableSnapshots(config: SnapshotConfig = {}): () => void {
  if (typeof window === 'undefined') return () => {};

  const { keyPrefix = 'akash-snapshot', capture = ['scroll', 'forms'] } = config;

  function captureSnapshot(): PageSnapshot {
    const snapshot: PageSnapshot = {
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      forms: {},
      timestamp: Date.now(),
    };

    if (capture.includes('forms')) {
      document.querySelectorAll('form[id]').forEach((form) => {
        const formEl = form as HTMLFormElement;
        const data: Record<string, string> = {};
        new FormData(formEl).forEach((value, key) => {
          data[key] = String(value);
        });
        snapshot.forms[formEl.id] = data;
      });
    }

    return snapshot;
  }

  function restoreSnapshot(snapshot: PageSnapshot): void {
    if (capture.includes('scroll')) {
      requestAnimationFrame(() => {
        window.scrollTo(snapshot.scrollX, snapshot.scrollY);
      });
    }

    if (capture.includes('forms')) {
      for (const [formId, data] of Object.entries(snapshot.forms)) {
        const form = document.getElementById(formId) as HTMLFormElement | null;
        if (!form) continue;
        for (const [key, value] of Object.entries(data)) {
          const input = form.elements.namedItem(key) as HTMLInputElement | null;
          if (input) input.value = value;
        }
      }
    }
  }

  // Save snapshot before navigation
  const saveKey = () => `${keyPrefix}-${window.location.pathname}`;

  function save(): void {
    try {
      const snapshot = captureSnapshot();
      sessionStorage.setItem(saveKey(), JSON.stringify(snapshot));
    } catch { /* storage full */ }
  }

  function restore(): void {
    try {
      const raw = sessionStorage.getItem(saveKey());
      if (raw) {
        const snapshot = JSON.parse(raw) as PageSnapshot;
        // Only restore if recent (within 30 minutes)
        if (Date.now() - snapshot.timestamp < 30 * 60 * 1000) {
          restoreSnapshot(snapshot);
        }
      }
    } catch { /* */ }
  }

  // Listen for navigation
  window.addEventListener('beforeunload', save);
  window.addEventListener('popstate', () => {
    requestAnimationFrame(restore);
  });

  // Restore on initial load if coming from back/forward
  if ((performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.type === 'back_forward') {
    requestAnimationFrame(restore);
  }

  return () => {
    window.removeEventListener('beforeunload', save);
  };
}
