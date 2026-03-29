# Migrating from Vue

Vue and AkashJS share many concepts. If you know Vue's Composition API, you will feel at home.

## Concept Mapping

| Vue 3 | AkashJS | Notes |
|---|---|---|
| `ref()` | `signal()` | Same concept. Read with `signal()` instead of `.value`. |
| `computed()` | `computed()` | Identical concept and name. |
| `watch()` | `watch()` | Same API -- old value, new value, options. |
| `watchEffect()` | `effect()` | Auto-tracked side effects. |
| `provide()` / `inject()` | `provide()` / `inject()` | Same names, same concept. |
| Pinia store | `defineStore()` | Very similar API -- state, getters, actions. |
| Vue Router | `@akashjs/router` | File-based routing instead of route config arrays. |
| SFC (`.vue`) | SFC (`.akash`) | Same three sections: script, template, style. |
| `v-if` | `<Show when={...}>` or `:if` | Same concept, different syntax. |
| `v-for` | `<For each={...}>` or `:for` | Same concept, different syntax. |
| `v-model` | `bind:value` or manual binding | Two-way binding on form elements. |
| `v-bind:class` | `class={...}` | Expression-based class binding. |
| `v-on:click` | `onClick={...}` | JSX-style event binding. |
| `<Teleport>` | `<Portal>` | Same concept, different name. |
| `<Transition>` | `<Transition>` | Same name, same concept. |
| `<Suspense>` | `<Suspense>` | Same name, same concept. |
| `defineProps()` | `Props` interface | TypeScript interface instead of macro. |
| `defineEmits()` | Callback props | Pass `onEvent` functions instead of emitting. |
| `onMounted()` | `onMount()` | Same concept. |
| `onUnmounted()` | `onUnmount()` | Same concept. |
| `nextTick()` | `batch()` | Batching updates, not waiting for DOM. |

## Key Differences

### Reading Reactive Values

Vue uses `.value` for refs. AkashJS uses function calls.

```ts
// Vue
const count = ref(0);
console.log(count.value); // read
count.value++;            // write

// AkashJS
const count = signal(0);
console.log(count());     // read
count.set(count() + 1);   // write
count.update(c => c + 1); // update from previous
```

### Template Syntax

Vue uses directives (`v-if`, `v-for`). AkashJS uses components (`<Show>`, `<For>`) or shorthand directives (`:if`, `:for`).

```html
<!-- Vue -->
<div v-if="isVisible">Visible</div>
<ul>
  <li v-for="item in items" :key="item.id">{{ item.name }}</li>
</ul>
```

```html
<!-- AkashJS — component syntax -->
<Show when={isVisible()}>
  <div>Visible</div>
</Show>
<ul>
  <For each={items()} key={(item) => item.id}>
    {(item) => <li>{item.name}</li>}
  </For>
</ul>
```

```html
<!-- AkashJS — directive shorthand -->
<div :if={isVisible()}>Visible</div>
<li :for={item of items()}>{item.name}</li>
```

### Events

Vue emits events. AkashJS passes callback props.

```html
<!-- Vue child -->
<script setup>
const emit = defineEmits(['select']);
</script>
<template>
  <button @click="emit('select', item)">Select</button>
</template>

<!-- Vue parent -->
<MyComponent @select="handleSelect" />
```

```html
<!-- AkashJS child -->
<script lang="ts">
interface Props {
  onSelect?: (item: Item) => void;
}
</script>
<template>
  <button onClick={() => ctx.props.onSelect?.(item)}>Select</button>
</template>

<!-- AkashJS parent -->
<MyComponent onSelect={handleSelect} />
```

## Side-by-Side Examples

### 1. Single-File Component

**Vue:**
```html
<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{ initial: number }>();

const count = ref(props.initial);
const doubled = computed(() => count.value * 2);
const increment = () => count.value++;
</script>

<template>
  <div>
    <span>{{ count }} (doubled: {{ doubled }})</span>
    <button @click="increment">+</button>
  </div>
</template>

<style scoped>
div { display: flex; gap: 1rem; }
</style>
```

