/**
 * @akashjs/eslint-plugin — ESLint rules for AkashJS.
 *
 * Usage (flat config):
 * ```js
 * import akash from '@akashjs/eslint-plugin';
 * export default [akash.configs.recommended];
 * ```
 *
 * Available rules:
 * - akashjs/no-signal-write-in-computed
 * - akashjs/require-effect-cleanup
 * - akashjs/no-direct-signal-mutation
 */

import { noSignalWriteInComputed } from './rules/no-signal-write-in-computed.js';
import { requireEffectCleanup } from './rules/require-effect-cleanup.js';
import { noDirectSignalMutation } from './rules/no-direct-signal-mutation.js';
import { processor } from './processor.js';

const rules = {
  'no-signal-write-in-computed': noSignalWriteInComputed,
  'require-effect-cleanup': requireEffectCleanup,
  'no-direct-signal-mutation': noDirectSignalMutation,
};

const configs = {
  recommended: {
    plugins: { akashjs: { rules } },
    rules: {
      'akashjs/no-signal-write-in-computed': 'error',
      'akashjs/require-effect-cleanup': 'warn',
      'akashjs/no-direct-signal-mutation': 'warn',
    },
  },
};

export default { rules, configs, processors: { akash: processor } };
export { rules, configs, processor };
