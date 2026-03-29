/**
 * SEO utilities.
 *
 * Structured data (JSON-LD), Open Graph helpers, and canonical URL management.
 * Works with useHead() for SSR-compatible head tag management.
 *
 * ```ts
 * useStructuredData({
 *   '@type': 'Article',
 *   headline: 'My Post',
 *   author: { '@type': 'Person', name: 'Alice' },
 * });
 * ```
 */

import { useHead } from './head.js';

// --- Types ---

export interface StructuredData {
  '@context'?: string;
  '@type': string;
  [key: string]: unknown;
}

export interface OpenGraphData {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  siteName?: string;
  locale?: string;
}

export interface TwitterCardData {
  card?: 'summary' | 'summary_large_image' | 'player' | 'app';
  title: string;
  description?: string;
  image?: string;
  site?: string;
  creator?: string;
}

export interface SEOConfig {
  title: string;
  description?: string;
  canonical?: string;
  robots?: string;
  openGraph?: OpenGraphData;
  twitter?: TwitterCardData;
  structuredData?: StructuredData | StructuredData[];
}

// --- useStructuredData ---

/**
 * Inject JSON-LD structured data into the document head.
 * Data is automatically wrapped with @context.
 *
 * ```ts
 * useStructuredData({
 *   '@type': 'WebSite',
 *   name: 'AkashJS',
 *   url: 'https://akashjs.dev',
 * });
 * ```
 */
export function useStructuredData(data: StructuredData | StructuredData[]): void {
  const items = Array.isArray(data) ? data : [data];

  for (const item of items) {
    const ld = { '@context': 'https://schema.org', ...item };
    useHead({
      script: [
        { type: 'application/ld+json', innerHTML: JSON.stringify(ld) },
      ],
    });
  }
}

// --- useOpenGraph ---

/**
 * Set Open Graph meta tags.
 *
 * ```ts
 * useOpenGraph({
 *   title: 'My Page',
 *   description: 'Page description',
 *   image: '/og-image.jpg',
 *   type: 'article',
 * });
 * ```
 */
export function useOpenGraph(data: OpenGraphData): void {
  const meta: Array<{ property: string; content: string }> = [
    { property: 'og:title', content: data.title },
  ];

  if (data.description) meta.push({ property: 'og:description', content: data.description });
  if (data.image) meta.push({ property: 'og:image', content: data.image });
  if (data.url) meta.push({ property: 'og:url', content: data.url });
  if (data.type) meta.push({ property: 'og:type', content: data.type });
  if (data.siteName) meta.push({ property: 'og:site_name', content: data.siteName });
  if (data.locale) meta.push({ property: 'og:locale', content: data.locale });

  useHead({ meta });
}

// --- useTwitterCard ---

/**
 * Set Twitter Card meta tags.
 *
 * ```ts
 * useTwitterCard({
 *   card: 'summary_large_image',
 *   title: 'My Page',
 *   image: '/twitter-card.jpg',
 * });
 * ```
 */
export function useTwitterCard(data: TwitterCardData): void {
  const meta: Array<{ name: string; content: string }> = [
    { name: 'twitter:title', content: data.title },
  ];

  if (data.card) meta.push({ name: 'twitter:card', content: data.card });
  if (data.description) meta.push({ name: 'twitter:description', content: data.description });
  if (data.image) meta.push({ name: 'twitter:image', content: data.image });
  if (data.site) meta.push({ name: 'twitter:site', content: data.site });
  if (data.creator) meta.push({ name: 'twitter:creator', content: data.creator });

  useHead({ meta });
}

// --- useSEO (all-in-one) ---

/**
 * Set all SEO-related head tags at once.
 *
 * ```ts
 * useSEO({
 *   title: 'My Page | MySite',
 *   description: 'Page description',
 *   canonical: 'https://mysite.com/page',
 *   openGraph: { title: 'My Page', image: '/og.jpg' },
 *   twitter: { card: 'summary_large_image', title: 'My Page' },
 *   structuredData: { '@type': 'WebPage', name: 'My Page' },
 * });
 * ```
 */
export function useSEO(config: SEOConfig): void {
  const meta: Array<{ name?: string; property?: string; content: string }> = [];

  if (config.description) {
    meta.push({ name: 'description', content: config.description });
  }
  if (config.robots) {
    meta.push({ name: 'robots', content: config.robots });
  }

  const link: Array<{ rel: string; href: string }> = [];
  if (config.canonical) {
    link.push({ rel: 'canonical', href: config.canonical });
  }

  useHead({ title: config.title, meta, link });

  if (config.openGraph) useOpenGraph(config.openGraph);
  if (config.twitter) useTwitterCard(config.twitter);
  if (config.structuredData) useStructuredData(config.structuredData);
}

// --- Sitemap generation (for CLI/build) ---

export interface SitemapEntry {
  url: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

/**
 * Generate a sitemap.xml string from route entries.
 *
 * ```ts
 * const xml = generateSitemap('https://mysite.com', [
 *   { url: '/', priority: 1.0 },
 *   { url: '/about', changefreq: 'monthly' },
 *   { url: '/blog/hello', lastmod: '2026-03-29' },
 * ]);
 * ```
 */
export function generateSitemap(baseUrl: string, entries: SitemapEntry[]): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const entry of entries) {
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}${entry.url}</loc>\n`;
    if (entry.lastmod) xml += `    <lastmod>${entry.lastmod}</lastmod>\n`;
    if (entry.changefreq) xml += `    <changefreq>${entry.changefreq}</changefreq>\n`;
    if (entry.priority != null) xml += `    <priority>${entry.priority}</priority>\n`;
    xml += '  </url>\n';
  }

  xml += '</urlset>\n';
  return xml;
}
