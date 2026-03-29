# Migrating from Svelte

Svelte is the closest framework to AkashJS. Both use a compiler, both have signals-based reactivity, and both emphasize small bundles with minimal runtime. If you know Svelte 5 runes, the transition is nearly 1:1.

## Concept Mapping

| Svelte 5 | AkashJS | Notes |
|---|---|---|
| `$state()` | `signal()` | Same concept. Read with `signal()` instead of direct access. |
| `$derived()` | `computed()` | Same concept. |
| `$effect()` | `effect()` | Same concept. |
| `$props()` | `Props` interface + `ctx.props` | TypeScript interface for type safety. |
| `$bindable()` | Two-way binding via callback props | Pass `onInput` callback + value signal. |
| `{#if}` | `<Show when={...}>` or `:if` | Same concept. |
| `{#each}` | `<For each={...}>` or `:for` | Same concept, callback render function. |
| `{#await}` | `<Suspense>` + `createResource()` | Different API, same result. |
| `transition:` | `<Transition>` component | Component instead of directive. |
| `use:` action | `defineDirective()` | Same lifecycle concept. |
| Svelte stores (`writable`) | `defineStore()` | More structured (state + getters + actions). |
| SvelteKit | `@akashjs/router` + SSR | File-based routing, loaders, guards. |
| `+page.svelte` | `page.akash` | Same convention, different file extension. |
| `+layout.svelte` | `layout.akash` | Same convention. |
| `+page.server.ts` (load) | `loader.ts` | Same concept, different file. |
| `onMount()` | `onMount()` | Identical name and behavior. |
| `onDestroy()` | `onUnmount()` | Different name, same concept. |
| `<slot>` | `ctx.children()` | Function call instead of element. |
| `bind:value` | Manual `value` + `onInput` | Explicit binding. |
| Snippets (`{#snippet}`) | Callback props (render functions) | Pass render functions as props. |

## Key Differences

### Signal Reads Are Explicit

Svelte 5 runes look like plain variables. AkashJS signals are function calls.

```ts
// Svelte 5
let count = $state(0);
console.log(count);   // just read the variable
count++;              // just assign

// AkashJS
const count = signal(0);
console.log(count()); // call the signal
count.update(c => c + 1); // use .set() or .update()
```

::: info Why function calls?
Explicit signal reads make dependency tracking unambiguous. The compiler and runtime always know exactly which signals are being read in a given context. No proxy magic, no compiler transforms of variable access.
:::

### Template Expressions

Svelte uses `{variable}` with implicit reactivity. AkashJS uses `{signal()}` with explicit signal calls.

```html
<!-- Svelte -->
<p>{count}</p>

<!-- AkashJS -->
<p>{count()}</p>
```

### Stores Are More Structured

Svelte stores are simple writable/readable primitives. AkashJS stores have state, getters, and actions.

```ts
// Svelte
import { writable, derived } from 'svelte/store';

const count = writable(0);
const doubled = derived(count, $c => $c * 2);

function increment() {
  count.update(c => c + 1);
}
```

```ts
// AkashJS
import { defineStore } from '@akashjs/runtime';

const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  getters: {
    doubled: (state) => state.count() * 2,
  },
  actions: {
    increment() {
      this.count.update(c => c + 1);
    },
  },
});
```

### Event Handling

Svelte uses `on:click`. AkashJS uses `onClick` (JSX-style).

```html
<!-- Svelte -->
<button on:click={increment}>+</button>
<button on:click|preventDefault={submit}>Submit</button>

<!-- AkashJS -->
<button onClick={increment}>+</button>
<button onClick={(e) => { e.preventDefault(); submit(); }}>Submit</button>
```

::: info Event modifiers
Svelte has built-in event modifiers (`|preventDefault`, `|stopPropagation`). AkashJS handles these in the handler function. This is more explicit but slightly more verbose.
:::

## Side-by-Side Examples

### 1. Counter Component

**Svelte 5:**
```html
<script lang="ts">
  let count = $state(0);
  let doubled = $derived(count * 2);
</script>

<button onclick={() => count++}>
  {count} (doubled: {doubled})
</button>
```

