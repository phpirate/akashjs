/**
 * Transition/Animation system.
 *
 * Provides CSS-based enter/exit transitions for elements.
 * Works with <Transition> component or programmatic API.
 *
 * Class naming convention (matches Vue/Svelte):
 * - `{name}-enter-from`  — initial enter state
 * - `{name}-enter-active` — active enter transition
 * - `{name}-enter-to`    — final enter state
 * - `{name}-exit-from`   — initial exit state
 * - `{name}-exit-active`  — active exit transition
 * - `{name}-exit-to`     — final exit state
 */

import { defineComponent } from './component.js';
import { signal, effect } from './signals.js';
import { nodeToDOM } from './dom.js';
import type { AkashNode } from './types.js';

// --- Types ---

export interface TransitionProps {
  /** Transition name (used as CSS class prefix) */
  name?: string;
  /** Duration in ms (overrides CSS transition duration) */
  duration?: number;
  /** Whether the content is shown */
  when: boolean;
  /** CSS transition mode */
  mode?: 'in-out' | 'out-in';
  /** Callback when enter transition starts */
  onEnter?: (el: HTMLElement) => void;
  /** Callback when enter transition completes */
  onAfterEnter?: (el: HTMLElement) => void;
  /** Callback when exit transition starts */
  onExit?: (el: HTMLElement) => void;
  /** Callback when exit transition completes */
  onAfterExit?: (el: HTMLElement) => void;
}

export interface TransitionClasses {
  enterFrom: string;
  enterActive: string;
  enterTo: string;
  exitFrom: string;
  exitActive: string;
  exitTo: string;
}

// --- CSS class helpers ---

/**
 * Get the transition CSS class names for a given transition name.
 */
export function getTransitionClasses(name: string): TransitionClasses {
  return {
    enterFrom: `${name}-enter-from`,
    enterActive: `${name}-enter-active`,
    enterTo: `${name}-enter-to`,
    exitFrom: `${name}-exit-from`,
    exitActive: `${name}-exit-active`,
    exitTo: `${name}-exit-to`,
  };
}

// --- Programmatic transition API ---

/**
 * Run an enter transition on an element.
 * Returns a promise that resolves when the transition completes.
 */
export function enterTransition(
  el: HTMLElement,
  classes: TransitionClasses,
  duration?: number,
): Promise<void> {
  return new Promise((resolve) => {
    // Apply initial state
    el.classList.add(classes.enterFrom, classes.enterActive);

    // Force reflow to ensure the initial state is applied
    void el.offsetHeight;

    // Transition to final state
    el.classList.remove(classes.enterFrom);
    el.classList.add(classes.enterTo);

    const onEnd = () => {
      el.classList.remove(classes.enterActive, classes.enterTo);
      el.removeEventListener('transitionend', onEnd);
      resolve();
    };

    if (duration !== undefined) {
      setTimeout(onEnd, duration);
    } else {
      el.addEventListener('transitionend', onEnd, { once: true });
      // Fallback timeout in case transitionend never fires
      setTimeout(onEnd, 5000);
    }
  });
}

/**
 * Run an exit transition on an element.
 * Returns a promise that resolves when the transition completes.
 */
export function exitTransition(
  el: HTMLElement,
  classes: TransitionClasses,
  duration?: number,
): Promise<void> {
  return new Promise((resolve) => {
    el.classList.add(classes.exitFrom, classes.exitActive);

    void el.offsetHeight;

    el.classList.remove(classes.exitFrom);
    el.classList.add(classes.exitTo);

    const onEnd = () => {
      el.classList.remove(classes.exitActive, classes.exitTo);
      el.removeEventListener('transitionend', onEnd);
      resolve();
    };

    if (duration !== undefined) {
      setTimeout(onEnd, duration);
    } else {
      el.addEventListener('transitionend', onEnd, { once: true });
      setTimeout(onEnd, 5000);
    }
  });
}

// --- <Transition> component ---

/**
 * <Transition> component.
 *
 * Applies CSS enter/exit transitions when `when` changes.
 *
 * ```html
 * <Transition name="fade" when={isVisible()}>
 *   <div>Content</div>
 * </Transition>
 * ```
 *
 * CSS:
 * ```css
 * .fade-enter-active, .fade-exit-active {
 *   transition: opacity 0.3s;
 * }
 * .fade-enter-from, .fade-exit-to {
 *   opacity: 0;
 * }
 * ```
 */
export const Transition = defineComponent<TransitionProps>((ctx) => {
  const name = ctx.props.name ?? 'akash';
  const classes = getTransitionClasses(name);

  return () => {
    const container = document.createElement('div');
    container.style.display = 'contents';

    if (ctx.props.when) {
      const content = nodeToDOM(ctx.children());
      container.appendChild(content);

      // Run enter transition on mount
      if (content instanceof HTMLElement) {
        ctx.props.onEnter?.(content);
        enterTransition(content, classes, ctx.props.duration).then(() => {
          ctx.props.onAfterEnter?.(content);
        });
      }
    }

    return container;
  };
});

// --- Preset transition styles ---

/**
 * Generate CSS for common transition presets.
 * Inject this into your app's styles or use the CLI to generate it.
 */
export function generateTransitionCSS(name: string, options: {
  property?: string;
  duration?: string;
  easing?: string;
} = {}): string {
  const {
    property = 'all',
    duration = '0.3s',
    easing = 'ease',
  } = options;

  return `
.${name}-enter-active,
.${name}-exit-active {
  transition: ${property} ${duration} ${easing};
}

.${name}-enter-from,
.${name}-exit-to {
  opacity: 0;
}

.${name}-enter-to,
.${name}-exit-from {
  opacity: 1;
}
`.trim();
}
