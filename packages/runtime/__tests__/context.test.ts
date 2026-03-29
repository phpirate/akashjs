import { describe, it, expect } from 'vitest';
import { createContext, provide, inject, pushScope, popScope } from '../src/context.js';

describe('createContext', () => {
  it('creates a context key', () => {
    const ctx = createContext<string>();
    expect(ctx).toBeDefined();
    expect(ctx.defaultValue).toBeUndefined();
  });

  it('creates a context key with default value', () => {
    const ctx = createContext('hello');
    expect(ctx.defaultValue).toBe('hello');
  });
});

describe('provide / inject', () => {
  it('provides and injects a value within a scope', () => {
    const ThemeCtx = createContext<'light' | 'dark'>();
    const scope = pushScope();

    provide(ThemeCtx, 'dark');
    const value = inject(ThemeCtx);
    expect(value).toBe('dark');

    popScope(scope);
  });

  it('injects default value when not provided', () => {
    const ThemeCtx = createContext<string>('light');
    const scope = pushScope();

    const value = inject(ThemeCtx);
    expect(value).toBe('light');

    popScope(scope);
  });

  it('injects fallback value when not provided and no default', () => {
    const Ctx = createContext<string>();
    const scope = pushScope();

    const value = inject(Ctx, 'fallback');
    expect(value).toBe('fallback');

    popScope(scope);
  });

  it('throws when no provider, no default, and no fallback', () => {
    const Ctx = createContext<string>();
    const scope = pushScope();

    expect(() => inject(Ctx)).toThrow('AK0013');

    popScope(scope);
  });

  it('walks up the scope chain to find provider', () => {
    const Ctx = createContext<number>();

    const parentScope = pushScope();
    provide(Ctx, 42);

    // Child scope
    const childScope = pushScope();
    const value = inject(Ctx);
    expect(value).toBe(42);

    popScope(childScope);
    popScope(parentScope);
  });

  it('child scope overrides parent scope', () => {
    const Ctx = createContext<string>();

    const parentScope = pushScope();
    provide(Ctx, 'parent');

    const childScope = pushScope();
    provide(Ctx, 'child');

    expect(inject(Ctx)).toBe('child');

    popScope(childScope);

    // Back in parent scope, should see parent value
    expect(inject(Ctx)).toBe('parent');

    popScope(parentScope);
  });

  it('throws when provide is called outside scope', () => {
    const Ctx = createContext<string>();
    expect(() => provide(Ctx, 'value')).toThrow('AK0010');
  });

  it('throws when inject is called outside scope', () => {
    const Ctx = createContext<string>();
    expect(() => inject(Ctx)).toThrow('AK0012');
  });
});