**AkashJS:**
```html
<script lang="ts">
import { signal, computed } from '@akashjs/runtime';

const count = signal(0);
const doubled = computed(() => count() * 2);
</script>

<template>
  <button onClick={() => count.update(c => c + 1)}>
    {count()} (doubled: {doubled()})
  </button>
</template>
```

### 2. Each/For Loops

**Svelte:**
```html
{#each items as item (item.id)}
  <li>{item.name}</li>
{/each}
```

**AkashJS:**
```html
<For each={items()} key={(item) => item.id}>
  {(item) => <li>{item.name}</li>}
</For>
```

### 3. Conditional Rendering

**Svelte:**
```html
{#if isLoggedIn}
  <Dashboard />
{:else}
  <LoginForm />
{/if}
```

**AkashJS:**
```html
<Show when={isLoggedIn()} fallback={() => <LoginForm />}>
  <Dashboard />
</Show>
```

### 4. Transitions

**Svelte:**
```html
<script>
  import { fade } from 'svelte/transition';
  let visible = $state(true);
</script>

{#if visible}
  <div transition:fade>Fading content</div>
{/if}
```

**AkashJS:**
```html
<script lang="ts">
import { Transition } from '@akashjs/runtime';
import { signal } from '@akashjs/runtime';

const visible = signal(true);
</script>

<template>
  <Transition name="fade" when={visible()}>
    <div>Fading content</div>
  </Transition>
</template>

<style>
.fade-enter-active, .fade-exit-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-exit-to { opacity: 0; }
</style>
```

### 5. Actions vs Directives

**Svelte:**
```ts
// use:clickOutside
export function clickOutside(node: HTMLElement, callback: () => void) {
  const handler = (e: MouseEvent) => {
    if (!node.contains(e.target as Node)) callback();
  };
  document.addEventListener('click', handler);
  return {
    destroy() {
      document.removeEventListener('click', handler);
    },
  };
}
```

**AkashJS:**
```ts
import { defineDirective } from '@akashjs/runtime';

const vClickOutside = defineDirective<() => void>({
  mounted(el, { value: callback }) {
    const handler = (e: MouseEvent) => {
      if (!el.contains(e.target as Node)) callback();
    };
    document.addEventListener('click', handler);
    (el as any).__clickOutsideCleanup = () =>
      document.removeEventListener('click', handler);
  },
  unmounted(el) {
    (el as any).__clickOutsideCleanup?.();
  },
});
```

::: tip AkashJS ships vClickOutside built-in
You do not need to write your own. Import it from `@akashjs/runtime`.
:::

## Migration Plan

Because Svelte and AkashJS are so similar, migration is mostly a syntax translation.

### Phase 1: Setup (1 day)
1. Add AkashJS packages to your project.
2. Configure Vite with `@akashjs/vite-plugin`.

### Phase 2: Translate Components (1-2 weeks)
1. Rename `.svelte` files to `.akash`.
2. Add `<template>` wrapper around markup.
3. Replace `$state()` with `signal()`, add `()` to reads.
4. Replace `$derived()` with `computed()`.
5. Replace `$effect()` with `effect()`.
6. Replace `{#if}` with `<Show>`, `{#each}` with `<For>`.
7. Replace `on:click` with `onClick`.
8. Replace `<slot>` with `ctx.children()`.

### Phase 3: Stores (2-3 days)
1. Replace Svelte writable/readable stores with `defineStore()`.
2. The API is slightly different (state + getters + actions) but maps directly.

### Phase 4: Routing (3-5 days)
1. Convert SvelteKit file-based routes to AkashJS file-based routes.
2. `+page.svelte` becomes `page.akash`.
3. `+layout.svelte` becomes `layout.akash`.
4. `+page.server.ts` load functions become `loader.ts`.

### Phase 5: Remove Svelte (1 day)
1. Remove `svelte`, `@sveltejs/kit`, and related packages.
2. Remove Svelte-specific Vite plugin.

::: tip The shortest migration path
Svelte developers will find AkashJS the most natural transition. The mental model is almost identical -- signals, compiler, SFCs, small runtime. The main differences are explicit signal reads (`count()` vs `count`), JSX-style events (`onClick` vs `on:click`), and structured stores.
:::
