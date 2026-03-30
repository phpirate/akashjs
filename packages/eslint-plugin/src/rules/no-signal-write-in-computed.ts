/**
 * Rule: no-signal-write-in-computed
 *
 * Forbids calling .set() or .update() inside computed() callbacks.
 * Writing to signals inside computed is a bug — the write is lost
 * on the next evaluation.
 */

export const noSignalWriteInComputed = {
  meta: {
    type: 'problem' as const,
    docs: {
      description: 'Disallow signal writes (.set/.update) inside computed()',
      recommended: true,
    },
    messages: {
      noWriteInComputed: 'Do not call .{{method}}() inside computed(). Signal writes inside computed are lost on re-evaluation.',
    },
    schema: [],
  },

  create(context: any) {
    let computedDepth = 0;

    return {
      CallExpression(node: any) {
        // Track entering computed()
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'computed'
        ) {
          computedDepth++;
        }

        // Check for .set() or .update() inside computed
        if (computedDepth > 0 && node.callee.type === 'MemberExpression') {
          const prop = node.callee.property;
          if (
            prop.type === 'Identifier' &&
            (prop.name === 'set' || prop.name === 'update')
          ) {
            context.report({
              node,
              messageId: 'noWriteInComputed',
              data: { method: prop.name },
            });
          }
        }
      },

      'CallExpression:exit'(node: any) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'computed'
        ) {
          computedDepth--;
        }
      },
    };
  },
};
