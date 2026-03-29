# Project Structure

A consistent folder structure makes codebases navigable. These are recommended layouts, not enforced rules -- adapt them to your team.

## Small App (up to 10 routes)

The CLI default is a good starting point:

```
my-app/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
└── src/
    ├── main.ts
    ├── App.akash
    ├── components/
    │   ├── Header.akash
    │   ├── Footer.akash
    │   └── Button.akash
    ├── stores/
    │   ├── auth.ts
    │   └── cart.ts
    ├── utils/
    │   └── format.ts
    └── routes/
        ├── page.akash
        ├── about/
        │   └── page.akash
        └── login/
            └── page.akash
```

::: tip Keep it flat
For small apps, avoid deeply nested folders. A flat `components/` directory is easier to navigate than `components/ui/atoms/buttons/PrimaryButton.akash`.
:::

## Medium App (10-50 routes)

Group by feature, not by type:

```
src/
├── main.ts
├── App.akash
├── shared/
│   ├── components/
│   │   ├── Button.akash
│   │   ├── Modal.akash
│   │   └── Spinner.akash
│   ├── stores/
│   │   └── auth.ts
│   ├── utils/
│   │   ├── format.ts
│   │   └── validate.ts
│   └── composables/
│       ├── useDebounce.ts
│       └── useMediaQuery.ts
├── features/
│   ├── dashboard/
│   │   ├── Dashboard.akash
│   │   ├── DashboardStats.akash
│   │   ├── dashboard.store.ts
│   │   └── dashboard.test.ts
│   ├── blog/
│   │   ├── BlogList.akash
│   │   ├── BlogPost.akash
│   │   ├── blog.store.ts
│   │   └── blog.test.ts
│   └── settings/
│       ├── Settings.akash
│       └── settings.store.ts
└── routes/
    ├── page.akash
    ├── dashboard/
    │   ├── page.akash
    │   ├── layout.akash
    │   └── guard.ts
    └── blog/
        ├── page.akash
        └── [slug]/
            └── page.akash
```

::: tip Feature folders
Each feature folder contains everything it needs: components, stores, tests, and types. When you delete a feature folder, nothing else breaks.
:::

## Large App (50+ routes, multiple teams)

Use a monorepo with shared packages:

```
akash-app/
├── pnpm-workspace.yaml
├── packages/
│   ├── ui/                    # Shared UI components
│   │   ├── src/
│   │   │   ├── Button.akash
│   │   │   ├── Modal.akash
│   │   │   └── index.ts
│   │   └── package.json
│   ├── shared/                # Shared utilities, types, stores
│   │   ├── src/
│   │   │   ├── stores/
│   │   │   ├── utils/
│   │   │   └── types/
│   │   └── package.json
│   └── config/                # Shared tsconfig, vite config, etc.
│       ├── tsconfig.base.json
│       └── package.json
├── apps/
│   ├── web/                   # Main web app
│   │   ├── src/
│   │   ├── vite.config.ts
│   │   └── package.json
│   └── admin/                 # Admin panel
│       ├── src/
│       ├── vite.config.ts
│       └── package.json
```

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

## File Naming Conventions

| Type | Convention | Example |
|---|---|---|
| Components | PascalCase `.akash` | `UserProfile.akash` |
| Stores | camelCase with `.store.ts` | `auth.store.ts` |
| Composables | camelCase with `use` prefix | `useDebounce.ts` |
| Utils | camelCase `.ts` | `formatDate.ts` |
| Tests | Same name + `.test.ts` | `UserProfile.test.ts` |
| Route pages | `page.akash` | `routes/blog/page.akash` |
| Route layouts | `layout.akash` | `routes/dashboard/layout.akash` |
| Route guards | `guard.ts` | `routes/dashboard/guard.ts` |
| Route loaders | `loader.ts` | `routes/blog/[slug]/loader.ts` |

## Barrel Exports vs Direct Imports

::: warning Be careful with barrel exports
Barrel files (`index.ts` that re-exports everything) can hurt tree-shaking and slow down the dev server.
:::

```ts
// DON'T: barrel export everything from a large module
// shared/index.ts
export * from './components/Button.akash';
export * from './components/Modal.akash';
export * from './components/DataTable.akash';
// ... 50 more exports — Vite has to parse them all
```

```ts
// DO: import directly from the source
import Button from '@/shared/components/Button.akash';
import Modal from '@/shared/components/Modal.akash';
```

```ts
// OK: small barrel for a tightly related group
// shared/composables/index.ts
export { useDebounce } from './useDebounce';
export { useMediaQuery } from './useMediaQuery';
export { useStorage } from './useStorage';
```

::: tip When barrels are fine
Barrel exports work well for small, stable modules (e.g., a handful of composables or utility functions). Avoid them for large component libraries where only a few components are used per page.
:::

## Path Aliases

Set up `@/` as an alias for `src/` in your `tsconfig.json` and `vite.config.ts`:

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

```ts
// vite.config.ts
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
```

Then import with clean paths:

```ts
import Button from '@/shared/components/Button.akash';
import { useAuthStore } from '@/features/auth/auth.store';
```
