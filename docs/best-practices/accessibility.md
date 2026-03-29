# Accessibility Best Practices

AkashJS ships accessibility primitives as built-in composables. Use them.

## Checklist

### Semantic HTML

- [ ] Use `<button>` for actions, `<a>` for navigation, `<nav>` for nav, `<main>` for main content
- [ ] Use heading levels (`<h1>` through `<h6>`) in order -- do not skip levels
- [ ] Use `<ul>`/`<ol>` for lists, `<table>` for tabular data
- [ ] Use `<form>` with `<label>` for inputs

```html
<!-- DON'T: div soup -->
<div class="btn" onClick={submit}>Submit</div>
<div class="link" onClick={() => navigate('/about')}>About</div>
```

```html
<!-- DO: semantic elements -->
<button onClick={submit}>Submit</button>
<Link to="/about">About</Link>
```

### Images and Alt Text

- [ ] Every `<img>` and `<Image>` has an `alt` attribute
- [ ] Decorative images use `alt=""`
- [ ] Informative images have descriptive alt text

```html
<!-- DON'T -->
<Image src="/logo.png" />
<img src={user.avatar} />
```

```html
<!-- DO -->
<Image src="/logo.png" alt="AkashJS logo" />
<img src={user.avatar} alt={`${user.name}'s profile photo`} />
<img src="/decorative-line.svg" alt="" />  <!-- decorative -->
```

### Focus Management

- [ ] Modals, dialogs, and drawers use `useFocusTrap()`
- [ ] Focus returns to the trigger element when overlays close
- [ ] Custom components are keyboard-accessible

```ts
import { useFocusTrap } from '@akashjs/runtime';

const trap = useFocusTrap({
  escapeDeactivates: true,
  returnFocus: true,
});

effect(() => {
  modalOpen() ? trap.activate() : trap.deactivate();
});
```

::: tip Always set returnFocus: true
When a modal closes, focus should return to the button that opened it. This is critical for keyboard and screen reader users.
:::

### Screen Reader Announcements

- [ ] Route changes are announced with `useAnnounce()`
- [ ] Dynamic content updates (toasts, notifications, live data) are announced
- [ ] Use `'polite'` for non-urgent updates, `'assertive'` for errors

```ts
import { useAnnounce } from '@akashjs/runtime';

const announce = useAnnounce();

// After adding to cart
announce('Item added to cart');

// On error
announce('Failed to save. Please try again.', 'assertive');
```

::: info Route announcements are automatic
The router calls `announce()` with the page title on every navigation by default. You do not need to set this up manually.
:::

### Keyboard Navigation

- [ ] All interactive elements are reachable via Tab
- [ ] Custom widgets support expected keyboard patterns (Enter to activate, Escape to close, Arrow keys for lists)
- [ ] Keyboard shortcuts use `useKeyboard()` with cross-platform `mod` modifier

```ts
import { useKeyboard } from '@akashjs/runtime';

const keyboard = useKeyboard();

keyboard.bind('mod+k', () => openSearch(), { description: 'Search' });
keyboard.bind('Escape', () => closePanel());
```

- [ ] Provide a keyboard shortcut help dialog using `keyboard.getBindings()`

### Color Contrast

- [ ] Text meets WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text)
- [ ] Do not rely on color alone to convey information -- add icons or text labels
- [ ] Test with a contrast checker tool

### Reduced Motion

- [ ] Respect `prefers-reduced-motion` in CSS transitions and animations
- [ ] Use the `<Transition>` component which can be disabled globally

```css
@media (prefers-reduced-motion: reduce) {
  .fade-enter-active,
  .fade-exit-active {
    transition: none;
  }
}
```

```ts
// Or detect programmatically
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

### Forms

- [ ] Every input has a visible `<label>` or `aria-label`
- [ ] Error messages are associated with inputs via `aria-describedby`
- [ ] Required fields are marked with `aria-required="true"`

```html
<label for="email">Email</label>
<input
  id="email"
  name="email"
  type="email"
  aria-required="true"
  aria-describedby="email-error"
  value={form.fields.email.value()}
  onInput={(e) => form.fields.email.value.set(e.currentTarget.value)}
  onBlur={() => form.fields.email.markTouched()}
/>
<Show when={form.fields.email.touched() && !form.fields.email.valid()}>
  <span id="email-error" role="alert" class="error">
    {form.fields.email.errors()[0]}
  </span>
</Show>
```

### ARIA Roles and Properties

- [ ] Use `role` attributes only when native semantics are insufficient
- [ ] Keep `aria-live` regions present in the DOM before content changes
- [ ] Use `aria-expanded`, `aria-haspopup`, and `aria-controls` for dropdowns

```html
<button
  aria-expanded={open()}
  aria-haspopup="true"
  aria-controls="dropdown-menu"
  onClick={() => open.update(v => !v)}
>
  Menu
</button>
<Show when={open()}>
  <ul id="dropdown-menu" role="menu">
    <li role="menuitem"><button>Profile</button></li>
    <li role="menuitem"><button>Settings</button></li>
  </ul>
</Show>
```

## Testing Accessibility

- Use `getByRole()` in tests -- if you cannot find an element by role, it is likely missing semantics.
- Run `axe-core` in integration tests to catch common violations.
- Test with keyboard-only navigation.
- Test with a screen reader (VoiceOver on macOS, NVDA on Windows).
