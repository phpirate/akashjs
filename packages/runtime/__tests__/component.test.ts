/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest';
import { signal } from '../src/signals.js';
import { flushSync } from '../src/scheduler.js';
import { defineComponent, onMount, onUnmount, onError, ref } from '../src/component.js';
import { createContext, provide, inject } from '../src/context.js';
import { createElement, createText, bindText } from '../src/dom.js';

describe('defineComponent', () => {
  it('creates a component that returns a DOM node', () => {
    const Greeting = defineComponent(() => {
      return () => {
        const el = createElement('div');
        el.textContent = 'Hello, AkashJS!';
        return el;
      };
    });

    const node = Greeting({});
    expect(node).toBeInstanceOf(HTMLElement);
    expect((node as HTMLElement).textContent).toBe('Hello, AkashJS!');
  });

  it('receives typed props', () => {
    const Display = defineComponent<{ message: string }>((ctx) => {
      return () => {
        const el = createElement('span');
        el.textContent = ctx.props.message;
        return el;
      };
    });

    const node = Display({ message: 'test' });
    expect((node as HTMLElement).textContent).toBe('test');
  });

  it('receives children', () => {
    const Wrapper = defineComponent((ctx) => {
      return () => {
        const el = createElement('div');
        const childContent = ctx.children();
        if (typeof childContent === 'string') {
          el.textContent = childContent;
        }
        return el;
      };
    });

    const node = Wrapper({ children: () => 'child content' });
    expect((node as HTMLElement).textContent).toBe('child content');
  });

  it('supports signals inside components', () => {
    const Counter = defineComponent(() => {
      const count = signal(0);
      return () => {
        const el = createElement('div');
        const text = createText('');
        el.appendChild(text);
        bindText(text, () => `Count: ${count()}`);
        return el;
      };
    });

    const node = Counter({});
    flushSync();
    expect((node as HTMLElement).textContent).toBe('Count: 0');
  });
});

describe('onMount', () => {
  it('calls mount callback after component creation', async () => {
    const spy = vi.fn();

    const Comp = defineComponent(() => {
      onMount(spy);
      return () => createElement('div');
    });

    Comp({});
    expect(spy).not.toHaveBeenCalled();

    // Mount runs as microtask
    await new Promise((r) => queueMicrotask(r));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('registers cleanup from mount callback', async () => {
    const cleanup = vi.fn();

    const Comp = defineComponent(() => {
      onMount(() => cleanup);
      return () => createElement('div');
    });

    Comp({});
    await new Promise((r) => queueMicrotask(r));
    expect(cleanup).not.toHaveBeenCalled();
    // cleanup would be called on unmount
  });
});

describe('onError', () => {
  it('catches errors during setup', () => {
    const spy = vi.fn();

    const Comp = defineComponent(() => {
      onError(spy);
      throw new Error('setup failed');
    });

    const node = Comp({});
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('ref', () => {
  it('creates a ref with undefined initial value', () => {
    const elRef = ref<HTMLDivElement>();
    expect(elRef.current).toBeUndefined();
  });

  it('can be assigned manually', () => {
    const elRef = ref<HTMLDivElement>();
    const el = createElement('div') as HTMLDivElement;
    elRef.current = el;
    expect(elRef.current).toBe(el);
  });
});

describe('provide/inject in components', () => {
  it('provides context from parent to child', () => {
    const ThemeCtx = createContext<string>();
    let injectedValue: string | undefined;

    const Child = defineComponent(() => {
      injectedValue = inject(ThemeCtx);
      return () => createElement('div');
    });

    const Parent = defineComponent(() => {
      provide(ThemeCtx, 'dark');
      return () => {
        const el = createElement('div');
        el.appendChild(Child({}));
        return el;
      };
    });

    Parent({});
    expect(injectedValue).toBe('dark');
  });

  it('uses default value when no provider', () => {
    const ThemeCtx = createContext<string>('light');
    let injectedValue: string | undefined;

    const Comp = defineComponent(() => {
      injectedValue = inject(ThemeCtx);
      return () => createElement('div');
    });

    Comp({});
    expect(injectedValue).toBe('light');
  });
});

describe('onMount / onUnmount outside component', () => {
  it('throws when called outside defineComponent', () => {
    expect(() => onMount(() => {})).toThrow('AK0020');
    expect(() => onUnmount(() => {})).toThrow('AK0021');
    expect(() => onError(() => {})).toThrow('AK0022');
  });
});
