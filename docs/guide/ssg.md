# SSG / Prerendering

AkashJS can pre-render pages to static HTML at build time. This gives you instant load times, full SEO support, and optional hydration for interactivity.

## prerender()

The main API takes a list of routes and a render function, and produces static HTML files:

```ts
import { prerender } from '@akashjs/runtime';

const result = await prerender({
  routes: ['/', '/about', '/blog/hello'],
  render: (url) => renderToString(App, { url }),
  outDir: 'dist',
});

console.log(`Rendered ${result.rendered.length} pages in ${result.duration}ms`);
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `routes` | `string[] \| () => Promise<string[]>` | -- | Routes to prerender (static array or async function) |
| `render` | `(url: string) => Promise<string> \| string` | -- | Function that returns HTML for a given URL |
| `outDir` | `string` | `'dist'` | Output directory |
| `template` | `string` | built-in HTML | HTML template with `{{content}}` placeholder |
| `onPage` | `(url, html) => void` | -- | Callback after each page renders |
| `onError` | `(url, error) => void` | -- | Callback on render failure |
| `concurrency` | `number` | `5` | How many pages to render in parallel |

### Result

The returned `PrerenderResult` contains:

```ts
interface PrerenderResult {
  rendered: Array<{ url: string; file: string; size: number }>;
  errors: Array<{ url: string; error: string }>;
  duration: number;  // total time in ms
}
```

## HTML Template

Provide a custom HTML shell with `{{content}}`, `{{head}}`, and `{{scripts}}` placeholders:

```ts
await prerender({
  routes: ['/'],
  render: (url) => renderToString(App, { url }),
  template: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  {{head}}
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div id="app">{{content}}</div>
  {{scripts}}
  <script type="module" src="/main.js"></script>
</body>
</html>`,
});
```

The `{{content}}` placeholder is replaced with the rendered HTML for each route.

## Route Discovery

### discoverStaticRoutes()

Automatically find all static (non-parameterized) routes from your route manifest:

```ts
import { discoverStaticRoutes } from '@akashjs/runtime';

const manifest = [
  { path: '/' },
  { path: '/about' },
  { path: '/blog/:slug' },    // skipped (parameterized)
  { path: '/users/:id' },     // skipped
  { path: '/contact' },
];

const routes = discoverStaticRoutes(manifest);
// ['/', '/about', '/contact']
```

Routes containing `:` (params) or `*` (wildcards) are excluded.

### generatePaths()

For dynamic routes, generate all concrete paths by providing parameter values:

```ts
import { generatePaths } from '@akashjs/runtime';

const blogPaths = generatePaths('/blog/:slug', [
  { slug: 'hello-world' },
  { slug: 'getting-started' },
  { slug: 'advanced-patterns' },
]);
// ['/blog/hello-world', '/blog/getting-started', '/blog/advanced-patterns']
```

Combine both for a full route list:

```ts
const staticRoutes = discoverStaticRoutes(manifest);
const blogRoutes = generatePaths('/blog/:slug', await fetchBlogSlugs());

await prerender({
  routes: [...staticRoutes, ...blogRoutes],
  render: (url) => renderToString(App, { url }),
});
```

## Concurrency Control

The `concurrency` option limits how many pages render in parallel. Increase it for faster builds on machines with many cores; decrease it if rendering is memory-intensive:

```ts
await prerender({
  routes: allRoutes,
  render: renderPage,
  concurrency: 10,  // render 10 pages at a time
});
```

## Sitemap Generation

Generate a sitemap XML from prerender results:

```ts
import { sitemapFromResults } from '@akashjs/runtime';

const result = await prerender({ ... });

const sitemap = sitemapFromResults('https://example.com', result);
// Write sitemap to dist/sitemap.xml
```

The output follows the standard sitemap protocol:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2026-03-29</lastmod>
  </url>
  <url>
    <loc>https://example.com/about</loc>
    <lastmod>2026-03-29</lastmod>
  </url>
</urlset>
```

## urlToFilePath()

The mapping from URL to output file follows this convention:

```ts
import { urlToFilePath } from '@akashjs/runtime';

urlToFilePath('/');            // 'index.html'
urlToFilePath('/about');       // 'about/index.html'
urlToFilePath('/blog/hello');  // 'blog/hello/index.html'
```

Each route becomes a directory with an `index.html` file, which works with any static file server.
