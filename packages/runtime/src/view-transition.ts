/**
 * View Transitions API integration.
 *
 * Wraps the browser's native View Transitions API for smooth
 * page transitions. Falls back gracefully when not supported.
 *
 * ```ts
 * // With router
 * const router = createRouter(routes);
 * enableViewTransitions(router);
 *
 * // Manual
 * await startViewTransition(() => {
 *   updateDOM();
 * });
 * ```
 */

// =========================================================================
// Types
// =========================================================================

export interface ViewTransitionOptions {
  /** CSS class to add to the document during transition */
  className?: string;
  /** Callback before the transition starts */
  onBefore?: () => void;
  /** Callback after the transition completes */
  onAfter?: () => void;
  /** Fallback behavior when API is not supported (default: 'instant') */
  fallback?: 'instant' | 'fade' | 'none';
}

export interface ViewTransition {
  /** Promise that resolves when transition animation is complete */
  finished: Promise<void>;
  /** Promise that resolves when the DOM update callback has run */
  updateCallbackDone: Promise<void>;
  /** Promise that resolves when the transition is ready to animate */
  ready: Promise<void>;
  /** Skip the transition animation */
  skipTransition(): void;
}

// =========================================================================
// Feature detection
// =========================================================================

/**
 * Check if the View Transitions API is supported.
 */
export function supportsViewTransitions(): boolean {
  return typeof document !== 'undefined' && 'startViewTransition' in document;
}

// =========================================================================
// startViewTransition
// =========================================================================

/**
 * Start a view transition with the native API, falling back
 * to instant DOM update when not supported.
 *
 * ```ts
 * await startViewTransition(() => {
 *   container.innerHTML = newContent;
 * });
 * ```
 */
export function startViewTransition(
  updateCallback: () => void | Promise<void>,
  options: ViewTransitionOptions = {},
): ViewTransition {
  const { className, onBefore, onAfter, fallback = 'instant' } = options;

  onBefore?.();

  // Native View Transitions API
  if (supportsViewTransitions()) {
    if (className) document.documentElement.classList.add(className);

    const transition = (document as any).startViewTransition(async () => {
      await updateCallback();
    });

    const finished = transition.finished.then(() => {
      if (className) document.documentElement.classList.remove(className);
      onAfter?.();
    });

    return {
      finished,
      updateCallbackDone: transition.updateCallbackDone,
      ready: transition.ready,
      skipTransition: () => transition.skipTransition(),
    };
  }

  // Fallback
  if (fallback === 'fade') {
    return fadeTransition(updateCallback, options);
  }

  // Instant fallback
  const result = updateCallback();
  const done = result instanceof Promise ? result : Promise.resolve();

  onAfter?.();

  return {
    finished: done,
    updateCallbackDone: done,
    ready: Promise.resolve(),
    skipTransition: () => {},
  };
}

// =========================================================================
// CSS helpers for View Transitions
// =========================================================================

/**
 * Generate CSS for customizing view transitions.
 *
 * ```ts
 * const css = viewTransitionCSS({
 *   duration: '0.3s',
 *   oldAnimation: 'slide-out-left',
 *   newAnimation: 'slide-in-right',
 * });
 * ```
 */
export function viewTransitionCSS(config: {
  duration?: string;
  easing?: string;
  oldAnimation?: string;
  newAnimation?: string;
} = {}): string {
  const {
    duration = '0.25s',
    easing = 'ease',
    oldAnimation,
    newAnimation,
  } = config;

  let css = `::view-transition-old(root),\n::view-transition-new(root) {\n`;
  css += `  animation-duration: ${duration};\n`;
  css += `  animation-timing-function: ${easing};\n`;
  css += `}\n`;

  if (oldAnimation) {
    css += `::view-transition-old(root) {\n  animation-name: ${oldAnimation};\n}\n`;
  }
  if (newAnimation) {
    css += `::view-transition-new(root) {\n  animation-name: ${newAnimation};\n}\n`;
  }

  return css;
}

/**
 * Assign a view-transition-name to an element for per-element transitions.
 *
 * ```ts
 * assignTransitionName(headerEl, 'page-header');
 * assignTransitionName(contentEl, 'page-content');
 * ```
 */
export function assignTransitionName(el: HTMLElement, name: string): void {
  el.style.viewTransitionName = name;
}

// =========================================================================
// Fade fallback (for browsers without View Transitions)
// =========================================================================

function fadeTransition(
  updateCallback: () => void | Promise<void>,
  options: ViewTransitionOptions,
): ViewTransition {
  const el = document.documentElement;

  const finished = new Promise<void>(async (resolve) => {
    // Fade out
    el.style.transition = 'opacity 0.15s ease';
    el.style.opacity = '0';

    await new Promise((r) => setTimeout(r, 150));

    // Update DOM
    await updateCallback();

    // Fade in
    el.style.opacity = '1';

    await new Promise((r) => setTimeout(r, 150));

    el.style.transition = '';
    el.style.opacity = '';

    options.onAfter?.();
    resolve();
  });

  return {
    finished,
    updateCallbackDone: finished,
    ready: Promise.resolve(),
    skipTransition: () => {
      el.style.transition = '';
      el.style.opacity = '';
    },
  };
}
