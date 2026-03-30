/**
 * Rule: no-direct-signal-mutation
 *
 * Warns against directly assigning to a signal instead of using .set():
 *   count = 5;      // BAD — reassigns the variable, doesn't update signal
 *   count.set(5);   // GOOD
 */

export const noDirectSignalMutation = {
  meta: {
    type: 'problem' as const,
    docs: {
      description: 'Disallow direct assignment to signal variables (use .set() instead)',
      recommended: true,
    },
    messages: {
      useSet: 'Direct assignment to "{{name}}" does not update the signal. Use {{name}}.set(value) or {{name}}.update(fn) instead.',
    },
    schema: [],
  },

  create(context: any) {
    const signalVars = new Set<string>();

    return {
      VariableDeclarator(node: any) {
        // Track: const x = signal(...)
        if (
          node.init?.type === 'CallExpression' &&
          node.init.callee?.type === 'Identifier' &&
          node.init.callee.name === 'signal' &&
          node.id?.type === 'Identifier'
        ) {
          signalVars.add(node.id.name);
        }
      },

      AssignmentExpression(node: any) {
        // Flag: x = value (where x was created with signal())
        if (
          node.left.type === 'Identifier' &&
          signalVars.has(node.left.name)
        ) {
          context.report({
            node,
            messageId: 'useSet',
            data: { name: node.left.name },
          });
        }
      },
    };
  },
};
