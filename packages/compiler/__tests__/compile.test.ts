import { describe, it, expect } from 'vitest';
import { compile } from '../src/index.js';

describe('compile', () => {
  it('compiles a simple counter component', () => {
    const source = `
<script lang="ts">
interface Props { initial?: number }
const { initial = 0 } = props;

const count = signal(initial);
const doubled = computed(() => count() * 2);
</script>

<template>
  <div class="counter">
    <span>{count()}</span>
    <span>{doubled()}</span>
    <button onClick={() => count.update(c => c + 1)}>+1</button>
  </div>
</template>

<style scoped>
.counter { display: flex; gap: 8px; }
</style>
`;

    const result = compile(source, { filename: 'Counter.akash' });

    // Should import runtime APIs
    expect(result.code).toContain("from '@akashjs/runtime'");
    expect(result.code).toContain('defineComponent');
    expect(result.code).toContain('signal');
    expect(result.code).toContain('computed');
    expect(result.code).toContain('effect');

    // Should contain DOM creation
    expect(result.code).toContain("document.createElement('div')");
    expect(result.code).toContain("document.createElement('span')");
    expect(result.code).toContain("document.createElement('button')");

    // Should contain reactive text binding
    expect(result.code).toContain('count()');
    expect(result.code).toContain('doubled()');

    // Should have scoped CSS
    expect(result.css).toBeDefined();
    expect(result.css).toContain('data-a-');

    // Should export default
    expect(result.code).toContain('export default defineComponent');
  });

  it('compiles a minimal component', () => {
    const source = `
<script lang="ts">
</script>

<template>
  <div>Hello, World!</div>
</template>
`;

    const result = compile(source);
    expect(result.code).toContain('defineComponent');
    expect(result.code).toContain("document.createElement('div')");
    expect(result.css).toBeUndefined();
  });

  it('auto-imports signal when used in script', () => {
    const source = `
<script lang="ts">
const count = signal(0);
</script>

<template>
  <div>{count()}</div>
</template>
`;

    const result = compile(source);
    expect(result.code).toContain('signal');
    expect(result.code).toMatch(/import\s*\{[^}]*signal[^}]*\}/);
  });

  it('auto-imports onMount when used', () => {
    const source = `
<script lang="ts">
onMount(() => {
  console.log('mounted');
});
</script>

<template>
  <div>hello</div>
</template>
`;

    const result = compile(source);
    expect(result.code).toMatch(/import\s*\{[^}]*onMount[^}]*\}/);
  });

  it('extracts Props interface as generic parameter', () => {
    const source = `
<script lang="ts">
interface Props {
  name: string;
  count?: number;
}
</script>

<template>
  <div>hello</div>
</template>
`;

    const result = compile(source);
    expect(result.code).toContain('defineComponent<');
    expect(result.code).toContain('name: string');
  });

  it('generates scoped CSS with unique hash', () => {
    const source = `
<script lang="ts">
</script>

<template>
  <div>hello</div>
</template>

<style scoped>
div { color: red; }
</style>
`;

    const result = compile(source, { filename: 'Test.akash' });
    expect(result.css).toBeDefined();
    expect(result.css).toContain('[data-a-');
  });

  it('handles dynamic attributes', () => {
    const source = `
<script lang="ts">
const isActive = signal(false);
</script>

<template>
  <div class={isActive() ? 'active' : ''}>hello</div>
</template>
`;

    const result = compile(source);
    expect(result.code).toContain('effect');
    expect(result.code).toContain("isActive() ? 'active' : ''");
  });

  it('handles event handlers', () => {
    const source = `
<script lang="ts">
function handleClick() {}
</script>

<template>
  <button onClick={handleClick}>Click</button>
</template>
`;

    const result = compile(source);
    expect(result.code).toContain("addEventListener('click'");
    expect(result.code).toContain('handleClick');
  });
});
