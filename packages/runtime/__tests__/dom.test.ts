/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from 'vitest';
import { signal } from '../src/signals.js';
import { flushSync } from '../src/scheduler.js';
import {
  createElement,
  createText,
  cloneTemplate,
  setProperty,
  bindText,
  bindProperty,
  bindVisible,
  renderConditional,
  renderList,
  nodeToDOM,
  insert,
} from '../src/dom.js';

describe('createElement', () => {
  it('creates an element with the given tag', () => {
    const el = createElement('div');
    expect(el.tagName).toBe('DIV');
  });

  it('sets static attributes', () => {
    const el = createElement('div', { class: 'test', id: 'main' });
    expect(el.className).toBe('test');
    expect(el.id).toBe('main');
  });
});

describe('createText', () => {
  it('creates a text node', () => {
    const text = createText('hello');
    expect(text.textContent).toBe('hello');
  });
});

describe('cloneTemplate', () => {
  it('clones static HTML into a DocumentFragment', () => {
    const fragment = cloneTemplate('<div><span>hello</span></div>');
    expect(fragment.childNodes.length).toBe(1);
    expect((fragment.firstChild as HTMLElement).tagName).toBe('DIV');
    expect(fragment.firstChild!.textContent).toBe('hello');
  });
});

describe('setProperty', () => {
  it('sets className', () => {
    const el = createElement('div');
    setProperty(el, 'class', 'active');
    expect(el.className).toBe('active');
  });

  it('sets style as object', () => {
    const el = createElement('div');
    setProperty(el, 'style', { color: 'red', fontSize: '14px' });
    expect(el.style.color).toBe('red');
    expect(el.style.fontSize).toBe('14px');
  });

  it('adds event listeners for on* properties', () => {
    const el = createElement('button');
    let clicked = false;
    setProperty(el, 'onClick', () => { clicked = true; });
    el.click();
    expect(clicked).toBe(true);
  });

  it('sets boolean attributes', () => {
    const el = createElement('input') as HTMLInputElement;
    setProperty(el, 'disabled', true);
    expect(el.disabled).toBe(true);
    setProperty(el, 'disabled', false);
    expect(el.hasAttribute('disabled')).toBe(false);
  });

  it('sets data attributes', () => {
    const el = createElement('div');
    setProperty(el, 'data-id', '42');
    expect(el.getAttribute('data-id')).toBe('42');
  });
});

describe('bindText', () => {
  it('reactively updates text content', () => {
    const name = signal('world');
    const text = createText('');
    bindText(text, () => `Hello, ${name()}!`);
    flushSync();
    expect(text.textContent).toBe('Hello, world!');

    name.set('AkashJS');
    flushSync();
    expect(text.textContent).toBe('Hello, AkashJS!');
  });
});

describe('bindProperty', () => {
  it('reactively updates an attribute', () => {
    const isActive = signal(false);
    const el = createElement('div');
    bindProperty(el, 'class', () => (isActive() ? 'active' : 'inactive'));
    flushSync();
    expect(el.className).toBe('inactive');

    isActive.set(true);
    flushSync();
    expect(el.className).toBe('active');
  });
});

describe('bindVisible', () => {
  it('toggles display based on signal', () => {
    const show = signal(true);
    const el = createElement('div');
    bindVisible(el, () => show());
    flushSync();
    expect(el.style.display).toBe('');

    show.set(false);
    flushSync();
    expect(el.style.display).toBe('none');
  });
});

describe('renderConditional', () => {
  it('renders true branch when condition is true', () => {
    const container = createElement('div');
    const anchor = document.createComment('');
    container.appendChild(anchor);

    const show = signal(true);
    renderConditional(
      container,
      anchor,
      () => show(),
      () => createText('visible'),
      () => createText('hidden'),
    );
    flushSync();
    expect(container.textContent).toBe('visible');
  });

  it('renders false branch when condition is false', () => {
    const container = createElement('div');
    const anchor = document.createComment('');
    container.appendChild(anchor);

    const show = signal(false);
    renderConditional(
      container,
      anchor,
      () => show(),
      () => createText('visible'),
      () => createText('hidden'),
    );
    flushSync();
    expect(container.textContent).toBe('hidden');
  });

  it('swaps branches when condition changes', () => {
    const container = createElement('div');
    const anchor = document.createComment('');
    container.appendChild(anchor);

    const show = signal(true);
    renderConditional(
      container,
      anchor,
      () => show(),
      () => createText('ON'),
      () => createText('OFF'),
    );
    flushSync();
    expect(container.textContent).toBe('ON');

    show.set(false);
    flushSync();
    expect(container.textContent).toBe('OFF');

    show.set(true);
    flushSync();
    expect(container.textContent).toBe('ON');
  });
});

