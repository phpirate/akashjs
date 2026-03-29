# Security

Most frameworks leave security entirely to third-party libraries. AkashJS ships a built-in `@akashjs/security` module and a CLI audit command so that common vulnerabilities are covered out of the box — no extra dependencies, no configuration drift.

## Why Built-in Security Matters

- **Consistency** — Every AkashJS project gets the same hardened defaults.
- **Zero-dep** — No supply-chain risk from pulling in a dozen security packages.
- **Compile-time + runtime** — The `akash audit` CLI catches issues before they ship; runtime APIs catch them at execution time.

## XSS Prevention

### sanitize(html, options?)

Strip dangerous HTML and return a safe string. By default, only a curated set of tags and attributes survive.

```ts
import { sanitize } from '@akashjs/security';

const safe = sanitize(userInput);
```

#### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `allowTags` | `string[]` | Common safe tags (`p`, `b`, `i`, `a`, `ul`, `li`, etc.) | Tags to keep |
| `allowAttrs` | `string[]` | `['href', 'title', 'alt', 'src']` | Attributes to keep |
| `allowStyle` | `boolean` | `false` | Whether to keep inline `style` attributes |

```ts
// Allow a broader set for a rich-text editor
const safe = sanitize(html, {
  allowTags: ['p', 'h1', 'h2', 'h3', 'blockquote', 'code', 'pre', 'a', 'img'],
  allowAttrs: ['href', 'src', 'alt', 'class'],
  allowStyle: false,
});
```

::: danger Don't
Never insert raw user HTML into the DOM:
```ts
el.innerHTML = userInput; // XSS vulnerability
```
:::

::: tip Do
Always sanitize first:
```ts
el.innerHTML = sanitize(userInput);
```
Or use the auto-sanitizing helper below.
:::

### createSafeHTML(el)

Returns a setter function that automatically sanitizes any HTML before assigning it to `innerHTML`.

```ts
import { createSafeHTML } from '@akashjs/security';

const setHTML = createSafeHTML(myElement);
setHTML(userInput); // sanitized automatically
```

## Content Security Policy

### generateCSP(directives?)

Generate a Content-Security-Policy header value with a cryptographic nonce.

```ts
import { generateCSP } from '@akashjs/security';

const { header, nonce } = generateCSP({
  'script-src': ["'self'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'https:'],
});

// header = "script-src 'self' 'nonce-abc123'; style-src 'self' 'unsafe-inline'; img-src 'self' https:"
// nonce  = "abc123"
```

The nonce is automatically injected into the `script-src` directive. Pass it to your `<script>` tags to allow inline scripts without `'unsafe-inline'`.

::: warning
Always use nonces instead of `'unsafe-inline'` for scripts. AkashJS generates a fresh nonce per request automatically in SSR mode.
:::

## Security Headers

### generateSecurityHeaders(options?)

Returns a `Record<string, string>` of recommended security headers. Use this in your SSR server or middleware.

```ts
import { generateSecurityHeaders } from '@akashjs/security';

const headers = generateSecurityHeaders();
// {
//   'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
//   'X-Content-Type-Options': 'nosniff',
//   'X-Frame-Options': 'DENY',
//   'X-XSS-Protection': '0',
//   'Referrer-Policy': 'strict-origin-when-cross-origin',
//   'Cross-Origin-Embedder-Policy': 'require-corp',
//   'Cross-Origin-Opener-Policy': 'same-origin',
//   'Cross-Origin-Resource-Policy': 'same-origin',
//   'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
// }
```

| Header | Purpose |
|---|---|
| `Strict-Transport-Security` (HSTS) | Force HTTPS for all future requests |
| `X-Content-Type-Options` | Prevent MIME-type sniffing |
| `X-Frame-Options` | Block clickjacking via iframes |
| `X-XSS-Protection` | Disabled (`0`) — modern CSP is preferred |
| `Referrer-Policy` | Limit referrer leakage |
| `Cross-Origin-Embedder-Policy` (COEP) | Require CORS for cross-origin resources |
| `Cross-Origin-Opener-Policy` (COOP) | Isolate browsing context |
| `Cross-Origin-Resource-Policy` (CORP) | Restrict who can load your resources |
| `Permissions-Policy` | Disable sensitive browser APIs by default |

## CSRF Protection

### createCSRFInterceptor()

