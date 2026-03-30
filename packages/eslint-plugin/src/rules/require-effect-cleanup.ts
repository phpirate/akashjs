/**
 * Rule: require-effect-cleanup
 *
 * Warns when effect() registers event listeners or timers
 * without returning a cleanup function.
 */

const SIDE_EFFECT_METHODS = new Set([
  'addEventListener', 'setTimeout', 'setInterval', 'requestAnimationFrame',
]);

export const requireEffectCleanup = {
  meta: {
    type: 'suggestion' as const,
    docs: {
      description: 'Require cleanup functions in effects that register listeners or timers',
      recommended: true,
    },
    messages: {
      missingCleanup: 'Effect uses {{method}}() but does not return a cleanup function. This may cause memory leaks.',
    },
    schema: [],
  },

  create(context: any) {
    let effectCallbackNode: any = null;
    let hasSideEffect = false;
    let hasReturn = false;
    let sideEffectName = '';

    return {
      CallExpression(node: any) {
        // Detect effect(() => { ... })
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'effect' &&
          node.arguments[0]
        ) {
          effectCallbackNode = node.arguments[0];
          hasSideEffect = false;
          hasReturn = false;
          sideEffectName = '';
        }

        // Inside effect callback, detect side-effect calls
        if (effectCallbackNode && node.callee.type === 'MemberExpression') {
          const prop = node.callee.property;
          if (prop.type === 'Identifier' && SIDE_EFFECT_METHODS.has(prop.name)) {
            hasSideEffect = true;
            sideEffectName = prop.name;
          }
        }
        if (effectCallbackNode && node.callee.type === 'Identifier') {
          if (SIDE_EFFECT_METHODS.has(node.callee.name)) {
            hasSideEffect = true;
            sideEffectName = node.callee.name;
          }
        }
      },

      ReturnStatement(node: any) {
        if (effectCallbackNode) {
          hasReturn = true;
        }
      },

      'CallExpression:exit'(node: any) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'effect' &&
          node.arguments[0] === effectCallbackNode
        ) {
          if (hasSideEffect && !hasReturn) {
            context.report({
              node: effectCallbackNode,
              messageId: 'missingCleanup',
              data: { method: sideEffectName },
            });
          }
          effectCallbackNode = null;
        }
      },
    };
  },
};
