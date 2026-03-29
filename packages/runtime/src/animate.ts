/**
 * Animation module.
 *
 * State-based animations, stagger, group, sequence, keyframes,
 * and spring physics. Goes far beyond CSS transitions.
 *
 * ```ts
 * const fadeIn = animate(el, { opacity: [0, 1] }, { duration: 300 });
 * const staggered = animateStagger('.item', { opacity: [0, 1], y: [20, 0] }, { stagger: 50 });
 * const spring = animateSpring(el, { scale: 1.2 }, { stiffness: 300, damping: 20 });
 * ```
 */

// =========================================================================
// Types
// =========================================================================

export interface AnimationOptions {
  /** Duration in ms (default: 300) */
  duration?: number;
  /** Easing function or CSS easing string (default: 'ease') */
  easing?: string;
  /** Delay before animation starts in ms */
  delay?: number;
  /** Number of iterations (Infinity for loop) */
  iterations?: number;
  /** Direction: normal, reverse, alternate */
  direction?: PlaybackDirection;
  /** Fill mode */
  fill?: FillMode;
  /** Callback when animation completes */
  onComplete?: () => void;
}

export interface StaggerOptions extends AnimationOptions {
  /** Delay between each element in ms */
  stagger?: number;
  /** Stagger from: 'start', 'center', 'end' */
  from?: 'start' | 'center' | 'end';
}

export interface SpringOptions {
  /** Spring stiffness (default: 100) */
  stiffness?: number;
  /** Damping ratio (default: 10) */
  damping?: number;
  /** Mass (default: 1) */
  mass?: number;
  /** Velocity threshold to stop (default: 0.01) */
  threshold?: number;
  /** Callback when animation completes */
  onComplete?: () => void;
}

export interface AnimationControl {
  /** Play the animation */
  play(): void;
  /** Pause the animation */
  pause(): void;
  /** Cancel the animation */
  cancel(): void;
  /** Reverse the animation */
  reverse(): void;
  /** Promise that resolves when animation completes */
  finished: Promise<void>;
}

type PropertyValue = number | string | [number | string, number | string];

// =========================================================================
// animate() — Web Animations API wrapper
// =========================================================================

/**
 * Animate an element using the Web Animations API.
 *
 * ```ts
 * const ctrl = animate(el, {
 *   opacity: [0, 1],
 *   transform: ['translateY(20px)', 'translateY(0)'],
 * }, { duration: 300, easing: 'ease-out' });
 *
 * await ctrl.finished;
 * ```
 */
export function animate(
  el: HTMLElement,
  properties: Record<string, PropertyValue>,
  options: AnimationOptions = {},
): AnimationControl {
  const {
    duration = 300,
    easing = 'ease',
    delay = 0,
    iterations = 1,
    direction = 'normal',
    fill = 'forwards',
    onComplete,
  } = options;

  // Build keyframes
  const keyframes: Keyframe[] = [{}, {}];
  for (const [prop, value] of Object.entries(properties)) {
    const cssProperty = prop === 'y' ? 'translateY'
      : prop === 'x' ? 'translateX'
      : prop;

    if (Array.isArray(value)) {
      const [from, to] = value;
      if (cssProperty === 'translateY' || cssProperty === 'translateX') {
        (keyframes[0] as any).transform = `${cssProperty}(${typeof from === 'number' ? from + 'px' : from})`;
        (keyframes[1] as any).transform = `${cssProperty}(${typeof to === 'number' ? to + 'px' : to})`;
      } else {
        (keyframes[0] as any)[cssProperty] = from;
        (keyframes[1] as any)[cssProperty] = to;
      }
    } else {
      (keyframes[1] as any)[cssProperty] = value;
    }
  }

  const animation = el.animate(keyframes, {
    duration,
    easing,
    delay,
    iterations,
    direction,
    fill,
  });

  const finished = new Promise<void>((resolve) => {
    animation.onfinish = () => {
      onComplete?.();
      resolve();
    };
  });

  return {
    play: () => animation.play(),
    pause: () => animation.pause(),
    cancel: () => animation.cancel(),
    reverse: () => animation.reverse(),
    finished,
  };
}

// =========================================================================
// animateStagger() — staggered animations
// =========================================================================

/**
 * Animate multiple elements with staggered timing.
 *
 * ```ts
 * animateStagger('.list-item', {
 *   opacity: [0, 1],
 *   y: [20, 0],
 * }, { stagger: 50, duration: 300 });
 * ```
 */
export function animateStagger(
  selector: string | HTMLElement[],
  properties: Record<string, PropertyValue>,
  options: StaggerOptions = {},
): AnimationControl[] {
  const { stagger = 50, from = 'start', ...animOptions } = options;

  const elements: HTMLElement[] = typeof selector === 'string'
    ? Array.from(document.querySelectorAll<HTMLElement>(selector))
    : selector;

  const controls: AnimationControl[] = [];
  const count = elements.length;

  elements.forEach((el, i) => {
    let delay = (animOptions.delay ?? 0);

    switch (from) {
      case 'start': delay += i * stagger; break;
      case 'end': delay += (count - 1 - i) * stagger; break;
      case 'center': delay += Math.abs(Math.floor(count / 2) - i) * stagger; break;
    }

    controls.push(animate(el, properties, { ...animOptions, delay }));
  });

  return controls;
}

// =========================================================================
// animateSequence() — sequential animations
// =========================================================================

/**
 * Run animations in sequence, one after another.
 *
 * ```ts
 * await animateSequence([
 *   [el1, { opacity: [0, 1] }, { duration: 200 }],
 *   [el2, { opacity: [0, 1] }, { duration: 200 }],
 * ]);
 * ```
 */
