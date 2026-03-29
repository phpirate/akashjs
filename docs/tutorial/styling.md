# Step 8: Styling

In this step, you will add dark mode with `useTheme`, use `cx()` for conditional class names, set up design tokens with CSS variables, add responsive layout, and animate todo additions and removals with transitions.

## Set Up Design Tokens

Design tokens are CSS variables that define your visual language. Create `src/styles.css` (or replace the existing one):

```css
:root {
  /* Colors */
  --bg: #ffffff;
  --surface: #f7fafc;
  --surface-hover: #edf2f7;
  --text: #1a202c;
  --text-secondary: #4a5568;
  --muted: #a0aec0;
  --border: #e2e8f0;
  --primary: #3182ce;
  --primary-hover: #2b6cb0;
  --danger: #e53e3e;
  --success: #38a169;

  /* Spacing */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;

  /* Radii */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);

  /* Typography */
  --font-sans: system-ui, -apple-system, sans-serif;
  --font-mono: 'SF Mono', Menlo, monospace;
}

/* Dark theme overrides */
[data-theme="dark"] {
  --bg: #1a202c;
  --surface: #2d3748;
  --surface-hover: #4a5568;
  --text: #f7fafc;
  --text-secondary: #cbd5e0;
  --muted: #718096;
  --border: #4a5568;
  --primary: #63b3ed;
  --primary-hover: #4299e1;
  --danger: #fc8181;
  --success: #68d391;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.3);
}

/* Base reset */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-sans);
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  transition: background-color 0.3s, color 0.3s;
}

/* Transition styles for todo items */
.todo-enter-active,
.todo-exit-active {
  transition: all 0.3s ease;
}

.todo-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.todo-exit-to {
  opacity: 0;
  transform: translateX(20px);
}
```

::: tip Design Tokens
Using CSS custom properties as design tokens means every component automatically respects the theme without importing anything. The dark theme override changes the variables at the root level, and all components update instantly.
:::

## Add Dark Mode with `useTheme`

Update `src/components/App.akash` to include a theme toggle:

```html
<script>
  import { RouterOutlet, Link, useRoute } from '@akashjs/router';
  import { useTheme } from '@akashjs/runtime';
  import { cx } from '@akashjs/runtime';

  const route = useRoute();

  const theme = useTheme({
    themes: {
      light: {
        '--bg': '#ffffff',
        '--surface': '#f7fafc',
        '--text': '#1a202c',
      },
      dark: {
        '--bg': '#1a202c',
        '--surface': '#2d3748',
        '--text': '#f7fafc',
      },
    },
  });
</script>

<template>
  <div class="app">
    <header class="header">
      <h1 class="title">AkashJS Todos</h1>
      <button class="theme-toggle" on:click={() => theme.toggle()}>
        {theme.isDark() ? 'Light Mode' : 'Dark Mode'}
      </button>
    </header>

    <nav class="nav">
      <Link
        to="/"
        class={cx('nav-link', { active: route.path() === '/' })}
      >
        All
      </Link>
      <Link
        to="/active"
        class={cx('nav-link', { active: route.path() === '/active' })}
      >
        Active
      </Link>
      <Link
        to="/completed"
        class={cx('nav-link', { active: route.path() === '/completed' })}
      >
        Completed
      </Link>
    </nav>

    <main class="content">
      <RouterOutlet />
    </main>

    <footer class="footer">
      <p>Built with AkashJS</p>
    </footer>
  </div>
</template>

<style scoped>
  .app {
    max-width: 640px;
    margin: 0 auto;
    padding: var(--space-xl);
    min-height: 100vh;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-lg);
  }

  .title {
    font-size: 1.5rem;
    font-weight: 700;
  }

  .theme-toggle {
    padding: var(--space-sm) var(--space-md);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    color: var(--text);
    cursor: pointer;
    font-size: 0.875rem;
    transition: background-color 0.15s;
  }

  .theme-toggle:hover {
    background: var(--surface-hover);
  }

  .nav {
    display: flex;
    gap: var(--space-sm);
    margin-bottom: var(--space-lg);
  }

  .nav-link {
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-md);
    text-decoration: none;
    color: var(--text);
    background: var(--surface);
    font-size: 0.875rem;
    font-weight: 500;
    transition: background-color 0.15s;
  }

  .nav-link:hover {
    background: var(--surface-hover);
  }

  .nav-link.active {
    background: var(--primary);
    color: white;
  }

  .content {
    min-height: 300px;
  }

  .footer {
    margin-top: var(--space-xl);
    padding-top: var(--space-md);
    border-top: 1px solid var(--border);
    text-align: center;
    font-size: 0.8rem;
    color: var(--muted);
  }
</style>
```

