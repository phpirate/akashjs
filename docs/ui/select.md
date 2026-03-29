# Select

A Material Design 3 dropdown select built on a styled native `<select>` element. Provides floating label animation, placeholder support, and reactive value binding.

## Import

```ts
import { Select } from '@akashjs/ui';
```

## Basic Usage

```ts
Select({
  label: 'Country',
  options: [
    { value: 'us', label: 'United States' },
    { value: 'uk', label: 'United Kingdom' },
    { value: 'ca', label: 'Canada' },
  ],
  onChange: (value) => console.log('Selected:', value),
})
```

## With Placeholder

```ts
Select({
  label: 'Role',
  placeholder: 'Choose a role...',
  options: [
    { value: 'admin', label: 'Admin' },
    { value: 'editor', label: 'Editor' },
    { value: 'viewer', label: 'Viewer' },
  ],
})
```

The placeholder is rendered as a disabled `<option>` that is selected by default when there is no value.

## With Signal Binding

```ts
import { signal } from '@akashjs/runtime';

const selected = signal('');

Select({
  label: 'Category',
  value: selected,
  options: [
    { value: 'tech', label: 'Technology' },
    { value: 'science', label: 'Science' },
    { value: 'art', label: 'Art' },
  ],
})

// React to changes
effect(() => {
  console.log('Category:', selected());
});
```

## Disabled

```ts
Select({
  label: 'Plan',
  disabled: true,
  options: [
    { value: 'free', label: 'Free' },
    { value: 'pro', label: 'Pro' },
  ],
  value: signal('free'),
})
```

## Visual Details

The Select uses an outlined style with a 1px border that becomes 2px primary on focus. A custom dropdown arrow SVG is positioned on the right. The floating label animates to `-8px` above the border when the select has focus or a value, with a surface-colored background to cut through the border.

## Props

| Name | Type | Default | Description |
|---|---|---|---|
| `options` | `SelectOption[]` | `[]` | Array of `{ value: string, label: string }` objects |
| `value` | `Signal<string>` | -- | Two-way bound selected value |
| `label` | `string` | -- | Floating label text |
| `disabled` | `boolean` | `false` | Disables the select |
| `placeholder` | `string` | -- | Placeholder text (rendered as a disabled option) |
| `onChange` | `(value: string) => void` | -- | Called when the selection changes |

### SelectOption

| Name | Type | Description |
|---|---|---|
| `value` | `string` | The option value |
| `label` | `string` | The displayed text |
