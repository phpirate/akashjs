# Combobox

A searchable dropdown with text input, filtered results, keyboard navigation, and selection tracking. Use it for project pickers, user selectors, or any filterable list.

## Basic Usage

```ts
import { Combobox } from '@akashjs/ui';
import { signal } from '@akashjs/runtime';

const selected = signal(null);
const projects = signal([
  { id: 1, name: 'Website Redesign' },
  { id: 2, name: 'Mobile App' },
  { id: 3, name: 'API Gateway' },
]);
```

```html
<template>
  <Combobox
    options={projects()}
    value={selected()}
    displayFn={(p) => p.name}
    filterFn={(p, term) => p.name.toLowerCase().includes(term)}
    onSelect={(p) => selected.set(p)}
    placeholder="Search projects..."
  />
</template>
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `options` | `T[]` | `[]` | Array of options to display |
| `value` | `T \| null` | `null` | Currently selected value |
| `displayFn` | `(item: T) => string` | `String` | How to display each option |
| `filterFn` | `(item: T, term: string) => boolean` | case-insensitive includes | Custom filter logic |
| `onSelect` | `(item: T) => void` | — | Called when an option is selected |
| `placeholder` | `string` | `'Search...'` | Input placeholder text |
| `disabled` | `boolean` | `false` | Disable the input |
| `width` | `string` | `'100%'` | Input width |
| `panelWidth` | `string` | `'100%'` | Dropdown panel width |
| `emptyMessage` | `string` | `'No results'` | Message when filter returns empty |
| `searchable` | `boolean` | `true` | Whether the input allows typing |
| `triggerEl` | `HTMLElement \| null` | — | Anchor to external element (custom trigger mode) |
| `open` | `boolean` | — | External open state (for custom trigger mode) |
| `onClose` | `() => void` | — | Called when dropdown should close |

## Custom Trigger Mode

Attach the dropdown to any element — a breadcrumb pill, a button, a chip — instead of the built-in input:

```ts
const buttonRef = ref<HTMLElement>();
const isOpen = signal(false);
```

```html
<template>
  <button ref={buttonRef} onClick={() => isOpen.update(v => !v)}>
    {selected()?.name ?? 'Select project...'}
  </button>
  <Combobox
    options={projects()}
    value={selected()}
    displayFn={(p) => p.name}
    onSelect={(p) => { selected.set(p); isOpen.set(false); }}
    triggerEl={buttonRef.current}
    open={isOpen()}
    onClose={() => isOpen.set(false)}
    panelWidth="240px"
    placeholder="Search projects..."
  />
</template>
```

In custom trigger mode:
- The Combobox renders no visible input — only the floating panel
- The panel appears anchored below the trigger element
- A search input is included at the top of the panel
- The panel auto-focuses the search input on open
- Clicking outside or pressing Escape closes the panel

## Keyboard Navigation

| Key | Action |
|-----|--------|
| `Arrow Down` | Move highlight down |
| `Arrow Up` | Move highlight up |
| `Enter` | Select highlighted option |
| `Escape` | Close dropdown |

## With Async Options

```ts
const searchTerm = signal('');
const results = createResource(async () => {
  const res = await fetch(`/api/users?q=${searchTerm()}`);
  return res.json();
}, { key: () => searchTerm() });
```

```html
<template>
  <Combobox
    options={results() ?? []}
    displayFn={(u) => u.name}
    onSelect={handleSelect}
    placeholder="Search users..."
  />
</template>
```

## Selected Item Display

The selected item shows a checkmark (✓) in the dropdown. The input text updates to the selected item's display value.

## Styling

The Combobox uses Material Design 3 tokens:
- `--md-sys-color-surface` — input background
- `--md-sys-color-on-surface` — text color
- `--md-sys-color-outline` — border color
- `--md-sys-color-primary` — focus border color
- `--md-sys-color-surface-container` — dropdown background
- `--md-sys-color-surface-container-highest` — hover highlight
