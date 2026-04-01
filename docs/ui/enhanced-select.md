# Enhanced Select

A Material Design 3 custom dropdown (not native `<select>`) with search, multi-select, option groups, keyboard navigation, and custom rendering.

For simple cases, use the basic `Select` component. Use `EnhancedSelect` when you need search, multi-select, grouped options, or custom option rendering.

## Import

```ts
import { EnhancedSelect } from '@akashjs/ui';
import type { EnhancedSelectProps, EnhancedSelectOption, EnhancedSelectOptionGroup } from '@akashjs/ui';
```

## Basic Usage

```ts
EnhancedSelect({
  label: 'Status',
  options: [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' },
  ],
  value: status(),
  onChange: (v) => status.set(v),
})
```

## Searchable

```ts
EnhancedSelect({
  label: 'Site',
  searchable: true,
  placeholder: 'Select site...',
  options: sites().map(s => ({ value: s, label: s.name })),
  value: selectedSite(),
  onChange: (v) => selectedSite.set(v),
  compareWith: (a, b) => a?.id === b?.id,
})
```

## Multi-Select

```ts
EnhancedSelect({
  label: 'Tags',
  multiple: true,
  searchable: true,
  showSelectAll: true,
  options: tags().map(t => ({ value: t, label: t.name })),
  value: selectedTags(),
  onChange: (v) => selectedTags.set(v),
})
```

## Grouped Options

```ts
EnhancedSelect({
  label: 'Domain',
  groups: [
    { label: 'Call Center', options: [
      { value: 'support', label: 'Support' },
      { value: 'sales', label: 'Sales' },
    ]},
    { label: 'Broadcast', options: [
      { value: 'news', label: 'News' },
      { value: 'sports', label: 'Sports' },
    ]},
  ],
  value: domain(),
  onChange: (v) => domain.set(v),
})
```

## Custom Option Rendering

```ts
EnhancedSelect({
  options: languages().map(l => ({ value: l, label: l.name, icon: 'translate' })),
  value: selectedLang(),
  onChange: (v) => selectedLang.set(v),
  renderOption: (opt) => {
    const div = document.createElement('div');
    div.textContent = `${opt.label} (${opt.value.code})`;
    return div;
  },
})
```

## Clearable

```ts
EnhancedSelect({
  options: [...],
  value: selected(),
  onChange: (v) => selected.set(v),
  clearable: true,
})
```

## Keyboard Navigation

| Key | Action |
|-----|--------|
| Arrow Down/Up | Navigate options |
| Enter | Select highlighted option |
| Escape | Close dropdown |
| Space | Open dropdown (when not searchable) |
| Home / End | Jump to first/last option |

## Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `T \| T[]` | -- | Current value(s) |
| `options` | `EnhancedSelectOption[]` | -- | Flat options |
| `groups` | `EnhancedSelectOptionGroup[]` | -- | Grouped options |
| `onChange` | `(value) => void` | -- | Change handler |
| `multiple` | `boolean` | `false` | Multi-select mode |
| `searchable` | `boolean` | `false` | Show search input |
| `searchDebounce` | `number` | `200` | Search debounce (ms) |
| `placeholder` | `string` | `''` | Placeholder text |
| `label` | `string` | -- | Floating label |
| `disabled` | `boolean` | `false` | Disabled state |
| `compareWith` | `(a, b) => boolean` | `===` | Custom equality |
| `renderOption` | `(opt) => AkashNode` | -- | Custom option renderer |
| `renderValue` | `(selected) => AkashNode` | -- | Custom display renderer |
| `noResultsMessage` | `string` | `'No results found'` | Empty search message |
| `clearable` | `boolean` | `false` | Show clear button |
| `showSelectAll` | `boolean` | `false` | Select all (multi mode) |
| `maxVisible` | `number` | `6` | Max visible options before scroll |
| `autoClose` | `boolean` | `true` | Close after selection (single mode) |
| `panelClass` | `string` | -- | Custom panel CSS class |
| `width` | `string` | `'210px'` | Minimum width |
