import { describe, it, expect } from 'vitest';
import { createLanguageService } from '../src/language-service.js';

describe('language-service', () => {
  it('createLanguageService returns object with getDiagnostics/getCompletions/getHoverInfo/getAllCompletions', () => {
    const ls = createLanguageService();
    expect(typeof ls.getDiagnostics).toBe('function');
    expect(typeof ls.getCompletions).toBe('function');
    expect(typeof ls.getHoverInfo).toBe('function');
    expect(typeof ls.getAllCompletions).toBe('function');
  });

  it('getDiagnostics on valid SFC returns no errors', () => {
    const ls = createLanguageService();
    const source = `<template>
  <div>Hello</div>
</template>

<script>
const name = signal('world');
</script>`;
    const diagnostics = ls.getDiagnostics(source);
    const errors = diagnostics.filter((d) => d.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('getDiagnostics on SFC with <img> without alt returns warning', () => {
    const ls = createLanguageService();
    const source = `<template>
  <img src="photo.jpg" />
</template>`;
    const diagnostics = ls.getDiagnostics(source);
    const imgWarning = diagnostics.find((d) => d.message.includes('alt'));
    expect(imgWarning).toBeDefined();
    expect(imgWarning!.severity).toBe('warning');
  });

  it('getCompletions in script returns runtime APIs', () => {
    const ls = createLanguageService();
    const source = `<template>
  <div></div>
</template>

<script>

</script>`;
    const completions = ls.getCompletions(source, { line: 5, character: 0 });
    const labels = completions.map((c) => c.label);
    expect(labels).toContain('signal');
    expect(labels).toContain('computed');
    expect(labels).toContain('effect');
  });

  it('getCompletions in template returns components', () => {
    const ls = createLanguageService();
    const source = `<template>
  <
</template>`;
    const completions = ls.getCompletions(source, { line: 1, character: 3 });
    const labels = completions.map((c) => c.label);
    expect(labels).toContain('Show');
    expect(labels).toContain('For');
  });

  it('getAllCompletions has apis/components/directives/events', () => {
    const ls = createLanguageService();
    const all = ls.getAllCompletions();
    expect(Array.isArray(all.apis)).toBe(true);
    expect(Array.isArray(all.components)).toBe(true);
    expect(Array.isArray(all.directives)).toBe(true);
    expect(Array.isArray(all.events)).toBe(true);
    expect(all.apis.length).toBeGreaterThan(0);
    expect(all.components.length).toBeGreaterThan(0);
    expect(all.directives.length).toBeGreaterThan(0);
    expect(all.events.length).toBeGreaterThan(0);
  });
});
