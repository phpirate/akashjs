import { describe, it, expect } from 'vitest';
import { parseTemplate } from '../src/template.js';

describe('parseTemplate', () => {
  it('parses a simple element', () => {
    const nodes = parseTemplate('<div>hello</div>');
    expect(nodes).toHaveLength(1);
    expect(nodes[0].type).toBe('element');
    expect(nodes[0].tag).toBe('div');
    expect(nodes[0].children).toHaveLength(1);
    expect(nodes[0].children![0].type).toBe('text');
    expect(nodes[0].children![0].content).toBe('hello');
  });

  it('parses self-closing element', () => {
    const nodes = parseTemplate('<input />');
    expect(nodes).toHaveLength(1);
    expect(nodes[0].type).toBe('element');
    expect(nodes[0].tag).toBe('input');
  });

  it('parses static attributes', () => {
    const nodes = parseTemplate('<div class="test" id="main">hi</div>');
    expect(nodes[0].attrs).toHaveLength(2);
    expect(nodes[0].attrs![0]).toEqual({ name: 'class', value: 'test', dynamic: false });
    expect(nodes[0].attrs![1]).toEqual({ name: 'id', value: 'main', dynamic: false });
  });

  it('parses dynamic attributes', () => {
    const nodes = parseTemplate('<div class={isActive() ? "on" : "off"}>hi</div>');
    expect(nodes[0].attrs).toHaveLength(1);
    expect(nodes[0].attrs![0].name).toBe('class');
    expect(nodes[0].attrs![0].dynamic).toBe(true);
    expect(nodes[0].attrs![0].value).toBe('isActive() ? "on" : "off"');
  });

  it('parses expressions', () => {
    const nodes = parseTemplate('<span>{count()}</span>');
    expect(nodes[0].children).toHaveLength(1);
    expect(nodes[0].children![0].type).toBe('expression');
    expect(nodes[0].children![0].content).toBe('count()');
  });

  it('parses nested elements', () => {
    const nodes = parseTemplate('<div><span>inner</span></div>');
    expect(nodes[0].children).toHaveLength(1);
    expect(nodes[0].children![0].type).toBe('element');
    expect(nodes[0].children![0].tag).toBe('span');
  });

  it('identifies components (uppercase tag)', () => {
    const nodes = parseTemplate('<MyComponent prop="value" />');
    expect(nodes[0].type).toBe('component');
    expect(nodes[0].tag).toBe('MyComponent');
  });

  it('parses :if directive', () => {
    const nodes = parseTemplate('<div :if={show()}>visible</div>');
    expect(nodes[0].directives).toHaveLength(1);
    expect(nodes[0].directives![0].name).toBe('if');
    expect(nodes[0].directives![0].value).toBe('show()');
  });

  it('parses :for directive with :key', () => {
    const nodes = parseTemplate('<li :for={item of items()} :key={item.id}>{item.text}</li>');
    expect(nodes[0].directives).toHaveLength(2);

    const forDir = nodes[0].directives!.find(d => d.name === 'for');
    expect(forDir!.value).toBe('item of items()');

    const keyDir = nodes[0].directives!.find(d => d.name === 'key');
    expect(keyDir!.value).toBe('item.id');
  });

  it('parses event handler attributes', () => {
    const nodes = parseTemplate('<button onClick={handleClick}>Go</button>');
    expect(nodes[0].attrs![0].name).toBe('onClick');
    expect(nodes[0].attrs![0].value).toBe('handleClick');
    expect(nodes[0].attrs![0].dynamic).toBe(true);
  });

  it('parses mixed children (text + expressions)', () => {
    const nodes = parseTemplate('<span>Count: {count()}</span>');
    expect(nodes[0].children).toHaveLength(2);
    expect(nodes[0].children![0].type).toBe('text');
    expect(nodes[0].children![0].content).toBe('Count:');
    expect(nodes[0].children![1].type).toBe('expression');
    expect(nodes[0].children![1].content).toBe('count()');
  });
});
