# Checkbox & Radio

Selection controls for toggling a single option (Checkbox) or choosing one from a group (Radio). Both include custom SVG indicators and Material ripple effects.

## Checkbox

### Import

```ts
import { Checkbox } from '@akashjs/ui';
```

### Basic Usage

```ts
Checkbox({
  label: 'Accept terms',
  checked: false,
  onChange: (checked) => console.log('Checked:', checked),
})
```

### With Signal Binding

Pass a `Signal<boolean>` for reactive two-way binding. The checkbox updates the Signal, and external Signal changes update the checkbox.

```ts
import { signal } from '@akashjs/runtime';

const agreed = signal(false);

Checkbox({
  label: 'I agree to the terms',
  checked: agreed,
})

// Read reactively
effect(() => {
  console.log('Agreed:', agreed());
});
```

### Disabled

```ts
Checkbox({
  label: 'Unavailable option',
  checked: true,
  disabled: true,
})
```

### Visual Behavior

When checked, the checkbox fills with the primary color and displays a white checkmark SVG with a scale-in animation. An outer ripple area (40px circle) responds to clicks with a Material ink ripple.

### Checkbox Props

| Name | Type | Default | Description |
|---|---|---|---|
| `checked` | `Signal<boolean> \| boolean` | `false` | Checked state, supports Signal for two-way binding |
| `disabled` | `boolean` | `false` | Disables the checkbox |
| `label` | `string` | -- | Text label displayed beside the checkbox |
| `onChange` | `(checked: boolean) => void` | -- | Called when the checked state changes |

---

## Radio

### Import

```ts
import { Radio } from '@akashjs/ui';
```

### Basic Usage

Radio buttons work in groups via the `name` prop. Each radio has a unique `value`.

```ts
Radio({
  name: 'size',
  value: 'small',
  label: 'Small',
  checked: true,
  onChange: (value) => console.log('Selected:', value),
})

Radio({
  name: 'size',
  value: 'medium',
  label: 'Medium',
  onChange: (value) => console.log('Selected:', value),
})

Radio({
  name: 'size',
  value: 'large',
  label: 'Large',
  onChange: (value) => console.log('Selected:', value),
})
```

### Disabled

```ts
Radio({
  name: 'color',
  value: 'red',
  label: 'Red (sold out)',
  disabled: true,
})
```

### Visual Behavior

The radio renders a custom SVG with an outer circle (stroke) and an inner filled circle that scales up from `r=0` to `r=5` when selected. The outer circle changes to the primary color when checked. A 40px ripple area surrounds the indicator.

### Radio Props

| Name | Type | Default | Description |
|---|---|---|---|
| `checked` | `boolean` | `false` | Whether this radio is currently selected |
| `name` | `string` | -- | Group name (all radios in a group share the same name) |
| `value` | `string` | `''` | The value associated with this radio |
| `disabled` | `boolean` | `false` | Disables the radio button |
| `label` | `string` | -- | Text label displayed beside the radio |
| `onChange` | `(value: string) => void` | -- | Called with the radio's value when selected |
