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

  it('auto-imports Show and For when used in template only', () => {
    const source = `
<script lang="ts">
const visible = signal(true);
const items = signal(['a', 'b']);
</script>

<template>
  <Show when={visible()}>
    <For each={items()}>
      <span>item</span>
    </For>
  </Show>
</template>
`;

    const result = compile(source);
    expect(result.code).toMatch(/import\s*\{[^}]*Show[^}]*\}/);
    expect(result.code).toMatch(/import\s*\{[^}]*For[^}]*\}/);
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

  it('compiles component children into a render function', () => {
    const source = `
<script lang="ts">
const visible = signal(true);
</script>

<template>
  <Show when={visible()}>
    <div class="content">Hello</div>
  </Show>
</template>
`;

    const result = compile(source);
    // Children should be a function, not () => null
    expect(result.code).not.toContain('children: () => null');
    expect(result.code).toContain('children: () =>');
    expect(result.code).toContain("document.createElement('div')");
  });

  it('compiles JSX in dynamic props like fallback', () => {
    const source = `
<script lang="ts">
const user = signal(null);
</script>

<template>
  <Show when={user()} fallback={<div class="loading">Loading...</div>}>
    <span>Welcome</span>
  </Show>
</template>
`;

    const result = compile(source);
    // fallback should be compiled into a render function
    expect(result.code).toContain('fallback: () =>');
    expect(result.code).toContain('"loading"');
    // children should also be compiled
    expect(result.code).not.toContain('children: () => null');
  });

  it('compiles nested Show with fallback containing multiple elements', () => {
    const source = `
<script lang="ts">
const isAuth = signal(false);
const isLoading = signal(true);
</script>

<template>
  <Show when={isAuth()} fallback={<div><p>Please log in</p></div>}>
    <Show when={!isLoading()} fallback={<span>Loading...</span>}>
      <div>Dashboard</div>
    </Show>
  </Show>
</template>
`;

    const result = compile(source);
    // Both Show calls should have real children and fallback
    expect(result.code).not.toContain('children: () => null');
    // Should contain the fallback content
    expect(result.code).toContain('fallback: () =>');
    expect(result.code).toContain('"Please log in"');
    expect(result.code).toContain('"Loading..."');
  });

  it('compiles arrow function children with JSX: {(value) => <div>...</div>}', () => {
    const source = `
<script lang="ts">
const user = signal(null);
</script>

<template>
  <Show when={user()}>
    {(u) => <div class="profile">{u.name}</div>}
  </Show>
</template>
`;

    const result = compile(source);
    // Should compile into (u) => { ... createElement ... }
    expect(result.code).toContain('(u) => {');
    expect(result.code).toContain("document.createElement('div')");
    expect(result.code).toContain('"profile"');
    // Reactive expression {u.name} should be a text binding
    expect(result.code).toContain('u.name');
  });

  it('compiles parameterless arrow function children: {() => <span>...</span>}', () => {
    const source = `
<script lang="ts">
const show = signal(true);
</script>

<template>
  <Show when={show()}>
    {() => <span>Visible</span>}
  </Show>
</template>
`;

    const result = compile(source);
    expect(result.code).not.toContain('String(');
    expect(result.code).toContain('() => {');
    expect(result.code).toContain("document.createElement('span')");
  });

  it('compiles arrow function with multiple JSX children', () => {
    const source = `
<script lang="ts">
const data = signal(null);
</script>

<template>
  <Show when={data()}>
    {(d) => <div><h1>{d.title}</h1><p>{d.body}</p></div>}
  </Show>
</template>
`;

    const result = compile(source);
    expect(result.code).toContain('(d) => {');
    expect(result.code).toContain("document.createElement('h1')");
    expect(result.code).toContain("document.createElement('p')");
    // Reactive expressions compiled as text bindings
    expect(result.code).toContain('d.title');
    expect(result.code).toContain('d.body');
  });

  it('wraps dynamic component props in getters for reactivity', () => {
    const source = `
<script lang="ts">
const activeTab = signal('login');
</script>

<template>
  <Show when={activeTab() === 'login'}>
    <div>Login form</div>
  </Show>
</template>
`;

    const result = compile(source);
    // when should be a getter, not an eagerly evaluated value
    expect(result.code).toContain("when: () => activeTab() === 'login'");
  });

  it('does not wrap event handler props in getters', () => {
    const source = `
<script lang="ts">
function handleClick() {}
</script>

<template>
  <MyComponent onClick={handleClick} />
</template>
`;

    const result = compile(source);
    // Event handlers should be passed through directly
    expect(result.code).toContain('onClick: handleClick');
    expect(result.code).not.toContain('onClick: () =>');
  });

  it('does not wrap static props like literal arrays and strings in getters', () => {
    const source = `
<script lang="ts">
</script>

<template>
  <Tabs items={['Login', 'Register']} variant="primary" activeIndex={0} />
</template>
`;

    const result = compile(source);
    // Literal array — no wrapper
    expect(result.code).toContain("items: ['Login', 'Register']");
    expect(result.code).not.toContain("items: () =>");
    // Number literal — no wrapper
    expect(result.code).toContain('activeIndex: 0');
    expect(result.code).not.toContain('activeIndex: () =>');
  });

  it('wraps props with signal calls but not plain identifiers', () => {
    const source = `
<script lang="ts">
const activeTab = signal('login');
const config = { theme: 'dark' };
</script>

<template>
  <Tabs activeValue={activeTab()} options={config} />
</template>
`;

    const result = compile(source);
    // Non-primitive component — signal call passed directly, not wrapped
    expect(result.code).toContain('activeValue: activeTab()');
    expect(result.code).not.toContain('activeValue: () =>');
    // Plain identifier — no wrapper
    expect(result.code).toContain('options: config');
    expect(result.code).not.toContain('options: () =>');
  });
});
