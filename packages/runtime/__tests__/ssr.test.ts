import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  ssrElement,
  ssrText,
  ssrRaw,
  nodeToHtml,
  renderNodes,
  isServerRendering,
} from '../src/ssr.js';

describe('escapeHtml', () => {
  it('escapes &', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('escapes <', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes "', () => {
    expect(escapeHtml('say "hi"')).toBe('say &quot;hi&quot;');
  });

  it('escapes \'', () => {
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });

  it('leaves safe strings unchanged', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World');
  });
});

describe('ssrElement', () => {
  it('creates an element node', () => {
    const el = ssrElement('div');
    expect(el.type).toBe('element');
    expect(el.tag).toBe('div');
    expect(el.children).toEqual([]);
  });

  it('handles string attributes', () => {
    const el = ssrElement('div', { class: 'test', id: 'main' });
    expect(el.attrs.class).toBe('test');
    expect(el.attrs.id).toBe('main');
  });

  it('handles boolean true attributes', () => {
    const el = ssrElement('input', { disabled: true });
    expect(el.attrs.disabled).toBe('');
  });

  it('excludes false attributes', () => {
    const el = ssrElement('input', { disabled: false });
    expect(el.attrs.disabled).toBeUndefined();
  });

  it('accepts children', () => {
    const child = ssrText('hello');
    const el = ssrElement('div', {}, [child]);
    expect(el.children).toHaveLength(1);
  });
});

describe('nodeToHtml', () => {
  it('serializes a text node', () => {
    expect(nodeToHtml(ssrText('Hello'))).toBe('Hello');
  });

  it('escapes text content', () => {
    expect(nodeToHtml(ssrText('<script>'))).toBe('&lt;script&gt;');
  });

  it('serializes raw HTML', () => {
    expect(nodeToHtml(ssrRaw('<b>bold</b>'))).toBe('<b>bold</b>');
  });

  it('serializes a simple element', () => {
    const el = ssrElement('div');
    expect(nodeToHtml(el)).toBe('<div></div>');
  });

  it('serializes element with attributes', () => {
    const el = ssrElement('div', { class: 'box', id: 'main' });
    const html = nodeToHtml(el);
    expect(html).toContain('class="box"');
    expect(html).toContain('id="main"');
  });

  it('serializes boolean attributes', () => {
    const el = ssrElement('input', { disabled: true, type: 'text' });
    const html = nodeToHtml(el);
    expect(html).toContain(' disabled');
    expect(html).toContain('type="text"');
  });

  it('serializes void elements as self-closing', () => {
    const el = ssrElement('br');
    expect(nodeToHtml(el)).toBe('<br />');
  });

  it('serializes input as self-closing', () => {
    const el = ssrElement('input', { type: 'text' });
    expect(nodeToHtml(el)).toContain('<input');
    expect(nodeToHtml(el)).toContain('/>');
    expect(nodeToHtml(el)).not.toContain('</input>');
  });

  it('serializes nested elements', () => {
    const el = ssrElement('div', {}, [
      ssrElement('span', {}, [ssrText('Hello')]),
    ]);
    expect(nodeToHtml(el)).toBe('<div><span>Hello</span></div>');
  });

  it('escapes attribute values', () => {
    const el = ssrElement('div', { title: 'say "hi"' });
    expect(nodeToHtml(el)).toContain('title="say &quot;hi&quot;"');
  });
});

describe('renderNodes', () => {
  it('concatenates multiple nodes', () => {
    const nodes = [
      ssrElement('h1', {}, [ssrText('Title')]),
      ssrElement('p', {}, [ssrText('Body')]),
    ];
    expect(renderNodes(nodes)).toBe('<h1>Title</h1><p>Body</p>');
  });
});

describe('isServerRendering', () => {
  it('returns false when not in SSR', () => {
    expect(isServerRendering()).toBe(false);
  });
});
