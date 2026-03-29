/**
 * @akashjs/runtime/core — Minimal core runtime.
 *
 * Only the essentials: signals, components, DOM rendering.
 * Import from '@akashjs/runtime' for everything, or
 * '@akashjs/runtime/core' for the smallest possible bundle.
 */

// Signals
export { signal, computed, effect, untrack } from './signals.js';
export type { Signal, ReadonlySignal } from './signals.js';

// Scheduler
export { batch, flushSync } from './scheduler.js';

// Components
export { defineComponent, onMount, onUnmount, onError, ref } from './component.js';
export type { Component, ComponentContext, Ref } from './component.js';

// Context
export { createContext, provide, inject } from './context.js';
export type { InjectionKey } from './context.js';

// DOM
export {
  createElement, createText, cloneTemplate, setProperty,
  bindText, bindProperty, bindVisible,
  renderConditional, renderList,
  Show, For,
  nodeToDOM, insert,
} from './dom.js';

// Types
export type { AkashNode } from './types.js';