Creates an HTTP client interceptor that attaches a CSRF token to every mutating request (`POST`, `PUT`, `PATCH`, `DELETE`).

```ts
import { createCSRFInterceptor } from '@akashjs/security';
import { createHttpClient } from '@akashjs/http';

const http = createHttpClient({
  interceptors: [createCSRFInterceptor()],
});
```

The interceptor reads the token from a `<meta name="csrf-token">` tag or a cookie (configurable) and sends it in the `X-CSRF-Token` header.

::: tip
AkashJS SSR mode automatically injects the `<meta>` tag. For SPA-only setups, configure the interceptor to read from a cookie:
```ts
createCSRFInterceptor({ source: 'cookie', cookieName: 'XSRF-TOKEN' })
```
:::

## Prototype Pollution Prevention

### safeMerge(target, ...sources)

Deep-merge objects while blocking `__proto__`, `constructor`, and `prototype` keys.

```ts
import { safeMerge } from '@akashjs/security';

const config = safeMerge(defaults, userProvidedConfig);
```

::: danger Don't
Never use a naive recursive merge on user input:
```ts
function merge(target, source) {
  for (const key in source) {
    target[key] = source[key]; // prototype pollution
  }
}
```
:::

::: tip Do
Use `safeMerge` — it skips dangerous keys and only copies own enumerable properties:
```ts
const config = safeMerge({}, userInput);
```
:::

## Immutable Configuration

### deepFreeze(obj)

Recursively freeze an object so it cannot be mutated at runtime.

```ts
import { deepFreeze } from '@akashjs/security';

const config = deepFreeze({
  api: { baseUrl: 'https://api.example.com' },
  features: { darkMode: true },
});

config.api.baseUrl = 'https://evil.com'; // throws in strict mode, silently fails otherwise
```

## URL Sanitization

### sanitizeURL(url, options?)

Validate and sanitize a URL. Blocks `javascript:`, `data:`, and `vbscript:` schemes by default to prevent open redirects and script injection.

```ts
import { sanitizeURL } from '@akashjs/security';

const safeUrl = sanitizeURL(userProvidedUrl);
// Returns the URL if safe, or an empty string if blocked
```

::: warning
Always sanitize URLs before using them in `window.location.href`, `<a href>`, or `<img src>`:
```ts
window.location.href = sanitizeURL(redirectUrl);
```
:::

## Client-side Rate Limiting

### createRateLimiter(options)

Prevent abuse by limiting how often a function can be called.

```ts
import { createRateLimiter } from '@akashjs/security';

const limiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 60_000, // 10 requests per minute
});

async function handleSubmit() {
  if (!limiter.allow()) {
    showError('Too many requests. Please wait.');
    return;
  }
  await submitForm();
}
```

The limiter exposes:

| Method | Description |
|---|---|
| `allow()` | Returns `true` if under the limit, `false` otherwise |
| `remaining()` | Number of requests left in the current window |
| `reset()` | Manually reset the counter |

## Subresource Integrity

### generateSRI(content, algorithm?)

Compute a Subresource Integrity hash for a given resource content.

```ts
import { generateSRI } from '@akashjs/security';

const integrity = await generateSRI(scriptContent);
// "sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
```

Use this in your `<script>` and `<link>` tags to ensure CDN resources have not been tampered with:

```html
<script src="https://cdn.example.com/lib.js" integrity="sha384-..." crossorigin="anonymous"></script>
```

## CLI Security Audit

### akash audit

The `akash audit` command scans your project for common security issues:

- Unsanitized `innerHTML` assignments
- Missing CSP headers in SSR entry points
- Hardcoded secrets or API keys in source files
- Missing CSRF protection on HTTP clients
- Prototype-pollutable merge patterns
- Unsafe URL usage (`javascript:` hrefs)
- Missing security headers in server middleware
- Outdated dependencies with known CVEs

```sh
akash audit                # Run full audit, print report
akash audit --fix          # Auto-fix issues where possible
akash audit --json         # Output results as JSON (for CI)
```

::: tip
Add `akash audit --json` to your CI pipeline and fail the build on critical findings:
```yaml
- run: npx akash audit --json
```
:::

| Flag | Description |
|---|---|
| `--fix` | Automatically apply safe fixes (e.g., wrap `innerHTML` with `sanitize()`) |
| `--json` | Output structured JSON for programmatic consumption |
