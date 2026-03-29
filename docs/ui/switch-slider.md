# Switch & Slider

Toggle and range controls. Switch provides an on/off toggle with animated track and thumb. Slider offers a draggable range input with filled track visualization.

## Switch

### Import

```ts
import { Switch } from '@akashjs/ui';
```

### Basic Usage

```ts
Switch({
  label: 'Notifications',
  checked: false,
  onChange: (on) => console.log('Switched:', on),
})
```

### With Signal Binding

```ts
import { signal } from '@akashjs/runtime';

const enabled = signal(true);

Switch({
  label: 'Dark mode',
  checked: enabled,
  onChange: (on) => console.log('Dark mode:', on),
})
```

### Disabled

```ts
Switch({
  label: 'Disabled toggle',
  checked: true,
  disabled: true,
})
```

### Toggle Animation

When toggled, the track and thumb animate over 200ms:
- **Track:** Background color transitions between `surface-container-highest` (off) and `primary` (on). Border color changes from `outline` to `primary`.
- **Thumb:** Slides from left (4px) to right (24px), grows from 16px to 24px diameter, and changes color from `outline` to `on-primary`.

### Switch Props

| Name | Type | Default | Description |
|---|---|---|---|
| `checked` | `Signal<boolean> \| boolean` | `false` | Toggle state, supports Signal for two-way binding |
| `disabled` | `boolean` | `false` | Disables the switch |
| `label` | `string` | -- | Text label displayed beside the switch |
| `onChange` | `(checked: boolean) => void` | -- | Called when the toggle state changes |

---

## Slider

### Import

```ts
import { Slider } from '@akashjs/ui';
```

### Basic Usage

```ts
Slider({
  label: 'Volume',
  min: 0,
  max: 100,
  step: 1,
  onChange: (value) => console.log('Volume:', value),
})
```

### With Signal Binding

```ts
import { signal } from '@akashjs/runtime';

const brightness = signal(50);

Slider({
  label: 'Brightness',
  value: brightness,
  min: 0,
  max: 100,
  step: 5,
})

// Read reactively
effect(() => {
  console.log('Brightness:', brightness());
});
```

### Custom Range and Step

```ts
Slider({
  label: 'Temperature',
  min: 16,
  max: 30,
  step: 0.5,
  value: signal(22),
})
```

### Disabled

```ts
Slider({
  label: 'Locked',
  value: 60,
  disabled: true,
})
```

### Drag Interaction

The slider responds to pointer events (mouse and touch). Clicking anywhere on the track snaps the thumb to that position. Dragging uses pointer capture for smooth tracking even when the cursor leaves the slider bounds. A hover state ring (40px) appears around the thumb on interaction.

### Slider Props

| Name | Type | Default | Description |
|---|---|---|---|
| `value` | `Signal<number> \| number` | `min` | Current value, supports Signal for two-way binding |
| `min` | `number` | `0` | Minimum value |
| `max` | `number` | `100` | Maximum value |
| `step` | `number` | `1` | Step increment (values snap to nearest step) |
| `disabled` | `boolean` | `false` | Disables the slider |
| `label` | `string` | -- | Label text displayed above the slider |
| `onChange` | `(value: number) => void` | -- | Called when the value changes |
