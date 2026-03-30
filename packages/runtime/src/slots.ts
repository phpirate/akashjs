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
  if (slot && typeof slot === 'function') {
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
 *
 * Supports two call patterns:
 * - `hasSlot(slotFn)` — check a single slot function
 * - `hasSlot(slots, 'name')` — look up a named slot in a Slots object
 */
export function hasSlot(slot: SlotFn | Slots | undefined, name?: string): boolean {
  if (!slot) return false;
  // If a name is provided, look up the slot in the record
  const fn = name && typeof slot === 'object' ? (slot as Slots)[name] : slot as SlotFn;
  if (!fn || typeof fn !== 'function') return false;
  const content = fn();
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
  slotNames?: (keyof T)[],
): Slots {
  const slots: Slots = {};
  // If no slotNames provided, treat all function props as slots
  const keys = slotNames ?? Object.keys(props) as (keyof T)[];
  for (const name of keys) {
    const value = props[name];
    if (typeof value === 'function') {
      slots[name as string] = value as SlotFn;
    }
  }
  return slots;
}
