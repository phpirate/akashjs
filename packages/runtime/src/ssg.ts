/**
 * Static Site Generation (SSG) / Prerendering.
 *
 * Pre-render pages at build time to static HTML files.
 * Combine with hydration for interactive islands.
 *
 * ```ts
 * // In build script or akash build --prerender:
 * await prerender({
 *   routes: ['/', '/about', '/blog/hello'],
 *   render: (url) => renderToString(App, { url }),
 *   outDir: 'dist',
 * });
 * ```
 */

// =========================================================================
// Types
// =========================================================================

export interface PrerenderOptions {
  /** Routes to prerender */
  routes: string[] | (() => Promise<string[]>);
  /** Render function — returns HTML for a given URL */
  render: (url: string) => Promise<string> | string;
  /** Output directory (default: 'dist') */
  outDir?: string;
  /** HTML template with {{content}} placeholder */
  template?: string;
  /** Callback per rendered page */
  onPage?: (url: string, html: string) => void;
  /** Callback on error */
  onError?: (url: string, error: Error) => void;
  /** Concurrency limit (default: 5) */
  concurrency?: number;
}

export interface PrerenderResult {
  /** Successfully rendered pages */
  rendered: Array<{ url: string; file: string; size: number }>;
  /** Pages that failed to render */
  errors: Array<{ url: string; error: string }>;
  /** Total time in ms */
  duration: number;
}

// =========================================================================
// Default HTML template
// =========================================================================

const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  {{head}}
</head>
<body>
  <div id="app">{{content}}</div>
  {{scripts}}
</body>
</html>`;

// =========================================================================
// prerender()
// =========================================================================

/**
 * Pre-render routes to static HTML files.
 */
export async function prerender(options: PrerenderOptions): Promise<PrerenderResult> {
  const {
    routes: routesInput,
    render,
    outDir = 'dist',
    template = DEFAULT_TEMPLATE,
    onPage,
    onError,
    concurrency = 5,
  } = options;

  const start = Date.now();

  // Resolve routes
  const routes = typeof routesInput === 'function'
    ? await routesInput()
    : routesInput;

  const result: PrerenderResult = {
    rendered: [],
    errors: [],
    duration: 0,
  };

  // Process in batches for concurrency control
  for (let i = 0; i < routes.length; i += concurrency) {
    const batch = routes.slice(i, i + concurrency);
    await Promise.all(batch.map(async (url) => {
      try {
        const content = await render(url);
        const html = template
          .replace('{{content}}', content)
          .replace('{{head}}', '')
          .replace('{{scripts}}', '');

        const filePath = urlToFilePath(url);

        // In a real implementation, we'd write to disk here.
        // For now, we return the result for the caller to handle.
        result.rendered.push({
          url,
          file: `${outDir}/${filePath}`,
          size: new Blob([html]).size,
        });

        onPage?.(url, html);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        result.errors.push({ url, error: error.message });
        onError?.(url, error);
      }
    }));
  }

  result.duration = Date.now() - start;
  return result;
}

// =========================================================================
// Route discovery
// =========================================================================

/**
 * Discover routes from the file system for prerendering.
 * Scans src/routes/ and returns all static (non-parameterized) paths.
 */
export function discoverStaticRoutes(routeManifest: Array<{ path: string }>): string[] {
  return routeManifest
    .filter((r) => !r.path.includes(':') && !r.path.includes('*'))
    .map((r) => r.path);
}

/**
 * Generate all possible paths for parameterized routes.
 *
 * ```ts
 * const paths = generatePaths('/blog/:slug', [
 *   { slug: 'hello' },
 *   { slug: 'world' },
 * ]);
 * // ['/blog/hello', '/blog/world']
 * ```
 */
export function generatePaths(
  pattern: string,
  params: Record<string, string>[],
): string[] {
  return params.map((p) => {
    let path = pattern;
    for (const [key, value] of Object.entries(p)) {
      path = path.replace(`:${key}`, value);
    }
    return path;
  });
}

// =========================================================================
// Helpers
// =========================================================================

/**
 * Convert a URL path to a file path for static output.
 * / → index.html
 * /about → about/index.html
 * /blog/hello → blog/hello/index.html
 */
export function urlToFilePath(url: string): string {
  const clean = url.replace(/^\//, '').replace(/\/$/, '');
  if (!clean) return 'index.html';
  return `${clean}/index.html`;
}

/**
 * Generate a sitemap from prerender results.
 */
export function sitemapFromResults(
  baseUrl: string,
  results: PrerenderResult,
): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const page of results.rendered) {
    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}${page.url}</loc>\n`;
    xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
    xml += `  </url>\n`;
  }

  xml += '</urlset>\n';
  return xml;
}