export async function animateSequence(
  steps: Array<[HTMLElement, Record<string, PropertyValue>, AnimationOptions?]>,
): Promise<void> {
  for (const [el, props, opts] of steps) {
    const ctrl = animate(el, props, opts);
    await ctrl.finished;
  }
}

// =========================================================================
// animateGroup() — parallel animations
// =========================================================================

/**
 * Run multiple animations in parallel, wait for all to complete.
 */
export async function animateGroup(
  steps: Array<[HTMLElement, Record<string, PropertyValue>, AnimationOptions?]>,
): Promise<void> {
  const controls = steps.map(([el, props, opts]) => animate(el, props, opts));
  await Promise.all(controls.map((c) => c.finished));
}

// =========================================================================
// animateSpring() — spring physics animation
// =========================================================================

/**
 * Animate with spring physics (no CSS easing — uses requestAnimationFrame).
 *
 * ```ts
 * animateSpring(el, { scale: 1.2, rotate: 10 }, {
 *   stiffness: 300,
 *   damping: 20,
 * });
 * ```
 */
export function animateSpring(
  el: HTMLElement,
  target: Record<string, number>,
  options: SpringOptions = {},
): AnimationControl {
  const {
    stiffness = 100,
    damping = 10,
    mass = 1,
    threshold = 0.01,
    onComplete,
  } = options;

  const current: Record<string, number> = {};
  const velocity: Record<string, number> = {};

  // Initialize from current computed values
  const computed = window.getComputedStyle(el);
  for (const prop of Object.keys(target)) {
    current[prop] = parseFloat(computed.getPropertyValue(prop)) || 0;
    velocity[prop] = 0;
  }

  let animating = true;
  let rafId = 0;

  let resolveFinished: () => void;
  const finished = new Promise<void>((resolve) => { resolveFinished = resolve; });

  function step(): void {
    if (!animating) return;

    let allSettled = true;
    const dt = 1 / 60; // assume 60fps

    for (const prop of Object.keys(target)) {
      const displacement = current[prop] - target[prop];
      const springForce = -stiffness * displacement;
      const dampingForce = -damping * velocity[prop];
      const acceleration = (springForce + dampingForce) / mass;

      velocity[prop] += acceleration * dt;
      current[prop] += velocity[prop] * dt;

      if (Math.abs(velocity[prop]) > threshold || Math.abs(displacement) > threshold) {
        allSettled = false;
      }
    }

    // Apply
    applySpringValues(el, current);

    if (allSettled) {
      // Snap to target
      for (const prop of Object.keys(target)) {
        current[prop] = target[prop];
      }
      applySpringValues(el, current);
      animating = false;
      onComplete?.();
      resolveFinished();
    } else {
      rafId = requestAnimationFrame(step);
    }
  }

  rafId = requestAnimationFrame(step);

  return {
    play() { if (!animating) { animating = true; step(); } },
    pause() { animating = false; cancelAnimationFrame(rafId); },
    cancel() { animating = false; cancelAnimationFrame(rafId); },
    reverse() {
      for (const prop of Object.keys(target)) {
        velocity[prop] = -velocity[prop];
      }
    },
    finished,
  };
}

function applySpringValues(el: HTMLElement, values: Record<string, number>): void {
  const transforms: string[] = [];
  for (const [prop, value] of Object.entries(values)) {
    switch (prop) {
      case 'x': transforms.push(`translateX(${value}px)`); break;
      case 'y': transforms.push(`translateY(${value}px)`); break;
      case 'scale': transforms.push(`scale(${value})`); break;
      case 'rotate': transforms.push(`rotate(${value}deg)`); break;
      case 'opacity': el.style.opacity = String(value); break;
      default: el.style.setProperty(prop, String(value)); break;
    }
  }
  if (transforms.length > 0) {
    el.style.transform = transforms.join(' ');
  }
}

// =========================================================================
// Keyframes helper
// =========================================================================

/**
 * Define keyframes for multi-step animations.
 *
 * ```ts
 * const bounce = keyframes([
 *   { offset: 0, transform: 'translateY(0)' },
 *   { offset: 0.5, transform: 'translateY(-30px)' },
 *   { offset: 1, transform: 'translateY(0)' },
 * ]);
 *
 * el.animate(bounce, { duration: 600 });
 * ```
 */
export function keyframes(frames: Keyframe[]): Keyframe[] {
  return frames;
}

// =========================================================================
// State-based animations
// =========================================================================

export interface AnimationState {
  [property: string]: string | number;
}

/**
 * Define state-based animations.
 *
 * ```ts
 * const toggle = defineStates({
 *   open: { height: 'auto', opacity: 1 },
 *   closed: { height: 0, opacity: 0 },
 * }, { duration: 300 });
 *
 * toggle.transitionTo(el, 'open');
 * toggle.transitionTo(el, 'closed');
 * ```
 */
export function defineStates(
  states: Record<string, AnimationState>,
  defaultOptions: AnimationOptions = {},
) {
  return {
    states,
    transitionTo(el: HTMLElement, stateName: string, options?: AnimationOptions): AnimationControl {
      const target = states[stateName];
      if (!target) throw new Error(`Unknown animation state: ${stateName}`);

      const props: Record<string, PropertyValue> = {};
      for (const [key, value] of Object.entries(target)) {
        props[key] = value;
      }

      return animate(el, props, { ...defaultOptions, ...options });
    },
  };
}
