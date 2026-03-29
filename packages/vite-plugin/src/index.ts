/**
 * AkashJS Vite plugin.
 *
 * Transforms .akash single-file components during development
 * and production builds. Handles HMR for style-only and
 * template-only changes.
 */

import { compile } from '@akashjs/compiler';
import type { Plugin } from 'vite';
import { analyzeHmrChange, generateHmrCode } from './hmr.js';

export interface AkashPluginOptions {
  /** Include file patterns (default: .akash files) */
  include?: string[];
  /** CSS injection mode: 'external' extracts CSS, 'injected' inlines it */
  css?: 'external' | 'injected';
}

export default function akash(options: AkashPluginOptions = {}): Plugin {
  const cssMode = options.css ?? 'injected';
  let isProduction = false;

  // Cache previous source for HMR diffing
  const sourceCache = new Map<string, string>();

  return {
    name: 'akash',
    enforce: 'pre',

    configResolved(config) {
      isProduction = config.command === 'build';
    },

    transform(code, id) {
      if (!id.endsWith('.akash')) return null;

      const result = compile(code, {
        filename: id,
        dev: !isProduction,
      });

      let output = result.code;

      // Inject CSS
      if (result.css) {
        if (cssMode === 'injected') {
          const cssCode = result.css.replace(/`/g, '\\`').replace(/\\/g, '\\\\');
          const styleId = id.replace(/[^a-zA-Z0-9]/g, '_');
          output += `\n// Injected scoped styles\n`;
          // Remove old style before appending new one (critical for HMR)
          output += `const __akash_old_style = document.querySelector('[data-akash-style="${styleId}"]');\n`;
          output += `if (__akash_old_style) __akash_old_style.remove();\n`;
          output += `const __akash_style = document.createElement('style');\n`;
          output += `__akash_style.setAttribute('data-akash-style', '${styleId}');\n`;
          output += `__akash_style.textContent = \`${cssCode}\`;\n`;
          output += `document.head.appendChild(__akash_style);\n`;
        }
      }

      // Add HMR support in dev mode
      if (!isProduction) {
        output += generateHmrCode(id);
      }

      // Cache source for HMR diffing
      sourceCache.set(id, code);

      return {
        code: output,
        map: null, // TODO: integrate SourceMapBuilder
      };
    },

    handleHotUpdate({ file, server, modules, read }) {
      if (!file.endsWith('.akash')) return;

      const oldSource = sourceCache.get(file);

      if (oldSource) {
        // Read new source to analyze what changed
        read().then((newSource) => {
          const analysis = analyzeHmrChange(oldSource, newSource);

          if (analysis.styleOnly) {
            // Style-only change — Vite will handle the CSS update
            // via the style HMR code we injected
            server.ws.send({
              type: 'custom',
              event: 'akash:style-update',
              data: { file },
            });
          }
        });
      }

      // Always return modules to invalidate — the HMR code in the
      // client handles the actual update strategy
      return modules;
    },
  };
}

export { akash };
