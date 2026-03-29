import { describe, it, expect } from 'vitest';
import { createProgram } from '../src/index.js';

describe('CLI program', () => {
  it('has the correct name', () => {
    const program = createProgram();
    expect(program.name()).toBe('akash');
  });

  it('has version set', () => {
    const program = createProgram();
    expect(program.version()).toBe('0.1.0');
  });

  it('registers all commands', () => {
    const program = createProgram();
    const commandNames = program.commands.map((c) => c.name());

    expect(commandNames).toContain('new');
    expect(commandNames).toContain('dev');
    expect(commandNames).toContain('build');
    expect(commandNames).toContain('generate');
    expect(commandNames).toContain('test');
  });

  it('generate command has component and route subcommands', () => {
    const program = createProgram();
    const generate = program.commands.find((c) => c.name() === 'generate')!;
    const subNames = generate.commands.map((c) => c.name());

    expect(subNames).toContain('component');
    expect(subNames).toContain('route');
  });

  it('generate command has g alias', () => {
    const program = createProgram();
    const generate = program.commands.find((c) => c.name() === 'generate')!;
    expect(generate.aliases()).toContain('g');
  });

  it('component subcommand has c alias', () => {
    const program = createProgram();
    const generate = program.commands.find((c) => c.name() === 'generate')!;
    const component = generate.commands.find((c) => c.name() === 'component')!;
    expect(component.aliases()).toContain('c');
  });

  it('route subcommand has r alias', () => {
    const program = createProgram();
    const generate = program.commands.find((c) => c.name() === 'generate')!;
    const route = generate.commands.find((c) => c.name() === 'route')!;
    expect(route.aliases()).toContain('r');
  });
});
