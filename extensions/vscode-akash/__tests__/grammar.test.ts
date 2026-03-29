import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const grammarPath = join(__dirname, '..', 'syntaxes', 'akash.tmLanguage.json');
const grammar = JSON.parse(readFileSync(grammarPath, 'utf-8'));

describe('TextMate grammar structure', () => {
  it('has the correct scope name', () => {
    expect(grammar.scopeName).toBe('source.akash');
  });

  it('has the correct file type', () => {
    expect(grammar.fileTypes).toContain('akash');
  });

  it('has top-level patterns', () => {
    expect(grammar.patterns.length).toBeGreaterThan(0);
  });

  it('has a repository with rules', () => {
    expect(grammar.repository).toBeDefined();
    expect(Object.keys(grammar.repository).length).toBeGreaterThan(0);
  });
});

describe('SFC block rules', () => {
  it('defines script-block rule', () => {
    const rule = grammar.repository['script-block'];
    expect(rule).toBeDefined();
    expect(rule.begin).toContain('script');
    expect(rule.end).toContain('script');
    expect(rule.contentName).toBe('source.ts');
  });

  it('defines template-block rule', () => {
    const rule = grammar.repository['template-block'];
    expect(rule).toBeDefined();
    expect(rule.begin).toContain('template');
    expect(rule.end).toContain('template');
  });

  it('defines style-block rule', () => {
    const rule = grammar.repository['style-block'];
    expect(rule).toBeDefined();
    expect(rule.begin).toContain('style');
    expect(rule.end).toContain('style');
    expect(rule.contentName).toBe('source.css');
  });
});

describe('template features', () => {
  it('defines interpolation rule with curly braces', () => {
    const rule = grammar.repository['template-interpolation'];
    expect(rule).toBeDefined();
    expect(rule.begin).toContain('{');
    expect(rule.end).toContain('}');
    expect(rule.contentName).toBe('source.ts');
  });

  it('defines directive patterns', () => {
    const rule = grammar.repository['template-directive'];
    expect(rule).toBeDefined();
    expect(rule.patterns.length).toBeGreaterThan(0);

    // Check that :if, :for, :show, bind:, on: are covered
    const allPatterns = JSON.stringify(rule.patterns);
    expect(allPatterns).toContain('if');
    expect(allPatterns).toContain('for');
    expect(allPatterns).toContain('show');
    expect(allPatterns).toContain('bind');
    expect(allPatterns).toContain('on');
  });

  it('defines component tag rule (PascalCase)', () => {
    const rule = grammar.repository['template-component-tag'];
    expect(rule).toBeDefined();
    // Should match tags starting with uppercase
    expect(rule.begin).toContain('[A-Z]');
    expect(rule.beginCaptures['2'].name).toContain('component');
  });

  it('defines comment rule', () => {
    const rule = grammar.repository['template-comment'];
    expect(rule).toBeDefined();
    expect(rule.begin).toBe('<!--');
    expect(rule.end).toBe('-->');
  });
});

describe('tag attributes', () => {
  const attrs = grammar.repository['tag-attributes'];

  it('defines attribute patterns', () => {
    expect(attrs).toBeDefined();
    expect(attrs.patterns.length).toBeGreaterThan(0);
  });

  it('handles event handlers (onClick={...})', () => {
    const eventPattern = attrs.patterns.find(
      (p: any) => p.name?.includes('event'),
    );
    expect(eventPattern).toBeDefined();
    expect(eventPattern.begin).toContain('on[A-Z]');
  });

  it('handles dynamic attributes (attr={...})', () => {
    const dynamicPattern = attrs.patterns.find(
      (p: any) => p.name?.includes('dynamic'),
    );
    expect(dynamicPattern).toBeDefined();
  });

  it('handles static string attributes (attr="value")', () => {
    const staticPatterns = attrs.patterns.filter(
      (p: any) => p.name?.includes('static'),
    );
    expect(staticPatterns.length).toBeGreaterThanOrEqual(2); // double and single quoted
  });
});

describe('style attributes', () => {
  const styleAttrs = grammar.repository['style-attributes'];

  it('recognizes scoped attribute', () => {
    expect(styleAttrs).toBeDefined();
    const scopedPattern = styleAttrs.patterns.find(
      (p: any) => p.name?.includes('scoped'),
    );
    expect(scopedPattern).toBeDefined();
    expect(scopedPattern.match).toContain('scoped');
  });

  it('recognizes lang attribute', () => {
    const langPattern = styleAttrs.patterns.find(
      (p: any) => p.name?.includes('lang'),
    );
    expect(langPattern).toBeDefined();
    expect(langPattern.match).toContain('lang');
  });
});

describe('embedded language references', () => {
  it('embeds TypeScript in script blocks', () => {
    const scriptRule = grammar.repository['script-block'];
    const includes = scriptRule.patterns.map((p: any) => p.include);
    expect(includes).toContain('source.ts');
  });

  it('embeds CSS in style blocks', () => {
    const styleRule = grammar.repository['style-block'];
    const includes = styleRule.patterns.map((p: any) => p.include);
    expect(includes).toContain('source.css');
  });

  it('embeds TypeScript in interpolations', () => {
    const interpRule = grammar.repository['template-interpolation'];
    expect(interpRule.contentName).toBe('source.ts');
  });
});

describe('package.json extension manifest', () => {
  const pkg = JSON.parse(
    readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'),
  );

  it('registers .akash language', () => {
    const langs = pkg.contributes.languages;
    expect(langs).toBeDefined();
    expect(langs[0].id).toBe('akash');
    expect(langs[0].extensions).toContain('.akash');
  });

  it('registers grammar with correct scope', () => {
    const grammars = pkg.contributes.grammars;
    expect(grammars).toBeDefined();
    expect(grammars[0].scopeName).toBe('source.akash');
    expect(grammars[0].language).toBe('akash');
  });

  it('declares embedded languages', () => {
    const embedded = pkg.contributes.grammars[0].embeddedLanguages;
    expect(embedded['source.ts']).toBe('typescript');
    expect(embedded['source.css']).toBe('css');
    expect(embedded['text.html.basic']).toBe('html');
  });
});
