# Routing

`@akashjs/router` provides file-based routing with guards, data loaders, and nested layouts.

## Setup

```sh
npx @akashjs/cli new my-app --router
```

Or add to an existing project:

```sh
npm install @akashjs/router
```

## File-Based Routes

Routes are defined by the directory structure under `src/routes/`:

```
src/routes/
├── page.akash              → /
├── about/
│   └── page.akash          → /about
├── blog/
│   ├── page.akash          → /blog
│   └── [slug]/
│       └── page.akash      → /blog/:slug
├── dashboard/
│   ├── layout.akash        → Layout wrapper
│   ├── page.akash          → /dashboard
│   └── settings/
│       └── page.akash      → /dashboard/settings
└── [...catchAll]/
     └── page.akash          → /* (404)
```

**Conventions:**
- `page.akash` — Page component
- `layout.akash` — Wraps child routes
- `loader.ts` — Data loader (runs before rendering)
- `guard.ts` — Route guard (runs before loader)
- `[param]` — Dynamic parameter
- `[...rest]` — Catch-all (requires at least one segment)
- `[[...rest]]` — Optional catch-all (also matches `/`)

## Navigation

```ts
import { useNavigate, useRoute, useParams } from '@akashjs/router';

// Imperative
const navigate = useNavigate();
navigate('/about');
navigate('/blog/:slug', { params: { slug: 'hello' } });
navigate(-1); // back

// Reactive route info
const route = useRoute();
route.path();    // '/blog/hello'
route.params();  // { slug: 'hello' }
route.query();   // { page: '1' }
```

## Link Component

```html
<script lang="ts">
import { Link } from '@akashjs/router';
</script>

<template>
  <nav>
    <Link to="/">Home</Link>
    <Link to="/blog/:slug" params={{ slug: 'hello' }}>Read Post</Link>
  </nav>
</template>
```

`<Link>` renders an `<a>` tag and intercepts clicks for client-side navigation. Modifier keys (Ctrl/Cmd+click) still open in a new tab.

## Route Guards

```ts
// routes/dashboard/guard.ts
import type { RouteGuard } from '@akashjs/router';

export const guard: RouteGuard = async ({ params, redirect }) => {
  const user = await getCurrentUser();
  if (!user) return redirect('/login');
  // void = allow
};
```

Guard helpers:

```ts
import { guardWith, composeGuards } from '@akashjs/router';

const authGuard = guardWith(
  async () => !!(await getCurrentUser()),
  '/login',
);
```

## Data Loaders

```ts
// routes/blog/[slug]/loader.ts
import type { RouteLoader } from '@akashjs/router';

export const loader: RouteLoader<{ slug: string }> = async ({ params, fetch }) => {
  return fetch(`/api/posts/${params.slug}`).then(r => r.json());
};
```

Access loader data in the page:

```html
<script lang="ts">
import { useLoaderData } from '@akashjs/router';

const data = useLoaderData<{ title: string; content: string }>();
</script>

<template>
  <article>
    <h1>{data()?.title}</h1>
  </article>
</template>
```

## Nested Routes (Programmatic)

When defining routes programmatically, children can use relative paths:

```ts
const routes = [
  { path: '/blog', component: () => import('./Blog.akash'), children: [
    { path: ':slug', component: () => import('./BlogPost.akash') },
  ]},
  { path: '/users', component: () => import('./Users.akash'), children: [
    { path: 'admin', component: () => import('./Admin.akash') },
    { path: ':id', component: () => import('./UserProfile.akash') },
  ]},
];
```

- `/blog/hello` matches `/blog` > `:slug` with `{ slug: 'hello' }`
- `/users/admin` matches `/users` > `admin` (static wins over `:id`)
- `/users/42` matches `/users` > `:id` with `{ id: '42' }`

### Route Specificity

Routes are matched by specificity, not declaration order:

1. **Static** segments (`admin`, `settings`) — highest priority
2. **Dynamic** params (`:id`, `:slug`) — medium priority
3. **Catch-all** (`[...rest]`) — lowest priority

This means you can declare routes in any order and static routes will always match first.

## Nested Layouts

`layout.akash` files wrap child routes using `<Outlet />`:

```html
<script lang="ts">
import { Outlet } from '@akashjs/router';
</script>

<template>
  <div class="dashboard">
    <Sidebar />
    <main><Outlet /></main>
  </div>
</template>
```

## Middleware

Middleware are app-level hooks that run on every navigation. They are useful for auth checks, analytics, logging, and other cross-cutting concerns. Unlike guards (which are per-route), middleware runs globally.

```ts
import { defineMiddleware } from '@akashjs/router';

const authMiddleware = defineMiddleware(async ({ to, from, redirect }) => {
  if (to.startsWith('/dashboard') && !isLoggedIn()) {
    return redirect('/login');
  }
});

const analyticsMiddleware = defineMiddleware(({ to, from }) => {
  analytics.track('page_view', { path: to });
});
```

Register middleware using `runMiddleware()` in your app's navigation setup, or compose them into a single guard:

```ts
import { createRouter, composeMiddleware, runMiddleware } from '@akashjs/router';

const router = createRouter(routes);

// Or compose into a guard for specific routes:
const appMiddleware = composeMiddleware(authMiddleware, analyticsMiddleware);
```

### Middleware Context

The callback receives a `MiddlewareContext`:

| Property | Type | Description |
|---|---|---|
| `to` | `string` | Path being navigated to |
| `from` | `string` | Path being navigated from |
| `params` | `Record<string, string>` | Route params for the target route |
| `redirect` | `(path: string) => NavigationResult` | Redirect and abort navigation |

Return `void` (or nothing) to allow navigation. Return `redirect('/path')` to abort and redirect.

### Composing Middleware

Combine multiple middleware into one with `composeMiddleware()`:

```ts
import { composeMiddleware, runMiddleware } from '@akashjs/router';

const combined = composeMiddleware(authMiddleware, analyticsMiddleware);
```

You can also run middleware manually with `runMiddleware(middlewares, ctx)`.
