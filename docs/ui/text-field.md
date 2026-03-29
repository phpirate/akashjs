# TextField

A Material Design 3 text input with filled and outlined variants, floating label animation, error states, and helper text. Supports two-way binding through Signals.

## Import

```ts
import { TextField } from '@akashjs/ui';
```

## Variants

### Filled (default)

Uses a tinted background with a bottom border.

```ts
TextField({
  label: 'Username',
  variant: 'filled',
})
```

### Outlined

Uses a full border with no background fill. The label floats into the border on focus.

```ts
TextField({
  label: 'Username',
  variant: 'outlined',
})
```

## Floating Label

When a `label` is provided, it sits centered inside the field and animates up (floats) when the input is focused or has a value. On focus, the label turns the primary color. On blur with no value, it returns to its resting position.

```ts
TextField({
  label: 'Email address',
  type: 'email',
})
```

## Two-Way Binding with Signals

Pass a `Signal<string>` to the `value` prop for reactive two-way binding. The input updates the Signal on every keystroke, and the input reflects any external changes to the Signal.

```ts
import { signal } from '@akashjs/runtime';

const name = signal('');

TextField({
  label: 'Full Name',
  value: name,
})

// Read the value reactively
effect(() => {
  console.log('Name is:', name());
});
```

## Error State

Pass an `error` string to show the field in an error state. The border, label, and caret turn the error color, and the error message appears below the field.

```ts
TextField({
  label: 'Email',
  type: 'email',
  error: 'Please enter a valid email address',
})
```

## Helper Text

Display supplementary text below the field using `helperText`. If both `error` and `helperText` are provided, the error takes precedence.

```ts
TextField({
  label: 'Password',
  type: 'password',
  helperText: 'Must be at least 8 characters',
})
```

## Input Types

The `type` prop maps directly to the HTML input type attribute.

```ts
// Password field
TextField({ label: 'Password', type: 'password' })

// Email field
TextField({ label: 'Email', type: 'email' })

// Number field
TextField({ label: 'Quantity', type: 'number' })

// Default text field
TextField({ label: 'Notes', type: 'text' })
```

## Disabled

```ts
TextField({
  label: 'Read Only',
  disabled: true,
  value: signal('Cannot edit'),
})
```

## Event Handlers

```ts
TextField({
  label: 'Search',
  onInput: (value) => console.log('Typed:', value),
  onBlur: (e) => console.log('Blurred'),
})
```

## Props

| Name | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | -- | Floating label text |
| `value` | `Signal<string>` | -- | Two-way bound value via Signal |
| `type` | `'text' \| 'password' \| 'email' \| 'number'` | `'text'` | HTML input type |
| `placeholder` | `string` | -- | Placeholder text when empty and unfocused |
| `disabled` | `boolean` | `false` | Disables the input |
| `error` | `string` | -- | Error message (also triggers error styling) |
| `helperText` | `string` | -- | Helper text below the field |
| `variant` | `'filled' \| 'outlined'` | `'filled'` | Visual style variant |
| `onInput` | `(value: string) => void` | -- | Called on every input event with the current value |
| `onBlur` | `(e: FocusEvent) => void` | -- | Called when the input loses focus |
