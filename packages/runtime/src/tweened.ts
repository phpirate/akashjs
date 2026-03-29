/**
 * Tweened values — smooth interpolation between states.
 *
 * Unlike signals that update instantly, tweened values animate
 * smoothly from old to new over a duration.
 *
 * ```ts
 * const progress = tweened(0, { duration: 400 });
 * progress.set(100); // smoothly animates 0 → 100 over 400ms
 * progress();        // intermediate values during animation
 *
 * const color = tweened('#ff0000', { duration: 300, interpolate: lerpColor });
 * ```
 */

import { signal } from './signals.js';
import type { Signal, ReadonlySignal } from './signals.js';

// =========================================================================
// Types
// =========================================================================

export type Interpolator<T> = (from: T, to: T, t: number) => T;

export type EasingFn = (t: number) => number;

export interface TweenedOptions<T> {
  /** Duration in ms (default: 400) */
  duration?: number;
  /** Easing function (default: cubicOut) */
  easing?: EasingFn;
  /** Custom interpolation function */
  interpolate?: Interpolator<T>;
  /** Delay before animation starts */
  delay?: number;
}

export interface TweenedSignal<T> {
  /** Read current (animated) value */
  (): T;
  /** Set new target — animates from current to new */
  set(value: T, opts?: Partial<TweenedOptions<T>>): Promise<void>;
  /** Set immediately without animation */
  setImmediate(value: T): void;
  /** Current target value */
  target: () => T;
}

// =========================================================================
// Built-in easing functions
// =========================================================================

export const easings = {
  linear: (t: number) => t,
  cubicIn: (t: number) => t * t * t,
  cubicOut: (t: number) => 1 - Math.pow(1 - t, 3),
  cubicInOut: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  quadIn: (t: number) => t * t,
  quadOut: (t: number) => 1 - (1 - t) * (1 - t),
  quintOut: (t: number) => 1 - Math.pow(1 - t, 5),
  bounceOut: (t: number) => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  },
  elasticOut: (t: number) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
  },
} as const;

// =========================================================================
// Default interpolators
// =========================================================================

function defaultInterpolate<T>(from: T, to: T, t: number): T {
  if (typeof from === 'number' && typeof to === 'number') {
    return (from + (to - from) * t) as T;
  }
  // For non-numbers, snap at halfway
  return t < 0.5 ? from : to;
}

// =========================================================================
// tweened()
// =========================================================================

/**
 * Create a tweened signal that animates between values.
 *
 * ```ts
 * const count = tweened(0, { duration: 300, easing: easings.cubicOut });
 * count.set(100); // smoothly goes 0 → 100
 * count();        // current interpolated value
 * ```
 */
export function tweened<T>(
  initialValue: T,
  options: TweenedOptions<T> = {},
): TweenedSignal<T> {
  const {
    duration = 400,
    easing = easings.cubicOut,
    interpolate = defaultInterpolate,
    delay = 0,
  } = options;

  const current = signal<T>(initialValue);
  const targetValue = signal<T>(initialValue);
  let rafId = 0;
  let running = false;

  const read = (() => current()) as TweenedSignal<T>;

  read.set = (value: T, overrides?: Partial<TweenedOptions<T>>): Promise<void> => {
    const dur = overrides?.duration ?? duration;
    const ease = overrides?.easing ?? easing;
    const interp = overrides?.interpolate ?? interpolate;
    const del = overrides?.delay ?? delay;

    const from = current();
    targetValue.set(value);

    if (dur === 0) {
      current.set(value);
      return Promise.resolve();
    }

    // Cancel any running animation
    if (running) {
      cancelAnimationFrame(rafId);
      running = false;
    }

    return new Promise<void>((resolve) => {
      const start = performance.now() + del;
      running = true;

      function tick(now: number): void {
        if (!running) { resolve(); return; }

        const elapsed = now - start;
        if (elapsed < 0) {
          rafId = requestAnimationFrame(tick);
          return;
        }

        const t = Math.min(elapsed / dur, 1);
        const easedT = ease(t);
        current.set(interp(from, value, easedT));

        if (t < 1) {
          rafId = requestAnimationFrame(tick);
        } else {
          running = false;
          resolve();
        }
      }

      rafId = requestAnimationFrame(tick);
    });
  };

  read.setImmediate = (value: T): void => {
    if (running) { cancelAnimationFrame(rafId); running = false; }
    current.set(value);
    targetValue.set(value);
  };

  read.target = () => targetValue();

  return read;
}
