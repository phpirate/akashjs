/**
 * Slot helpers for content projection.
 *
 * Children are passed as the default slot. Named slots are
 * passed as render-function props. These helpers make working
 * with both patterns consistent.
 */

import { nodeToDOM } from './dom.js';
import type { AkashNode } from './types.js';

/** A slot is a function that returns renderable content */
export type SlotFn = () => AkashNode;

/** Named slots map */
export type Slots = Record<string, SlotFn>;

/**
 * Render a slot (named or default) into a DOM node.
 * Returns a placeholder comment if the slot is not provided.
 *
 * ```ts
 * const Card = defineComponent<{ header?: SlotFn }>((ctx) => {
 *   return () => {
 *     const el = document.createElement('div');
 *     el.appendChild(renderSlot(ctx.props.header));
 *     el.appendChild(renderSlot(ctx.children));
 *     return el;
 *   };
 * });
 * ```
 */
export function renderSlot(slot: SlotFn | undefined, fallback?: SlotFn): Node {
  if (slot) {
    const content = slot();
    return nodeToDOM(content);
  }
  if (fallback) {
    return nodeToDOM(fallback());
  }
  return document.createComment('empty slot');
}

/**
 * Check if a slot has content.
 */
export function hasSlot(slot: SlotFn | undefined): boolean {
  if (!slot) return false;
  const content = slot();
  if (content == null || content === false) return false;
  if (typeof content === 'string' && content.trim() === '') return false;
  return true;
}

/**
 * Create a named slots object from component props.
 * Extracts all function-typed props as named slots.
 *
 * ```ts
 * const Layout = defineComponent<{
 *   header: SlotFn;
 *   footer: SlotFn;
 * }>((ctx) => {
 *   const slots = createSlots(ctx.props, ['header', 'footer']);
 *   return () => {
 *     const el = document.createElement('div');
 *     el.appendChild(renderSlot(slots.header));
 *     el.appendChild(renderSlot(ctx.children));
 *     el.appendChild(renderSlot(slots.footer));
 *     return el;
 *   };
 * });
 * ```
 */
export function createSlots<T extends Record<string, unknown>>(
  props: T,
  slotNames: (keyof T)[],
): Slots {
  const slots: Slots = {};
  for (const name of slotNames) {
    const value = props[name];
    if (typeof value === 'function') {
      slots[name as string] = value as SlotFn;
    }
  }
  return slots;
}
