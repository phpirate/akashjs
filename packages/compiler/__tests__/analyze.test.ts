import { describe, it, expect } from 'vitest';
import { parseTemplate } from '../src/template.js';
import { analyzeTemplate, isStaticExpression } from '../src/analyze.js';

describe('analyzeTemplate', () => {
  it('detects no dynamic content in static HTML', () => {
    const nodes = parseTemplate('<div class="static">Hello</div>');
    const result = analyzeTemplate(nodes);
    expect(result.hasDynamicContent).toBe(false);
    expect(result.reactiveExpressions).toHaveLength(0);
  });

  it('detects signal reads in expressions', () => {
    const nodes = parseTemplate('<span>{count()}</span>');
    const result = analyzeTemplate(nodes);
    expect(result.hasDynamicContent).toBe(true);
    expect(result.signalReads.length).toBeGreaterThan(0);
    expect(result.signalReads[0].expression).toBe('count()');
    expect(result.signalReads[0].context).toBe('text');
  });

  it('detects reactive expressions in text', () => {
    const nodes = parseTemplate('<p>{name()}</p>');
    const result = analyzeTemplate(nodes);
    expect(result.reactiveExpressions).toHaveLength(1);
    expect(result.reactiveExpressions[0].kind).toBe('text');
  });

  it('detects event handlers', () => {
    const nodes = parseTemplate('<button onClick={handleClick}>Go</button>');
    const result = analyzeTemplate(nodes);
    expect(result.eventHandlers).toHaveLength(1);
    expect(result.eventHandlers[0].event).toBe('click');
    expect(result.eventHandlers[0].handler).toBe('handleClick');
    expect(result.eventHandlers[0].tag).toBe('button');
  });

  it('detects dynamic attributes', () => {
    const nodes = parseTemplate('<div class={className()}>test</div>');
    const result = analyzeTemplate(nodes);
    expect(result.hasDynamicContent).toBe(true);
    expect(result.reactiveExpressions.some((e) => e.kind === 'attribute')).toBe(true);
  });

  it('detects component references', () => {
    const nodes = parseTemplate('<Counter initial={0} />');
    const result = analyzeTemplate(nodes);
    expect(result.componentRefs).toContain('Counter');
  });

  it('detects :if directive as conditional', () => {
    const nodes = parseTemplate('<div :if={isVisible()}>shown</div>');
    const result = analyzeTemplate(nodes);
    expect(result.reactiveExpressions.some((e) => e.kind === 'conditional')).toBe(true);
  });

  it('detects :for directive as list expression', () => {
    const nodes = parseTemplate('<li :for={item of items()}>text</li>');
    const result = analyzeTemplate(nodes);
    expect(result.reactiveExpressions.some((e) => e.kind === 'list')).toBe(true);
  });

  it('identifies static subtrees', () => {
    const nodes = parseTemplate('<header><h1>Static Title</h1></header>');
    const result = analyzeTemplate(nodes);
    expect(result.staticSubtrees.length).toBeGreaterThan(0);
  });

  it('excludes known non-signals from signal reads', () => {
    const nodes = parseTemplate('<span>{JSON.stringify(data)}</span>');
    const result = analyzeTemplate(nodes);
    const signalNames = result.signalReads.map((s) => s.expression);
    expect(signalNames.some((s) => s.startsWith('JSON'))).toBe(false);
  });
});

describe('isStaticExpression', () => {
  it('detects string literals', () => {
    expect(isStaticExpression('"hello"')).toBe(true);
    expect(isStaticExpression("'world'")).toBe(true);
  });

  it('detects numbers', () => {
    expect(isStaticExpression('42')).toBe(true);
    expect(isStaticExpression('-3.14')).toBe(true);
  });

  it('detects booleans', () => {
    expect(isStaticExpression('true')).toBe(true);
    expect(isStaticExpression('false')).toBe(true);
  });

  it('detects null/undefined', () => {
    expect(isStaticExpression('null')).toBe(true);
    expect(isStaticExpression('undefined')).toBe(true);
  });

  it('rejects function calls', () => {
    expect(isStaticExpression('count()')).toBe(false);
  });

  it('rejects variable references', () => {
    expect(isStaticExpression('myVar')).toBe(false);
  });
});
