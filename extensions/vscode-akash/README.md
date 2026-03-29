# AkashJS VS Code Extension

Syntax highlighting for `.akash` single-file components.

## Features

- Full syntax highlighting for `.akash` SFCs
- Embedded TypeScript highlighting in `<script lang="ts">` blocks
- Embedded HTML highlighting in `<template>` blocks
- Embedded CSS highlighting in `<style>` blocks
- Support for `scoped` styles
- Directive highlighting (`:if`, `:for`, `:show`, `bind:value`, `on:click`)
- Component tag highlighting (PascalCase tags like `<Counter />`)
- Expression interpolation highlighting (`{count()}`)
- Event handler highlighting (`onClick={...}`)

## Supported Syntax

```html
<script lang="ts">
import { signal } from '@akashjs/runtime';

const count = signal(0);
</script>

<template>
  <div :if={showCounter}>
    <span>{count()}</span>
    <button onClick={() => count.update(c => c + 1)}>+</button>
  </div>
</template>

<style scoped>
div {
  padding: 1rem;
}
</style>
```

## Installation

Install from the VS Code marketplace (coming soon) or install the `.vsix` manually:

```sh
code --install-extension vscode-akash-0.1.0.vsix
```
