# Step 10: Deployment

In this final step, you will build the todo app for production, check the bundle size, deploy it, and find next steps for continuing your AkashJS journey.

## Build for Production

Run the production build:

```bash
pnpm build
```

Vite compiles your `.akash` files, tree-shakes unused code, minifies JavaScript and CSS, and outputs everything to the `dist/` directory:

```
dist/
  index.html
  assets/
    index-[hash].js       # Main bundle
    index-[hash].css      # Extracted CSS
    ActiveTodos-[hash].js # Lazy-loaded chunk
    CompletedTodos-[hash].js
```

Notice that each lazy-loaded route gets its own chunk. Users only download the JavaScript for the page they visit.

## Check Bundle Size

AkashJS includes a built-in size analyzer. Run:

```bash
npx @akashjs/cli size
```

You should see output like:

```
Bundle Analysis
===============

  File                          Size      Gzip
  ────────────────────────────────────────────
  assets/index-abc123.js       12.4 kB   4.8 kB
  assets/index-abc123.css       2.1 kB   0.9 kB
  assets/ActiveTodos-def.js     0.8 kB   0.4 kB
  assets/CompletedTodos-ghi.js  0.8 kB   0.4 kB
  ────────────────────────────────────────────
  Total JS                     14.0 kB   5.6 kB
  Total CSS                     2.1 kB   0.9 kB

  Runtime overhead: ~4 kB gzipped
```

::: tip Why so small?
AkashJS compiles templates to direct DOM operations at build time. There is no virtual DOM diffing library, no template interpreter, and no zone.js. The runtime is just the signal system, scheduler, and a few DOM helpers.
:::

## Preview Locally

Before deploying, preview the production build locally:

```bash
pnpm preview
```

This starts a local static server serving the `dist/` directory. Open the URL it prints and verify everything works correctly -- routing, form submission, theme toggle, and data persistence.

## Deploy

### Option 1: AkashJS Deploy

If you are using AkashJS's hosting service:

```bash
npx @akashjs/cli deploy
```

This uploads your `dist/` directory and gives you a URL:

```
Deploying todo-app...
Uploaded 5 files (18.2 kB)

Your app is live at:
  https://todo-app.akash.dev
```

### Option 2: Vercel

```bash
npx vercel
```

Vercel auto-detects Vite projects and configures everything. For SPA routing, add a `vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Option 3: Netlify

Create a `netlify.toml`:

```toml
[build]
  command = "pnpm build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Then:

```bash
npx netlify deploy --prod
```

### Option 4: Static Hosting

The `dist/` directory is a static site. You can host it anywhere that serves static files -- GitHub Pages, Cloudflare Pages, AWS S3, or your own nginx server.

::: warning SPA Routing Fallback
Since the app uses client-side routing, your server must return `index.html` for all routes (not just `/`). Otherwise, navigating directly to `/active` will return a 404. The redirect/rewrite rules above handle this.
:::

## Production Checklist

Before shipping to real users, review this checklist:

- [ ] **Build succeeds** with no TypeScript errors (`pnpm build`)
- [ ] **Tests pass** (`pnpm test`)
- [ ] **Bundle size is reasonable** (`npx @akashjs/cli size`)
- [ ] **Routing works** -- direct navigation to `/active` loads correctly
- [ ] **Theme persists** -- refresh the page after switching to dark mode
- [ ] **Forms validate** -- try submitting empty and invalid input
- [ ] **Mobile layout works** -- test at 375px width

## What You Built

Congratulations! You built a complete todo application with:

| Feature | AkashJS API |
|---------|-------------|
| Components | `.akash` SFCs with `<script>`, `<template>`, `<style scoped>` |
| Reactivity | `signal()`, `computed()`, `effect()` |
| Routing | `createRouter`, `<Link>`, `useRoute()` |
| Forms | `defineForm()`, `required()`, `minLength()` |
| Data fetching | `createHttpClient`, `createResource`, `createAction` |
| State management | `defineStore()`, `$reset()`, `$snapshot()` |
| Theming | `useTheme()`, `cx()`, CSS custom properties |
| Testing | `mount()`, `fireEvent`, Vitest |
| Deployment | `vite build`, `@akashjs/cli deploy` |

All of this in under 15 kB gzipped.

::: info You did it
You went from zero to a production-ready app. Every concept you learned here -- signals, stores, forms, routing -- is the same API you will use to build real-world applications.
:::

## Next Steps

Now that you have the fundamentals, explore these resources:

### Guides

Deeper dives into each topic:

- [Components Guide](/guide/components) -- slots, lifecycle hooks, context/DI, error boundaries
- [Reactivity Guide](/guide/reactivity) -- `batch()`, `untrack()`, deep signals, `watch()`
- [Routing Guide](/guide/routing) -- guards, loaders, nested layouts, route transitions
- [Forms Guide](/guide/forms) -- Zod integration, form groups, dynamic fields
- [HTTP Guide](/guide/http) -- interceptors, auth, pagination, WebSocket
- [State Management Guide](/guide/state-management) -- store composition, devtools integration

### Cookbook

Practical recipes for common patterns:

- [Authentication Flow](/cookbook) -- login, protected routes, token refresh
- [Infinite Scroll](/cookbook) -- paginated data loading
- [Real-time Updates](/cookbook) -- WebSocket integration
- [i18n](/guide/i18n) -- internationalization with lazy-loaded translations

### API Reference

Full documentation for every function and type:

- [Runtime API](/api) -- signals, components, DOM, context
- [Router API](/api) -- routes, guards, loaders
- [Forms API](/api) -- fields, validators, schemas
- [HTTP API](/api) -- client, resource, action

### Community

- [GitHub](https://github.com/AkashJS/akash) -- source code, issues, discussions
- [Discord](https://discord.gg/akashjs) -- chat with the community

## Try It

Before you move on, try extending the todo app on your own:

1. Add a **due date** field to todos with a date picker
2. Add **drag-and-drop reordering** of todo items
3. Add a **search bar** that filters todos by text
4. Connect to a real backend API instead of the mock server
5. Add **E2E tests** with Playwright

Each of these exercises reinforces what you learned and pushes you to explore the framework further.

---

Thank you for completing the AkashJS tutorial. Happy building!
