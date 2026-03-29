/**
 * Route data loader utilities.
 *
 * Loaders are async functions that fetch data before a route renders.
 * Data is available via useLoaderData() in the page component.
 */

import type { RouteLoader, LoaderContext } from './types.js';

/**
 * Define a typed route loader.
 * This is a passthrough helper for better TypeScript inference.
 *
 * ```ts
 * export const loader = defineLoader<{ slug: string }>(async ({ params, fetch }) => {
 *   const post = await fetch(`/api/posts/${params.slug}`).then(r => r.json());
 *   return { post };
 * });
 * ```
 */
export function defineLoader<P extends Record<string, string> = Record<string, string>>(
  loaderFn: RouteLoader<P>,
): RouteLoader<P> {
  return loaderFn;
}
