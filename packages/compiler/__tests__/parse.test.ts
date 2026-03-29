import { describe, it, expect } from 'vitest';
import { parse } from '../src/parse.js';

describe('parse', () => {
  it('parses a complete .akash SFC', () => {
    const source = `
<script lang="ts">
const count = signal(0);
</script>

<template>
  <div>{count()}</div>
</template>

<style scoped>
.counter { color: red; }
</style>
`;

    const result = parse(source);

    expect(result.script).not.toBeNull();
    expect(result.script!.content).toBe('const count = signal(0);');
    expect(result.script!.lang).toBe('ts');

    expect(result.template).not.toBeNull();
    expect(result.template!.content).toContain('<div>{count()}</div>');

    expect(result.style).not.toBeNull();
    expect(result.style!.content).toContain('.counter { color: red; }');
    expect(result.style!.scoped).toBe(true);
  });

  it('parses SFC without style block', () => {
    const source = `
<script lang="ts">
const x = 1;
</script>

<template>
  <div>hello</div>
</template>
`;

    const result = parse(source);
    expect(result.script).not.toBeNull();
    expect(result.template).not.toBeNull();
    expect(result.style).toBeNull();
  });

  it('parses SFC without template block', () => {
    const source = `
<script lang="ts">
export const util = () => 42;
</script>
`;

    const result = parse(source);
    expect(result.script).not.toBeNull();
    expect(result.template).toBeNull();
    expect(result.style).toBeNull();
  });

  it('defaults lang to ts', () => {
    const source = `
<script>
const x = 1;
</script>

<template>
  <div>hello</div>
</template>
`;

    const result = parse(source);
    expect(result.script!.lang).toBe('ts');
  });

  it('detects non-scoped styles', () => {
    const source = `
<script lang="ts">
</script>

<template>
  <div>hello</div>
</template>

<style>
div { color: blue; }
</style>
`;

    const result = parse(source);
    expect(result.style!.scoped).toBe(false);
  });
});