describe('renderList', () => {
  it('renders a list of items', () => {
    const container = createElement('ul');
    const anchor = document.createComment('');
    container.appendChild(anchor);

    const items = signal([
      { id: 1, text: 'First' },
      { id: 2, text: 'Second' },
    ]);

    renderList(
      container,
      anchor,
      () => items(),
      (item) => item.id,
      (item) => {
        const li = createElement('li');
        li.textContent = item.text;
        return li;
      },
    );
    flushSync();

    const lis = container.querySelectorAll('li');
    expect(lis.length).toBe(2);
    expect(lis[0].textContent).toBe('First');
    expect(lis[1].textContent).toBe('Second');
  });

  it('adds new items', () => {
    const container = createElement('ul');
    const anchor = document.createComment('');
    container.appendChild(anchor);

    const items = signal([{ id: 1, text: 'A' }]);

    renderList(
      container,
      anchor,
      () => items(),
      (item) => item.id,
      (item) => {
        const li = createElement('li');
        li.textContent = item.text;
        return li;
      },
    );
    flushSync();
    expect(container.querySelectorAll('li').length).toBe(1);

    items.set([
      { id: 1, text: 'A' },
      { id: 2, text: 'B' },
      { id: 3, text: 'C' },
    ]);
    flushSync();

    const lis = container.querySelectorAll('li');
    expect(lis.length).toBe(3);
    expect(lis[2].textContent).toBe('C');
  });

  it('removes items', () => {
    const container = createElement('ul');
    const anchor = document.createComment('');
    container.appendChild(anchor);

    const items = signal([
      { id: 1, text: 'A' },
      { id: 2, text: 'B' },
      { id: 3, text: 'C' },
    ]);

    renderList(
      container,
      anchor,
      () => items(),
      (item) => item.id,
      (item) => {
        const li = createElement('li');
        li.textContent = item.text;
        return li;
      },
    );
    flushSync();
    expect(container.querySelectorAll('li').length).toBe(3);

    items.set([{ id: 2, text: 'B' }]);
    flushSync();

    const lis = container.querySelectorAll('li');
    expect(lis.length).toBe(1);
    expect(lis[0].textContent).toBe('B');
  });

  it('reuses DOM nodes for items with the same key', () => {
    const container = createElement('ul');
    const anchor = document.createComment('');
    container.appendChild(anchor);

    const items = signal([{ id: 1, text: 'A' }]);

    renderList(
      container,
      anchor,
      () => items(),
      (item) => item.id,
      (item) => {
        const li = createElement('li');
        li.textContent = item.text;
        return li;
      },
    );
    flushSync();

    const firstLi = container.querySelector('li')!;

    // Update list but keep id:1
    items.set([
      { id: 1, text: 'A' },
      { id: 2, text: 'B' },
    ]);
    flushSync();

    // The first li should be the SAME DOM node (reused)
    expect(container.querySelectorAll('li')[0]).toBe(firstLi);
  });
});

describe('nodeToDOM', () => {
  it('converts strings to text nodes', () => {
    const node = nodeToDOM('hello');
    expect(node.textContent).toBe('hello');
  });

  it('converts numbers to text nodes', () => {
    const node = nodeToDOM(42);
    expect(node.textContent).toBe('42');
  });

  it('converts null/undefined/boolean to empty text', () => {
    expect(nodeToDOM(null).textContent).toBe('');
    expect(nodeToDOM(undefined).textContent).toBe('');
    expect(nodeToDOM(false).textContent).toBe('');
  });

  it('passes through DOM nodes', () => {
    const el = createElement('span');
    expect(nodeToDOM(el)).toBe(el);
  });

  it('converts arrays to document fragments', () => {
    const node = nodeToDOM(['a', 'b', 'c']);
    expect(node.childNodes.length).toBe(3);
  });
});

describe('insert', () => {
  it('appends a node to parent', () => {
    const parent = createElement('div');
    insert(parent, 'hello');
    expect(parent.textContent).toBe('hello');
  });

  it('inserts before an anchor', () => {
    const parent = createElement('div');
    const anchor = createText('end');
    parent.appendChild(anchor);
    insert(parent, 'start', anchor);
    expect(parent.textContent).toBe('startend');
  });
});
