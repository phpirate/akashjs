/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi } from 'vitest';
import { definePlugin, createApp } from '../src/plugin.js';
import { defineComponent } from '../src/component.js';

const TestComponent = defineComponent(() => {
  return () => {
    const el = document.createElement('div');
    el.textContent = 'Hello';
    return el;
  };
});

describe('definePlugin', () => {
  it('returns the plugin unchanged', () => {
    const plugin = definePlugin({
      name: 'test',
      setup: () => {},
    });
    expect(plugin.name).toBe('test');
  });
});

describe('createApp', () => {
  it('mounts a component to a DOM element', () => {
    const container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);

    const app = createApp(TestComponent);
    app.mount(container);

    expect(container.textContent).toContain('Hello');
    app.unmount();
    container.remove();
  });

  it('mounts via CSS selector', () => {
    const container = document.createElement('div');
    container.id = 'test-app';
    document.body.appendChild(container);

    const app = createApp(TestComponent);
    app.mount('#test-app');

    expect(container.textContent).toContain('Hello');
    app.unmount();
    container.remove();
  });

  it('throws when mount target not found', () => {
    const app = createApp(TestComponent);
    expect(() => app.mount('#nonexistent')).toThrow('Mount target not found');
  });

  it('calls plugin setup on mount', () => {
    const setup = vi.fn();
    const plugin = definePlugin({ name: 'test', setup });

    const container = document.createElement('div');
    document.body.appendChild(container);

    const app = createApp(TestComponent);
    app.use(plugin);
    app.mount(container);

    expect(setup).toHaveBeenCalledTimes(1);
    app.unmount();
    container.remove();
  });

  it('supports config', () => {
    const setup = vi.fn();
    const plugin = definePlugin({
      name: 'config-test',
      setup(ctx) {
        setup(ctx.config);
      },
    });

    const container = document.createElement('div');
    document.body.appendChild(container);

    const app = createApp(TestComponent);
    app.config('debug', true).use(plugin).mount(container);

    expect(setup).toHaveBeenCalledWith({ debug: true });
    app.unmount();
    container.remove();
  });

  it('handles global error handler', () => {
    const errorHandler = vi.fn();
    const BadComponent = defineComponent(() => {
      throw new Error('boom');
    });

    const container = document.createElement('div');
    document.body.appendChild(container);

    const plugin = definePlugin({
      name: 'error-handler',
      setup(ctx) {
        ctx.onError(errorHandler);
      },
    });

    const app = createApp(BadComponent);
    app.use(plugin).mount(container);

    expect(errorHandler).toHaveBeenCalledTimes(1);
    expect(errorHandler.mock.calls[0][0].message).toBe('boom');
    container.remove();
  });

  it('chains use() and config()', () => {
    const app = createApp(TestComponent);
    const result = app.use(definePlugin({ name: 'a', setup() {} }))
      .config('x', 1);
    expect(result).toBe(app);
  });

  it('unmounts cleanly', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const app = createApp(TestComponent);
    app.mount(container);
    expect(container.childNodes.length).toBeGreaterThan(0);

    app.unmount();
    expect(container.childNodes.length).toBe(0);
    container.remove();
  });
});
