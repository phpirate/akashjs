/**
 * Retry, rate limiting, and request queue.
 *
 * Resilient network handling for production apps.
 *
 * ```ts
 * const data = await retry(() => fetch('/api/data'), {
 *   maxRetries: 3,
 *   backoff: 'exponential',
 *   retryOn: [500, 502, 503],
 * });
 *
 * const queue = createQueue({ concurrency: 3, rateLimit: { max: 10, window: 1000 } });
 * queue.add(() => fetch('/api/item/1'));
 * queue.add(() => fetch('/api/item/2'));
 * ```
 */

import { signal } from '@akashjs/runtime';
import type { ReadonlySignal } from '@akashjs/runtime';

// =========================================================================
// retry()
// =========================================================================

export interface RetryOptions {
  /** Max number of retries (default: 3) */
  maxRetries?: number;
  /** Backoff strategy (default: 'exponential') */
  backoff?: 'fixed' | 'linear' | 'exponential';
  /** Base delay in ms (default: 1000) */
  delay?: number;
  /** Max delay in ms (default: 30000) */
  maxDelay?: number;
  /** Jitter to add randomness (default: true) */
  jitter?: boolean;
  /** HTTP status codes to retry on */
  retryOn?: number[];
  /** Custom retry condition */
  retryIf?: (error: unknown, attempt: number) => boolean;
  /** Callback per retry */
  onRetry?: (error: unknown, attempt: number) => void;
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
}

/**
 * Retry an async function with configurable backoff.
 *
 * ```ts
 * const data = await retry(() => http.get('/api/data'), {
 *   maxRetries: 3,
 *   backoff: 'exponential',
 *   retryOn: [500, 502, 503, 429],
 * });
 * ```
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    backoff = 'exponential',
    delay = 1000,
    maxDelay = 30000,
    jitter = true,
    retryOn,
    retryIf,
    onRetry,
    signal: abortSignal,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (abortSignal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) break;

      // Check if we should retry
      const shouldRetry = retryIf
        ? retryIf(error, attempt)
        : shouldRetryError(error, retryOn);

      if (!shouldRetry) break;

      onRetry?.(error, attempt + 1);

      // Wait with backoff
      const waitMs = calculateDelay(attempt, delay, maxDelay, backoff, jitter);
      await sleep(waitMs, abortSignal);
    }
  }

  throw lastError;
}

function shouldRetryError(error: unknown, retryOn?: number[]): boolean {
  if (retryOn && error && typeof error === 'object' && 'status' in error) {
    return retryOn.includes((error as any).status);
  }
  // Retry on network errors by default
  if (error instanceof TypeError && error.message.includes('fetch')) return true;
  return true;
}

function calculateDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  strategy: string,
  jitter: boolean,
): number {
  let delay: number;

  switch (strategy) {
    case 'fixed':
      delay = baseDelay;
      break;
    case 'linear':
      delay = baseDelay * (attempt + 1);
      break;
    case 'exponential':
    default:
      delay = baseDelay * Math.pow(2, attempt);
      break;
  }

  delay = Math.min(delay, maxDelay);

  if (jitter) {
    delay = delay * (0.5 + Math.random() * 0.5);
  }

  return Math.round(delay);
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });
}

// =========================================================================
// createQueue()
// =========================================================================

export interface QueueOptions {
  /** Max concurrent tasks (default: 1) */
  concurrency?: number;
  /** Rate limit */
  rateLimit?: {
    /** Max requests in window */
    max: number;
    /** Window in ms */
    window: number;
  };
  /** Auto-start processing (default: true) */
  autoStart?: boolean;
}

export interface Queue {
  /** Add a task to the queue */
  add<T>(fn: () => Promise<T>): Promise<T>;
  /** Number of pending tasks */
  pending: ReadonlySignal<number>;
  /** Number of running tasks */
  running: ReadonlySignal<number>;
  /** Whether the queue is idle */
  idle: ReadonlySignal<boolean>;
  /** Pause processing */
  pause(): void;
  /** Resume processing */
  resume(): void;
  /** Clear all pending tasks */
  clear(): void;
  /** Wait until all tasks complete */
  onIdle(): Promise<void>;
}

interface QueueItem {
  fn: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
}

/**
 * Create a task queue with concurrency and rate limiting.
 *
 * ```ts
 * const queue = createQueue({ concurrency: 3 });
 * const results = await Promise.all([
 *   queue.add(() => fetch('/api/1')),
 *   queue.add(() => fetch('/api/2')),
 *   queue.add(() => fetch('/api/3')),
 *   queue.add(() => fetch('/api/4')), // waits for a slot
 * ]);
 * ```
 */
export function createQueue(options: QueueOptions = {}): Queue {
  const { concurrency = 1, rateLimit, autoStart = true } = options;

  const pending = signal(0);
  const running = signal(0);
  const idle = signal(true);

  const queue: QueueItem[] = [];
  let paused = !autoStart;
  let idleResolvers: Array<() => void> = [];

  // Rate limiting
  const timestamps: number[] = [];

  function canRun(): boolean {
    if (running() >= concurrency) return false;
    if (!rateLimit) return true;

    const now = Date.now();
    // Remove old timestamps
    while (timestamps.length > 0 && timestamps[0] < now - rateLimit.window) {
      timestamps.shift();
    }
    return timestamps.length < rateLimit.max;
  }

  function process(): void {
    if (paused) return;

    while (queue.length > 0 && canRun()) {
      const item = queue.shift()!;
      pending.update((p) => p - 1);
      running.update((r) => r + 1);
      idle.set(false);

      if (rateLimit) {
        timestamps.push(Date.now());
      }

      item.fn()
        .then((result) => item.resolve(result))
        .catch((error) => item.reject(error))
        .finally(() => {
          running.update((r) => r - 1);
          if (running() === 0 && queue.length === 0) {
            idle.set(true);
            for (const resolver of idleResolvers) {
              resolver();
            }
            idleResolvers = [];
          }
          // Process next
          process();
        });
    }
  }

  return {
    add<T>(fn: () => Promise<T>): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        queue.push({ fn, resolve: resolve as any, reject });
        pending.update((p) => p + 1);
        idle.set(false);
        process();
      });
    },
    pending: () => pending(),
    running: () => running(),
    idle: () => idle(),
    pause() { paused = true; },
    resume() { paused = false; process(); },
    clear() {
      for (const item of queue) {
        item.reject(new Error('Queue cleared'));
      }
      queue.length = 0;
      pending.set(0);
    },
    onIdle(): Promise<void> {
      if (idle()) return Promise.resolve();
      return new Promise((resolve) => { idleResolvers.push(resolve); });
    },
  };
}

// =========================================================================
// dedup() — request deduplication
// =========================================================================

/**
 * Deduplicate concurrent calls to the same async function.
 * If called while a previous call is still pending, returns
 * the same promise instead of starting a new request.
 *
 * ```ts
 * const fetchUser = dedup((id: string) => http.get(`/users/${id}`));
 * // These two calls share one request:
 * const [a, b] = await Promise.all([fetchUser('1'), fetchUser('1')]);
 * ```
 */
export function dedup<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  keyFn?: (...args: TArgs) => string,
): (...args: TArgs) => Promise<TResult> {
  const inflight = new Map<string, Promise<TResult>>();

  return (...args: TArgs): Promise<TResult> => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);

    if (inflight.has(key)) {
      return inflight.get(key)!;
    }

    const promise = fn(...args).finally(() => {
      inflight.delete(key);
    });

    inflight.set(key, promise);
    return promise;
  };
}
