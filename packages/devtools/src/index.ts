// @akashjs/devtools — Entry point

export {
  createDevToolsHook,
  recordEvent,
  trackComponent,
  untrackComponent,
  trackSignal,
  updateTrackedSignal,
  nextComponentId,
} from './hook.js';

export type {
  DevToolsHook,
  ComponentInfo,
  ComponentTreeNode,
  SignalInfo,
  SignalSnapshot,
  DevToolsEvent,
} from './hook.js';

export { createInspector, enableInspector } from './inspector.js';
export type { Inspector, InspectorOptions, InspectedElement } from './inspector.js';

import { createDevToolsHook } from './hook.js';

/**
 * Install the devtools hook on the window object.
 * Call this in dev mode to enable the browser extension.
 *
 * ```ts
 * if (import.meta.env.DEV) {
 *   installDevTools();
 * }
 * ```
 */
export function installDevTools(): void {
  if (typeof window === 'undefined') return;

  const hook = createDevToolsHook();
  (window as any).__AKASH_DEVTOOLS__ = hook;
  hook.connected = true;
}
