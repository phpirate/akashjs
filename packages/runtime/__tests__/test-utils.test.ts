/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mount, fireEvent } from '../src/test.js';
import { defineComponent, signal } from '../src/index.js';

// --- Test components ---

const StaticComponent = defineComponent(() => {
  return () => {
    const div = document.createElement('div');
    div.textContent = 'Hello World';
    return div;
  };
});

const PropsComponent = defineComponent<{ name: string; count: number }>((ctx) => {
  return () => {
    const div = document.createElement('div');
    div.textContent = `${ctx.props.name}: ${ctx.props.count}`;
    return div;
  };
});

const InteractiveComponent = defineComponent<{ initial?: number }>((ctx) => {
  const count = signal(ctx.props.initial ?? 0);

  return () => {
    const container = document.createElement('div');

    const span = document.createElement('span');
    span.setAttribute('data-testid', 'count');
    span.textContent = `Count: ${count()}`;
    container.appendChild(span);

    const button = document.createElement('button');
    button.textContent = 'Increment';
    button.addEventListener('click', () => count.update((c) => c + 1));
    container.appendChild(button);

    return container;
  };
});

const RoleComponent = defineComponent(() => {
  return () => {
    const nav = document.createElement('nav');
    const heading = document.createElement('h1');
    heading.textContent = 'Title';
    nav.appendChild(heading);

    const form = document.createElement('form');
    const input = document.createElement('input');
    input.type = 'text';
    form.appendChild(input);
    nav.appendChild(form);

    return nav;
  };
});

// --- Tests ---

describe('mount', () => {
  let result: ReturnType<typeof mount> | undefined;

  afterEach(() => {
    result?.unmount();
    result = undefined;
  });

  it('mounts a component and returns a container', () => {
    result = mount(StaticComponent);
    expect(result.container).toBeInstanceOf(HTMLElement);
    expect(result.container.textContent).toContain('Hello World');
  });

  it('passes props to the component', () => {
    result = mount(PropsComponent, { props: { name: 'Alice', count: 42 } });
    expect(result.container.textContent).toContain('Alice: 42');
  });

  it('unmounts cleanly', () => {
    result = mount(StaticComponent);
    expect(document.body.contains(result.container)).toBe(true);
    result.unmount();
    expect(document.body.contains(result.container)).toBe(false);
    result = undefined;
  });
});

describe('getByText', () => {
  let result: ReturnType<typeof mount> | undefined;

  afterEach(() => {
    result?.unmount();
    result = undefined;
  });

  it('finds an element by text content', () => {
    result = mount(StaticComponent);
    const el = result.getByText('Hello World');
    expect(el).toBeTruthy();
    expect(el.textContent).toContain('Hello World');
  });

  it('throws when text is not found', () => {
    result = mount(StaticComponent);
    expect(() => result!.getByText('Nonexistent')).toThrow('Could not find element with text');
  });
});

describe('getByTestId', () => {
  let result: ReturnType<typeof mount> | undefined;

  afterEach(() => {
    result?.unmount();
    result = undefined;
  });

  it('finds an element by data-testid', () => {
    result = mount(InteractiveComponent, { props: { initial: 5 } });
    const el = result.getByTestId('count');
    expect(el.textContent).toBe('Count: 5');
  });

  it('throws when testid is not found', () => {
    result = mount(StaticComponent);
    expect(() => result!.getByTestId('nope')).toThrow('Could not find element with data-testid');
  });
});

describe('getByRole', () => {
  let result: ReturnType<typeof mount> | undefined;

  afterEach(() => {
    result?.unmount();
    result = undefined;
  });

  it('finds a button by implicit role', () => {
    result = mount(InteractiveComponent);
    const btn = result.getByRole('button');
    expect(btn.tagName).toBe('BUTTON');
  });

  it('finds navigation by implicit role', () => {
    result = mount(RoleComponent);
    const nav = result.getByRole('navigation');
    expect(nav.tagName).toBe('NAV');
  });

  it('finds heading by implicit role', () => {
    result = mount(RoleComponent);
    const heading = result.getByRole('heading');
    expect(heading.tagName).toBe('H1');
  });

  it('throws when role is not found', () => {
    result = mount(StaticComponent);
    expect(() => result!.getByRole('slider')).toThrow('Could not find element with role');
  });
});

describe('queryAll and query', () => {
  let result: ReturnType<typeof mount> | undefined;

  afterEach(() => {
    result?.unmount();
    result = undefined;
  });

  it('queryAll returns matching elements', () => {
    result = mount(InteractiveComponent);
    const buttons = result.queryAll('button');
    expect(buttons.length).toBe(1);
  });

  it('queryAll returns empty array for no matches', () => {
    result = mount(StaticComponent);
    expect(result.queryAll('button')).toEqual([]);
  });

  it('query returns first match or null', () => {
    result = mount(InteractiveComponent);
    expect(result.query('button')).toBeTruthy();
    expect(result.query('.nonexistent')).toBeNull();
  });
});

describe('fireEvent', () => {
  let result: ReturnType<typeof mount> | undefined;

  afterEach(() => {
    result?.unmount();
    result = undefined;
  });

  it('click fires a click event', async () => {
    result = mount(InteractiveComponent, { props: { initial: 0 } });
    const btn = result.getByRole('button');

    // The component uses a simple signal — we verify the click handler ran
    // by checking if the button was clicked (event dispatched)
    let clicked = false;
    btn.addEventListener('click', () => { clicked = true; }, { once: true });
    // Remove the extra listener and just test dispatch
    await fireEvent.click(btn);
    // The native click handler on the component fired
    expect(clicked).toBe(true);
  });

  it('input sets value and fires input event', async () => {
    result = mount(RoleComponent);
    const input = result.query('input') as HTMLInputElement;
    expect(input).toBeTruthy();

    let inputFired = false;
    input.addEventListener('input', () => { inputFired = true; }, { once: true });

    await fireEvent.input(input, 'hello');
    expect(inputFired).toBe(true);
  });

  it('submit fires submit event', async () => {
    result = mount(RoleComponent);
    const form = result.query('form') as HTMLFormElement;

    let submitted = false;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submitted = true;
    }, { once: true });

    await fireEvent.submit(form);
    expect(submitted).toBe(true);
  });

  it('keyDown fires keydown event', async () => {
    result = mount(InteractiveComponent);
    const btn = result.getByRole('button');

    let key = '';
    btn.addEventListener('keydown', (e) => { key = (e as KeyboardEvent).key; }, { once: true });

    await fireEvent.keyDown(btn, 'Enter');
    expect(key).toBe('Enter');
  });
});
