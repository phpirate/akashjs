# Expansion Panel / Accordion

Collapsible content panels with smooth height animation. `Accordion` groups panels and optionally restricts to one open at a time.

## Import

```ts
import { Accordion, ExpansionPanel } from '@akashjs/ui';
import type { AccordionProps, ExpansionPanelProps } from '@akashjs/ui';
```

## Basic Accordion (Single Open)

```ts
Accordion({
  children: () => [
    ExpansionPanel({ title: 'Section 1', expanded: true, content: () => div1 }),
    ExpansionPanel({ title: 'Section 2', content: () => div2 }),
    ExpansionPanel({ title: 'Section 3', content: () => div3 }),
  ],
})
```

## Multi-Open Mode

```ts
Accordion({
  multi: true,
  children: () => [
    ExpansionPanel({ title: 'FAQ 1', content: () => answer1 }),
    ExpansionPanel({ title: 'FAQ 2', content: () => answer2 }),
  ],
})
```

## Title + Description

```ts
ExpansionPanel({
  title: 'Access Keys',
  description: 'Manage API keys for this site',
  content: () => keyTable,
})
```

## Custom Header

```ts
ExpansionPanel({
  header: () => {
    const h = document.createElement('div');
    h.innerHTML = '<strong>Custom</strong> header with <em>HTML</em>';
    return h;
  },
  content: () => bodyContent,
})
```

## Flat Variant (No Shadow/Border)

```ts
ExpansionPanel({
  title: 'Sidebar Section',
  variant: 'flat',
  content: () => navLinks,
})
```

## Controlled Expanded State

Pass a signal for external control:

```ts
const isOpen = signal(false);

ExpansionPanel({
  title: 'Programmatic Panel',
  expanded: isOpen,
  onOpen: () => console.log('opened'),
  onClose: () => console.log('closed'),
  content: () => panelContent,
})

// Toggle programmatically
isOpen.set(true);
```

## Disabled / Hidden Toggle

```ts
ExpansionPanel({
  title: 'Read-only',
  disabled: true,
  hideToggle: true,
  expanded: true,
  content: () => readOnlyContent,
})
```

## Custom Panel Class

```ts
ExpansionPanel({
  title: 'Upload File',
  panelClass: 'upload-panel',
  content: () => uploadForm,
})
```

## Keyboard Support

| Key | Action |
|-----|--------|
| Enter / Space | Toggle panel open/close |
| Tab | Move focus between panel headers |

## Accordion Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `multi` | `boolean` | `false` | Allow multiple panels open |

## ExpansionPanel Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `expanded` | `boolean \| Signal<boolean>` | `false` | Open state |
| `title` | `string` | -- | Header title text |
| `description` | `string` | -- | Subtitle below title |
| `header` | `() => AkashNode` | -- | Custom header renderer |
| `content` | `() => AkashNode` | -- | Panel body content |
| `onOpen` | `() => void` | -- | Opened callback |
| `onClose` | `() => void` | -- | Closed callback |
| `disabled` | `boolean` | `false` | Prevent toggling |
| `hideToggle` | `boolean` | `false` | Hide expand arrow |
| `variant` | `'elevated' \| 'flat'` | `'elevated'` | Visual style |
| `panelClass` | `string` | -- | Custom CSS class |
