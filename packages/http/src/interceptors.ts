/**
 * Interceptor chain.
 *
 * Builds a middleware pipeline around fetch. Each interceptor receives
 * (request, next) and can transform the request, the response, or both.
 */

import type { HttpInterceptor, InterceptorNext } from './types.js';

/**
 * Compose an array of interceptors into a single fetch-like function.
 *
 * Interceptors execute in order for requests (first to last)
 * and in reverse for responses (last to first), like an onion.
 */
export function buildInterceptorChain(
  interceptors: HttpInterceptor[],
  baseFetch: typeof globalThis.fetch,
): InterceptorNext {
  // Start with the actual fetch as the innermost handler
  let chain: InterceptorNext = (request: Request) => baseFetch(request);

  // Wrap from inside out — last interceptor is closest to fetch
  for (let i = interceptors.length - 1; i >= 0; i--) {
    const interceptor = interceptors[i];
    const next = chain;
    chain = (request: Request) => interceptor(request, next);
  }

  return chain;
}
