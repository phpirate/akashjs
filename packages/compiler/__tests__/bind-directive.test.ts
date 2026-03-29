import { describe, it, expect } from 'vitest';
import { parseTemplate } from '../src/template.js';
import { compile } from '../src/index.js';

describe('bind: directive parsing', () => {
  it('parses bind:value as a directive', () => {
    const nodes = parseTemplate('<input bind:value={name} />');
    expect(nodes).toHaveLength(1);
    expect(nodes[0].directives).toBeDefined();
    expect(nodes[0].directives).toHaveLength(1);
    expect(nodes[0].directives![0].name).toBe('bind');
    expect(nodes[0].directives![0].arg).toBe('value');
    expect(nodes[0].directives![0].value).toBe('name');
  });

  it('parses bind:checked as a directive', () => {
    const nodes = parseTemplate('<input type="checkbox" bind:checked={isOn} />');
    const bindDir = nodes[0].directives?.find((d) => d.name === 'bind');
    expect(bindDir).toBeDefined();
    expect(bindDir!.arg).toBe('checked');
    expect(bindDir!.value).toBe('isOn');
  });

  it('works alongside other attributes', () => {
    const nodes = parseTemplate('<input class="field" bind:value={text} type="text" />');
    expect(nodes[0].attrs?.some((a) => a.name === 'class')).toBe(true);
    expect(nodes[0].attrs?.some((a) => a.name === 'type')).toBe(true);
    expect(nodes[0].directives?.some((d) => d.name === 'bind')).toBe(true);
  });
});

describe('bind: directive compilation', () => {
  it('compiles bind:value to value effect + input listener', () => {
    const source = `
<script lang="ts">
const name = signal('');
</script>

<template>
  <input bind:value={name} />
</template>
`;
    const result = compile(source);
    // Should have an effect setting .value
    expect(result.code).toContain('.value = name()');
    // Should have an input event listener calling .set()
    expect(result.code).toContain("addEventListener('input'");
    expect(result.code).toContain('name.set(');
  });

  it('compiles bind:checked for checkboxes', () => {
    const source = `
<script lang="ts">
const checked = signal(false);
</script>

<template>
  <input type="checkbox" bind:checked={checked} />
</template>
`;
    const result = compile(source);
    expect(result.code).toContain('.checked = checked()');
    expect(result.code).toContain('checked.set(');
  });
});
