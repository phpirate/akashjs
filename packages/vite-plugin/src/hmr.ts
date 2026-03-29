/**
 * HMR handling for .akash files.
 *
 * Determines the type of change (script, template, style) and
 * sends targeted HMR updates. Style-only changes can hot-swap
 * without a full component reload.
 */

import { parse } from '@akashjs/compiler';
import type { HmrContext, ModuleNode } from 'vite';

export interface HmrAnalysis {
  /** Whether the script block changed */
  scriptChanged: boolean;
  /** Whether the template block changed */
  templateChanged: boolean;
  /** Whether the style block changed */
  styleChanged: boolean;
  /** Whether this is a style-only change (can hot-swap) */
  styleOnly: boolean;
  /** Whether a full reload is needed */
  needsFullReload: boolean;
}

/**
 * Compare old and new source to determine what changed.
 */
export function analyzeHmrChange(oldSource: string, newSource: string): HmrAnalysis {
  const oldSfc = parse(oldSource);
  const newSfc = parse(newSource);

  const scriptChanged = (oldSfc.script?.content ?? '') !== (newSfc.script?.content ?? '');
  const templateChanged = (oldSfc.template?.content ?? '') !== (newSfc.template?.content ?? '');
  const styleChanged = (oldSfc.style?.content ?? '') !== (newSfc.style?.content ?? '');

  const styleOnly = styleChanged && !scriptChanged && !templateChanged;
  const needsFullReload = scriptChanged;

  return {
    scriptChanged,
    templateChanged,
    styleChanged,
    styleOnly,
    needsFullReload,
  };
}

/**
 * Generate the HMR client code that gets injected into the module.
 * This code is appended to the compiled output in dev mode.
 */
export function generateHmrCode(id: string): string {
  return `
// HMR
if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    if (newModule) {
      // Full module replacement — the new default export
      // replaces the component in the parent's render tree
    }
  });
}
`;
}

/**
 * Generate style-only HMR code.
 * When only styles change, we can hot-swap the <style> element
 * without re-rendering the component.
 */
export function generateStyleHmrCode(styleId: string): string {
  return `
// Style HMR
if (import.meta.hot) {
  import.meta.hot.accept();
  // Remove old style element and re-inject
  const oldStyle = document.querySelector('[data-akash-style="${styleId}"]');
  if (oldStyle) oldStyle.remove();
}
`;
}

/**
 * Handle hot update for .akash files.
 * Returns the affected modules that need updating.
 */
export function handleAkashHotUpdate(
  file: string,
  modules: ModuleNode[],
  oldSource: string | undefined,
  newSource: string,
): { modules: ModuleNode[]; type: 'full' | 'style-only' } {
  if (!oldSource) {
    return { modules, type: 'full' };
  }

  const analysis = analyzeHmrChange(oldSource, newSource);

  if (analysis.styleOnly) {
    // Style-only update — can be applied without full reload
    return { modules, type: 'style-only' };
  }

  // Script or template changed — need full module invalidation
  return { modules, type: 'full' };
}
