/**
 * AkashJS Vite plugin.
 *
 * Transforms .akash single-file components during development
 * and production builds. Handles HMR for style-only and
 * template-only changes.
 */

import { compile, parse, createLanguageService } from '@akashjs/compiler';
import { transform as esbuildTransform } from 'esbuild';
import type { Plugin } from 'vite';
import { analyzeHmrChange, generateHmrCode } from './hmr.js';
import { generateOverlayCode, generateOverlayClearCode } from './overlay.js';
import { generateDts } from './dts.js';
import { writeFileSync, existsSync } from 'fs';

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

    async transform(code, id) {
      if (!id.endsWith('.akash')) return null;

      let result;
      let sfc;

      try {
        // Check if the script block uses TypeScript
        sfc = parse(code);
        result = compile(code, {
          filename: id,
          dev: !isProduction,
        });
      } catch (err) {
        // Compile error — show overlay in dev, throw in prod
        if (isProduction) throw err;

        const message = err instanceof Error ? err.message : String(err);
        const overlayJs = generateOverlayCode(
          [{ message, code: 'COMPILE_ERROR' }],
          id,
        );
        return { code: overlayJs, map: null };
      }

      const isTS = sfc.script?.lang === 'ts' || sfc.script?.lang === 'typescript';

      let output = result.code;

      // Strip TypeScript annotations FIRST (before any overlay injection)
      if (isTS) {
        const stripped = await esbuildTransform(output, {
          loader: 'ts',
          sourcemap: false,
        });
        output = stripped.code;
      }

      // In dev mode, run diagnostics and show overlay for type errors
      // This happens AFTER esbuild so overlay HTML doesn't break TS parsing
      if (!isProduction) {
        try {
          const ls = createLanguageService();
          const diags = ls.getDiagnostics(code, id);
          // Filter out module resolution errors (Vite handles imports, not TS)
          const errors = diags.filter(d =>
            d.severity === 'error' &&
            !d.code?.startsWith('TS2307') && // Cannot find module
            !d.code?.startsWith('TS2306') && // Not a module
            !d.code?.startsWith('TS2792')    // Cannot find module (dynamic)
          );
          if (errors.length > 0) {
            output += generateOverlayCode(
              errors.map(d => ({ message: d.message, line: d.range.start.line, column: d.range.start.character, code: d.code })),
              id,
            );
          } else {
            output += generateOverlayClearCode();
          }
        } catch {
          // Language service failed — skip diagnostics silently
        }
      }

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

      // Auto-generate .d.ts for TypeScript cross-file type checking
      if (!isProduction) {
        try {
          const dtsPath = id + '.d.ts';
          const dtsContent = generateDts(code);
          writeFileSync(dtsPath, dtsContent);
        } catch { /* ignore dts generation errors */ }
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
