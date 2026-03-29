import { describe, it, expect } from 'vitest';
import {
  isStaticNode,
  staticNodeToHtml,
  extractHoistedTemplates,
  generateHoistedDeclarations,
  getOptimizationStats,
} from '../src/optimize.js';
import type { TemplateNode } from '../src/template.js';

describe('isStaticNode', () => {
  it('returns true for static element with no dynamic attrs/directives', () => {
    const node: TemplateNode = {
      type: 'element',
      tag: 'div',
      attrs: [{ name: 'class', value: 'box', dynamic: false }],
      children: [{ type: 'text', content: 'hello' }],
    };
    expect(isStaticNode(node)).toBe(true);
  });

  it('returns false for element with dynamic attr', () => {
    const node: TemplateNode = {
      type: 'element',
      tag: 'div',
      attrs: [{ name: 'class', value: 'cls()', dynamic: true }],
      children: [],
    };
    expect(isStaticNode(node)).toBe(false);
  });

  it('returns false for expression node', () => {
    const node: TemplateNode = {
      type: 'expression',
      content: 'count()',
    };
    expect(isStaticNode(node)).toBe(false);
  });
});

describe('staticNodeToHtml', () => {
  it('converts element to HTML string', () => {
    const node: TemplateNode = {
      type: 'element',
      tag: 'div',
      children: [{ type: 'text', content: 'hello' }],
    };
    expect(staticNodeToHtml(node)).toBe('<div>hello</div>');
  });

  it('handles attributes', () => {
    const node: TemplateNode = {
      type: 'element',
      tag: 'span',
      attrs: [
        { name: 'class', value: 'red', dynamic: false },
        { name: 'id', value: 'item', dynamic: false },
      ],
      children: [],
    };
    expect(staticNodeToHtml(node)).toBe('<span class="red" id="item"></span>');
  });
});

describe('extractHoistedTemplates', () => {
  it('finds static subtrees', () => {
    const nodes: TemplateNode[] = [
      {
        type: 'element',
        tag: 'div',
        children: [{ type: 'text', content: 'static' }],
      },
      {
        type: 'element',
        tag: 'span',
        attrs: [{ name: 'class', value: 'x()', dynamic: true }],
        children: [],
      },
    ];

    const hoisted = extractHoistedTemplates(nodes);
    expect(hoisted).toHaveLength(1);
    expect(hoisted[0].varName).toBe('__hoisted_0');
    expect(hoisted[0].html).toBe('<div>static</div>');
  });
});

describe('generateHoistedDeclarations', () => {
  it('generates template code with cloneNode', () => {
    const templates = [
      { varName: '__hoisted_0', html: '<div>hello</div>' },
    ];

    const code = generateHoistedDeclarations(templates);
    expect(code).toContain('const __hoisted_0');
    expect(code).toContain("document.createElement('template')");
    expect(code).toContain('Hoisted static templates');
    expect(code).toContain(JSON.stringify('<div>hello</div>'));
  });
});

describe('getOptimizationStats', () => {
  it('counts nodes correctly', () => {
    const nodes: TemplateNode[] = [
      {
        type: 'element',
        tag: 'div',
        children: [
          { type: 'text', content: 'hi' },
          { type: 'expression', content: 'x()' },
        ],
      },
    ];

    const stats = getOptimizationStats(nodes);
    expect(stats.totalNodes).toBe(3);
    expect(stats.staticNodes).toBe(1); // only the text node
    expect(typeof stats.staticRatio).toBe('number');
    expect(typeof stats.hoistedTemplates).toBe('number');
  });
});
