import { describe, it, expect, beforeEach } from 'vitest';
import {
  defineProvider,
  createInjector,
  injectProvider,
  clearProviders,
} from '../src/di.js';

describe('di', () => {
  beforeEach(() => {
    clearProviders();
  });

  it('defineProvider creates provider with _type and factory', () => {
    const provider = defineProvider({ factory: () => 42 });
    expect(provider._type).toBe('provider');
    expect(typeof provider.factory).toBe('function');
    expect(provider.factory()).toBe(42);
  });

  it('createInjector.get returns factory result', () => {
    const NumProvider = defineProvider({ factory: () => 99 });
    const injector = createInjector();
    expect(injector.get(NumProvider)).toBe(99);
  });

  it('createInjector.get with useValue returns value', () => {
    const StrProvider = defineProvider({ factory: () => 'default' });
    const injector = createInjector([
      { provide: StrProvider, useValue: 'overridden' },
    ]);
    expect(injector.get(StrProvider)).toBe('overridden');
  });

  it('createInjector.get with useFactory returns factory result', () => {
    const Provider = defineProvider({ factory: () => 'original' });
    const injector = createInjector([
      { provide: Provider, useFactory: () => 'custom' },
    ]);
    expect(injector.get(Provider)).toBe('custom');
  });

  it('child injector falls back to parent', () => {
    const Provider = defineProvider({ factory: () => 'from-parent' });
    const parent = createInjector([
      { provide: Provider, useValue: 'parent-value' },
    ]);
    const child = parent.createChild();
    expect(child.get(Provider)).toBe('parent-value');
  });

  it('providedIn root creates singleton', () => {
    let callCount = 0;
    const Singleton = defineProvider({
      factory: () => {
        callCount++;
        return 'singleton';
      },
      providedIn: 'root',
    });

    const injector1 = createInjector();
    const injector2 = createInjector();

    expect(injector1.get(Singleton)).toBe('singleton');
    expect(injector2.get(Singleton)).toBe('singleton');
    expect(callCount).toBe(1);
  });

  it('injectProvider returns factory result', () => {
    const Provider = defineProvider({ factory: () => 'injected-value' });
    const result = injectProvider(Provider);
    expect(result).toBe('injected-value');
  });

  it('clearProviders clears root instances', () => {
    let callCount = 0;
    const Singleton = defineProvider({
      factory: () => {
        callCount++;
        return `instance-${callCount}`;
      },
      providedIn: 'root',
    });

    const injector = createInjector();
    expect(injector.get(Singleton)).toBe('instance-1');

    clearProviders();

    const injector2 = createInjector();
    expect(injector2.get(Singleton)).toBe('instance-2');
    expect(callCount).toBe(2);
  });
});
