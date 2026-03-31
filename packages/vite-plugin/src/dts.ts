/**
 * Auto-generate .d.ts type declarations for .akash files.
 *
 * Each .akash file gets a corresponding .akash.d.ts with a typed
 * component export, enabling full TypeScript checking across files.
 */

import { parse } from '@akashjs/compiler';

/**
 * Generate a .d.ts declaration for a .akash file.
 *
 * Input:  Counter.akash with `interface Props { initial: number; }`
 * Output: `declare const _default: Component<{ initial: number; }>; export default _default;`
 */
export function generateDts(source: string): string {
  const sfc = parse(source);
  let propsType = 'Record<string, unknown>';

  if (sfc.script) {
    // Extract Props interface body
    const propsMatch = /interface\s+Props\s*(?:extends\s+[\w,\s]+\s*)?\{/.exec(sfc.script.content);
    if (propsMatch) {
      const openIdx = sfc.script.content.indexOf('{', propsMatch.index + propsMatch[0].length - 1);
      let depth = 1;
      let pos = openIdx + 1;
      while (pos < sfc.script.content.length && depth > 0) {
        if (sfc.script.content[pos] === '{') depth++;
        else if (sfc.script.content[pos] === '}') depth--;
        pos++;
      }
      const body = sfc.script.content.slice(openIdx, pos);
      propsType = body;
    }
  }

  return [
    `import type { Component } from '@akashjs/runtime';`,
    `declare const _default: Component<${propsType}>;`,
    `export default _default;`,
    '',
  ].join('\n');
}
