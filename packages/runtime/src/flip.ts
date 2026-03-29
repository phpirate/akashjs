/**
 * FLIP animations for list reordering.
 *
 * First-Last-Invert-Play: measure element positions before and after
 * a DOM change, then animate from old to new positions.
 *
 * ```ts
 * const flip = createFlip(listContainer, {
 *   duration: 300,
 *   easing: 'cubic-bezier(0.2, 0, 0, 1)',
 * });
 *
 * // Before changing the list:
 * flip.measure();
 * // Change the DOM (reorder, add, remove)
 * items.set(newOrder);
 * // Animate:
 * flip.animate();
 * ```
 */

// =========================================================================
// Types
// =========================================================================

export interface FlipOptions {
  /** Animation duration in ms (default: 300) */
  duration?: number;
  /** CSS easing (default: 'cubic-bezier(0.2, 0, 0, 1)') */
  easing?: string;
  /** Delay in ms */
  delay?: number;
  /** Only animate elements matching this selector */
  selector?: string;
  /** Key attribute to track elements across reorders (default: 'data-key') */
  keyAttribute?: string;
  /** Callback when animation completes */
  onComplete?: () => void;
}

export interface FlipController {
  /** Measure current positions (call BEFORE DOM change) */
  measure(): void;
  /** Animate from measured positions to current (call AFTER DOM change) */
  animate(): Promise<void>;
  /** Measure and animate in one step using a callback */
  flip(update: () => void): Promise<void>;
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

// =========================================================================
// createFlip
// =========================================================================

/**
 * Create a FLIP animation controller for a container.
 *
 * ```ts
 * const flip = createFlip(container);
 * flip.flip(() => {
 *   // reorder DOM elements here
 *   container.appendChild(container.firstChild); // move first to last
 * });
 * ```
 */
export function createFlip(
  container: HTMLElement,
  options: FlipOptions = {},
): FlipController {
  const {
    duration = 300,
    easing = 'cubic-bezier(0.2, 0, 0, 1)',
    delay = 0,
    selector,
    keyAttribute = 'data-key',
    onComplete,
  } = options;

  let firstPositions = new Map<string, Rect>();

  function getElements(): HTMLElement[] {
    if (selector) {
      return Array.from(container.querySelectorAll<HTMLElement>(selector));
    }
    return Array.from(container.children) as HTMLElement[];
  }

  function getKey(el: HTMLElement): string {
    return el.getAttribute(keyAttribute) ?? el.id ?? '';
  }

  function measure(): void {
    firstPositions = new Map();
    for (const el of getElements()) {
      const key = getKey(el);
      if (key) {
        const rect = el.getBoundingClientRect();
        firstPositions.set(key, {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        });
      }
    }
  }

  function animate(): Promise<void> {
    const elements = getElements();
    const animations: Animation[] = [];

    for (const el of elements) {
      const key = getKey(el);
      const first = firstPositions.get(key);
      if (!first) continue; // New element — could add enter animation

      const last = el.getBoundingClientRect();

      const dx = first.left - last.left;
      const dy = first.top - last.top;
      const dw = first.width / (last.width || 1);
      const dh = first.height / (last.height || 1);

      // Skip if no movement
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(dw - 1) < 0.01 && Math.abs(dh - 1) < 0.01) {
        continue;
      }

      const animation = el.animate(
        [
          {
            transform: `translate(${dx}px, ${dy}px) scale(${dw}, ${dh})`,
          },
          {
            transform: 'translate(0, 0) scale(1, 1)',
          },
        ],
        {
          duration,
          easing,
          delay,
          fill: 'both',
        },
      );

      animations.push(animation);
    }

    // Detect removed elements (in first but not in last)
    const currentKeys = new Set(elements.map(getKey));
    for (const [key, rect] of firstPositions) {
      if (!currentKeys.has(key)) {
        // Element was removed — could add exit animation placeholder
      }
    }

    firstPositions.clear();

    return new Promise<void>((resolve) => {
      if (animations.length === 0) {
        onComplete?.();
        resolve();
        return;
      }

      Promise.all(animations.map((a) => a.finished)).then(() => {
        // Clean up fill
        for (const a of animations) {
          a.cancel();
        }
        onComplete?.();
        resolve();
      });
    });
  }

  return {
    measure,
    animate,
    async flip(update: () => void): Promise<void> {
      measure();
      update();
      // Wait one frame for DOM to update
      await new Promise((r) => requestAnimationFrame(r));
      return animate();
    },
  };
}

/**
 * One-shot FLIP animation helper.
 *
 * ```ts
 * await flip(container, () => {
 *   // reorder items
 * }, { duration: 300 });
 * ```
 */
export async function flip(
  container: HTMLElement,
  update: () => void,
  options?: FlipOptions,
): Promise<void> {
  const ctrl = createFlip(container, options);
  return ctrl.flip(update);
}
