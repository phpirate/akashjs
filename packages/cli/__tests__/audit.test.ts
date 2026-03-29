import { describe, it, expect } from 'vitest';
import { registerAuditCommand } from '../src/commands/audit.js';
import { createProgram } from '../src/index.js';

describe('registerAuditCommand', () => {
  it("adds 'audit' command to program", () => {
    const program = createProgram();
    const auditCmd = program.commands.find((cmd) => cmd.name() === 'audit');
    expect(auditCmd).toBeDefined();
    expect(auditCmd!.description()).toBe('Scan for security issues in your code');
  });
});