### How `useTheme` Works

```ts
const theme = useTheme({
  themes: { light: { ... }, dark: { ... } },
});

theme.current();  // 'light' or 'dark' (reactive signal)
theme.isDark();   // boolean (computed)
theme.toggle();   // Switch between light and dark
theme.set('dark');// Set explicitly
theme.setSystem();// Follow system preference
```

`useTheme` does three things:

1. Sets a `data-theme` attribute on `<html>` -- your CSS `[data-theme="dark"]` rules activate
2. Applies CSS variables from the theme config directly to `<html>`
3. Persists the choice to localStorage and syncs with the system preference

## Conditional Classes with `cx()`

The `cx()` utility merges class names conditionally:

```ts
import { cx } from '@akashjs/runtime';

// Strings
cx('btn', 'btn-primary');  // 'btn btn-primary'

// Conditional strings
cx('btn', isActive && 'btn-active');  // 'btn btn-active' or 'btn'

// Object syntax
cx('btn', { 'btn-active': isActive, 'btn-lg': isLarge });

// Mixed
cx('btn', isActive && 'active', { disabled: !isEnabled });

// Falsy values are filtered
cx('card', null, undefined, false, 'card-primary');  // 'card card-primary'
```

In the App component above, we use it for the active navigation link:

```html
<Link class={cx('nav-link', { active: route.path() === '/' })}>
```

This is cleaner than the ternary we used in the previous step.

## Add Transitions for Todo Items

Update `src/components/TodoList.akash` to use the `<Transition>` component:

```html
<script>
  import type { Todo } from '../types';
  import TodoItem from './TodoItem.akash';
  import { Transition } from '@akashjs/runtime';

  export let todos: Todo[];
  export let onToggle: (id: string) => void;
  export let onDelete: (id: string) => void;
  export let onEdit: (id: string, text: string) => void;
</script>

<template>
  <div class="todo-list">
    {#if todos.length === 0}
      <div class="empty-state">
        <p>No todos here.</p>
      </div>
    {:else}
      {#each todos as todo (todo.id)}
        <div class="todo-wrapper">
          <TodoItem
            todo={todo}
            onToggle={onToggle}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        </div>
      {/each}
    {/if}
  </div>
</template>

<style scoped>
  .todo-list {
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
  }

  .empty-state {
    padding: var(--space-xl);
    text-align: center;
    color: var(--muted);
  }

  .todo-wrapper {
    animation: slideIn 0.3s ease;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
```

The `@keyframes slideIn` animation runs when a new todo is added to the list. The `{#each}` block with a key expression ensures that new items get fresh DOM nodes, triggering the CSS animation.

## Responsive Layout

Add responsive behavior with a media query in `App.akash`:

```css
/* Add to the <style scoped> block in App.akash */
@media (max-width: 480px) {
  .app {
    padding: var(--space-md);
  }

  .nav {
    flex-wrap: wrap;
  }

  .nav-link {
    flex: 1;
    text-align: center;
  }

  .header {
    flex-direction: column;
    gap: var(--space-sm);
    align-items: flex-start;
  }
}
```

::: tip About AkashJS and CSS
AkashJS does not enforce a CSS methodology. You can use:
- **Scoped styles** (the default in `.akash` files)
- **CSS Modules** (import `styles from './foo.module.css'`)
- **Tailwind CSS** (works out of the box with the Vite plugin)
- **CSS-in-JS** (use the `css()` utility for dynamic inline styles)

The design token approach shown here works well with scoped styles and keeps everything in plain CSS.
:::

## Try It

Test the styling features:

1. Click the theme toggle and watch the entire app switch between light and dark
2. Refresh the page -- your theme preference persists
3. Change your system's color scheme (macOS: System Preferences > Appearance) and see if the app follows
4. Add a few todos and notice the slide-in animation
5. Resize the browser window to a narrow width and check the responsive layout

## Summary

You now know how to:

- Define design tokens as CSS custom properties
- Add dark mode with `useTheme()` (toggle, persist, system sync)
- Use `cx()` for clean conditional class merging
- Apply CSS animations to list items
- Build responsive layouts with media queries

The app looks polished. Let's make sure it works correctly with tests.

---

**What's Next:** [Testing](./testing.md) -- write tests for components, the store, and form validation.
