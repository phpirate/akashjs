# SEO

AkashJS provides composables for managing meta tags, structured data, Open Graph, Twitter Cards, and sitemap generation. All SEO utilities are reactive — update a signal and the corresponding `<head>` tags update automatically.

## useSEO()

`useSEO()` is the all-in-one composable for managing page-level SEO. It handles title, description, canonical URL, robots directives, Open Graph, Twitter Cards, and structured data in a single call.

```ts
import { useSEO } from '@akashjs/runtime';

useSEO({
  title: 'My Blog Post',
  description: 'A deep dive into reactive frameworks.',
  canonical: 'https://example.com/blog/reactive-frameworks',
  robots: 'index, follow',
  openGraph: {
    type: 'article',
    title: 'My Blog Post',
    description: 'A deep dive into reactive frameworks.',
    image: 'https://example.com/og-image.jpg',
    url: 'https://example.com/blog/reactive-frameworks',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'My Blog Post',
    description: 'A deep dive into reactive frameworks.',
    image: 'https://example.com/og-image.jpg',
  },
  structuredData: {
    '@type': 'Article',
    headline: 'My Blog Post',
    author: { '@type': 'Person', name: 'Alice' },
    datePublished: '2026-03-15',
  },
});
```

This generates the following in `<head>`:

```html
<title>My Blog Post</title>
<meta name="description" content="A deep dive into reactive frameworks.">
<link rel="canonical" href="https://example.com/blog/reactive-frameworks">
<meta name="robots" content="index, follow">
<meta property="og:type" content="article">
<meta property="og:title" content="My Blog Post">
<!-- ...plus Twitter and JSON-LD tags -->
```

### Reactive Updates

Pass signals for dynamic pages:

```ts
const post = createResource(() => http.get(`/api/posts/${slug()}`));

useSEO(() => ({
  title: post()?.title ?? 'Loading...',
  description: post()?.excerpt,
  canonical: `https://example.com/blog/${slug()}`,
}));
```

Tags update automatically when the resource resolves or the route changes.

## useStructuredData()

`useStructuredData()` injects a `<script type="application/ld+json">` tag into the document head with JSON-LD structured data.

```ts
import { useStructuredData } from '@akashjs/runtime';

useStructuredData({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Acme Inc.',
  url: 'https://acme.com',
  logo: 'https://acme.com/logo.png',
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+1-555-0100',
    contactType: 'customer service',
  },
});
```

### Product Page Example

```ts
useStructuredData({
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: product().name,
  image: product().images,
  description: product().description,
  offers: {
    '@type': 'Offer',
    price: product().price,
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
  },
});
```

Multiple calls to `useStructuredData()` within the same page add separate JSON-LD blocks. Each is cleaned up when the component unmounts.

## useOpenGraph()

`useOpenGraph()` manages Open Graph meta tags for social sharing previews on Facebook, LinkedIn, and other platforms.

```ts
import { useOpenGraph } from '@akashjs/runtime';

useOpenGraph({
  type: 'website',
  title: 'Acme — Build Better Software',
  description: 'Tools for modern development teams.',
  image: 'https://acme.com/og.jpg',
  url: 'https://acme.com',
  siteName: 'Acme',
  locale: 'en_US',
});
```

Generated tags:

```html
<meta property="og:type" content="website">
<meta property="og:title" content="Acme — Build Better Software">
<meta property="og:description" content="Tools for modern development teams.">
<meta property="og:image" content="https://acme.com/og.jpg">
<meta property="og:url" content="https://acme.com">
<meta property="og:site_name" content="Acme">
<meta property="og:locale" content="en_US">
```

### Article Type

```ts
useOpenGraph({
  type: 'article',
  title: post().title,
  description: post().excerpt,
  image: post().coverImage,
  url: `https://example.com/blog/${post().slug}`,
  article: {
    publishedTime: post().publishedAt,
    modifiedTime: post().updatedAt,
    author: post().author.name,
    tags: post().tags,
  },
});
```

## useTwitterCard()

`useTwitterCard()` manages Twitter Card meta tags for link previews on X (Twitter).

```ts
import { useTwitterCard } from '@akashjs/runtime';

useTwitterCard({
  card: 'summary_large_image',
  title: 'Acme — Build Better Software',
  description: 'Tools for modern development teams.',
  image: 'https://acme.com/twitter-card.jpg',
  site: '@acme',
  creator: '@alice',
});
```

Generated tags:

```html
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Acme — Build Better Software">
<meta name="twitter:description" content="Tools for modern development teams.">
<meta name="twitter:image" content="https://acme.com/twitter-card.jpg">
<meta name="twitter:site" content="@acme">
<meta name="twitter:creator" content="@alice">
```

### Card Types

| Type | Description |
|---|---|
| `'summary'` | Small square image with title and description |
| `'summary_large_image'` | Large banner image above title and description |
| `'player'` | Embedded video/audio player |
| `'app'` | App install card with direct download links |

## generateSitemap()

`generateSitemap()` produces an XML sitemap string from an array of URL entries. Use it in a server route or build script to generate `sitemap.xml`.

```ts
import { generateSitemap } from '@akashjs/runtime';

const sitemap = generateSitemap({
  baseUrl: 'https://example.com',
  urls: [
    { path: '/', changefreq: 'daily', priority: 1.0 },
    { path: '/about', changefreq: 'monthly', priority: 0.8 },
    { path: '/blog', changefreq: 'weekly', priority: 0.9 },
  ],
});
```

Output:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://example.com/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://example.com/blog</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>
```

### Dynamic Sitemap from Database

```ts
// server/routes/sitemap.xml.ts
import { generateSitemap } from '@akashjs/runtime';

export async function GET() {
  const posts = await db.posts.findMany({ select: { slug: true, updatedAt: true } });

  const sitemap = generateSitemap({
    baseUrl: 'https://example.com',
    urls: [
      { path: '/', changefreq: 'daily', priority: 1.0 },
      { path: '/blog', changefreq: 'daily', priority: 0.9 },
      ...posts.map((post) => ({
        path: `/blog/${post.slug}`,
        lastmod: post.updatedAt.toISOString(),
        changefreq: 'weekly' as const,
        priority: 0.7,
      })),
    ],
  });

  return new Response(sitemap, {
    headers: { 'Content-Type': 'application/xml' },
  });
}
```

### URL Entry Options

| Property | Type | Description |
|---|---|---|
| `path` | `string` | URL path (appended to `baseUrl`) |
| `lastmod` | `string` | ISO 8601 date of last modification |
| `changefreq` | `'always' \| 'hourly' \| 'daily' \| 'weekly' \| 'monthly' \| 'yearly' \| 'never'` | How often the page changes |
| `priority` | `number` | Priority from 0.0 to 1.0 (default: 0.5) |