**AkashJS:**
```html
<script lang="ts">
import { signal, computed } from '@akashjs/runtime';

interface Props { initial: number }

const count = signal(ctx.props.initial);
const doubled = computed(() => count() * 2);
const increment = () => count.update(c => c + 1);
</script>

<template>
  <div>
    <span>{count()} (doubled: {doubled()})</span>
    <button onClick={increment}>+</button>
  </div>
</template>

<style scoped>
div { display: flex; gap: 1rem; }
</style>
```

### 2. Pinia Store vs defineStore

**Vue (Pinia):**
```ts
import { defineStore } from 'pinia';

export const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0,
    name: 'My Counter',
  }),
  getters: {
    doubled: (state) => state.count * 2,
  },
  actions: {
    increment() {
      this.count++;
    },
  },
});
```

**AkashJS:**
```ts
import { defineStore } from '@akashjs/runtime';

export const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0,
    name: 'My Counter',
  }),
  getters: {
    doubled: (state) => state.count() * 2,  // note: state.count() is a signal call
  },
  actions: {
    increment() {
      this.count.update(c => c + 1);  // note: .update() instead of ++
    },
  },
});
```

::: info Almost identical
The API shape is nearly the same as Pinia. The key difference is that state properties are signals, so you read with `()` and write with `.set()` or `.update()`.
:::

### 3. Watch

**Vue:**
```ts
import { ref, watch } from 'vue';

const query = ref('');
watch(query, (newVal, oldVal) => {
  console.log(`Changed from ${oldVal} to ${newVal}`);
}, { immediate: true });
```

**AkashJS:**
```ts
import { signal } from '@akashjs/runtime';
import { watch } from '@akashjs/runtime';

const query = signal('');
watch(query, (newVal, oldVal) => {
  console.log(`Changed from ${oldVal} to ${newVal}`);
}, { immediate: true });
```

### 4. Provide / Inject

**Vue:**
```ts
// Parent
import { provide, ref } from 'vue';
const theme = ref('dark');
provide('theme', theme);

// Child
import { inject } from 'vue';
const theme = inject('theme');
```

**AkashJS:**
```ts
// Parent
import { createContext, provide } from '@akashjs/runtime';
const ThemeContext = createContext<'light' | 'dark'>('light');
provide(ThemeContext, 'dark');

// Child
import { inject } from '@akashjs/runtime';
const theme = inject(ThemeContext); // typed as 'light' | 'dark'
```

### 5. Routing

**Vue Router:**
```ts
const routes = [
  { path: '/', component: Home },
  { path: '/blog/:slug', component: BlogPost },
  {
    path: '/dashboard',
    component: DashboardLayout,
    beforeEnter: authGuard,
    children: [
      { path: '', component: Dashboard },
      { path: 'settings', component: Settings },
    ],
  },
];
```

**AkashJS (file-based):**
```
src/routes/
├── page.akash              → /
├── blog/
│   └── [slug]/
│       └── page.akash      → /blog/:slug
└── dashboard/
    ├── layout.akash         → layout wrapper
    ├── guard.ts             → auth guard
    ├── page.akash           → /dashboard
    └── settings/
        └── page.akash       → /dashboard/settings
```

## Migration Plan

Vue and AkashJS are close enough that migration is mostly mechanical.

### Phase 1: Setup (1 day)
1. Add AkashJS packages to your Vue project.
2. Configure Vite to handle `.akash` files alongside `.vue` files.

### Phase 2: Translate Syntax (1-2 weeks)
1. Rename `.vue` files to `.akash`.
2. Replace `ref()` with `signal()`, `.value` reads with `()` calls.
3. Replace `@click` with `onClick`, `v-if` with `:if` or `<Show>`, `v-for` with `:for` or `<For>`.
4. Replace `defineEmits` with callback props.
5. Replace Pinia stores -- the API is nearly identical.

### Phase 3: Routing (2-3 days)
1. Convert route config array to file-based routes.
2. Convert navigation guards to `guard.ts` files.

### Phase 4: Remove Vue (1 day)
1. Remove `vue`, `pinia`, `vue-router` packages.
2. Remove Vue-specific Vite plugin.

::: tip The easiest migration
Vue developers have the gentlest learning curve with AkashJS. The mental models are nearly identical -- signals are reactive refs, computed is computed, watch is watch, stores are stores. The main adjustment is template syntax.
:::
