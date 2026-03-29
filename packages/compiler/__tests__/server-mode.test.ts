import { describe, it, expect } from 'vitest';
import { compile } from '../src/index.js';

describe('compiler server mode', () => {
  it('generates string concatenation instead of DOM calls', () => {
    const source = `
<script lang="ts">
const name = 'World';
</script>

<template>
  <div class="greeting">
    <h1>Hello</h1>
  </div>
</template>
`;
    const result = compile(source, { mode: 'server' });

    // Should NOT contain DOM calls
    expect(result.code).not.toContain('document.createElement');
    expect(result.code).not.toContain('appendChild');

    // Should contain string building
    expect(result.code).toContain('__html');
    expect(result.code).toContain('<div');
    expect(result.code).toContain('</div>');
    expect(result.code).toContain('<h1>');
  });

  it('handles expressions with escaping', () => {
    const source = `
<script lang="ts">
const name = signal('World');
</script>

<template>
  <p>{name()}</p>
</template>
`;
    const result = compile(source, { mode: 'server' });
    expect(result.code).toContain('escapeHtml');
    expect(result.code).toContain('name()');
  });

  it('handles static attributes', () => {
    const source = `
<template>
  <div class="box" id="main">text</div>
</template>
`;
    const result = compile(source, { mode: 'server' });
    expect(result.code).toContain('class="box"');
    expect(result.code).toContain('id="main"');
  });

  it('handles void elements', () => {
    const source = `
<template>
  <input type="text" />
</template>
`;
    const result = compile(source, { mode: 'server' });
    expect(result.code).toContain('/>');
    expect(result.code).not.toContain('</input>');
  });

  it('handles :if directive as if statement', () => {
    const source = `
<script lang="ts">
const show = true;
</script>

<template>
  <div :if={show}>visible</div>
</template>
`;
    const result = compile(source, { mode: 'server' });
    expect(result.code).toContain('if (show)');
  });

  it('handles :for directive as for loop', () => {
    const source = `
<script lang="ts">
const items = signal(['a', 'b']);
</script>

<template>
  <li :for={item of items()}>text</li>
</template>
`;
    const result = compile(source, { mode: 'server' });
    expect(result.code).toContain('for (const item of items())');
  });

  it('skips event handlers in server mode', () => {
    const source = `
<template>
  <button onClick={handleClick}>Click</button>
</template>
`;
    const result = compile(source, { mode: 'server' });
    expect(result.code).not.toContain('addEventListener');
    expect(result.code).not.toContain('onClick');
  });

  it('client mode still produces DOM calls', () => {
    const source = `
<template>
  <div>Hello</div>
</template>
`;
    const clientResult = compile(source, { mode: 'client' });
    const serverResult = compile(source, { mode: 'server' });

    expect(clientResult.code).toContain('document.createElement');
    expect(serverResult.code).not.toContain('document.createElement');
    expect(serverResult.code).toContain('__html');
  });
});
