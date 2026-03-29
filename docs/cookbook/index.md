# Cookbook

Practical, copy-pasteable recipes for common problems. Each recipe is a standalone solution you can drop into your project and adapt.

## How to Use

1. Find the recipe that matches your problem
2. Copy the code into your project
3. Adjust names, URLs, and styles to fit your app

::: tip
Every recipe uses real AkashJS APIs. If something looks unfamiliar, check the [API Reference](/api/) for the full details.
:::

## Recipes

| Recipe | What You'll Build |
|--------|-------------------|
| [Authentication](/cookbook/auth) | Login flow, protected routes, token refresh, role-based access |
| [Dark Mode](/cookbook/dark-mode) | Theme toggle, system preference sync, CSS variables, transitions |
| [Infinite Scroll](/cookbook/infinite-scroll) | Sentinel-based loading, cursor pagination, error retry, scroll restore |
| [Modals](/cookbook/modals) | Portal-based modals, focus trap, stacked modals, animated enter/exit |
| [Data Fetching](/cookbook/data-fetching) | createResource, createAction, caching, optimistic updates, retry |
| [Advanced Forms](/cookbook/forms) | Multi-step wizard, dynamic fields, Zod schema, file inputs |
| [Real-Time Updates](/cookbook/realtime) | WebSocket chat, collaborative state, presence, reconnection |
| [File Upload](/cookbook/file-upload) | Drag-and-drop, progress tracking, chunked upload, image preview |
| [Drag and Drop](/cookbook/drag-drop) | Sortable lists, Kanban board, FLIP animations, drop zones |
| [Keyboard Shortcuts](/cookbook/keyboard) | Cmd+K search, scoped shortcuts, help dialog, vim navigation |

## Prerequisites

All recipes assume you have an AkashJS project set up:

```bash
npx @akashjs/cli new my-app
cd my-app
npm run dev
```

::: info
Recipes show the essential code. Production apps should add error handling, loading states, and accessibility attributes beyond what is shown here.
:::
