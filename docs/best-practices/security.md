# Security Best Practices

## XSS Prevention

::: danger Never use innerHTML
Setting `innerHTML` directly bypasses AkashJS's template escaping and opens your app to cross-site scripting attacks.
:::

```ts
// DON'T: innerHTML with user input
const el = document.createElement('div');
el.innerHTML = userProvidedContent; // XSS vulnerability
```

```html
<!-- DON'T: dangerously set HTML in templates -->
<div innerHTML={userBio}></div>
```

```html
<!-- DO: use template expressions — they auto-escape -->
<template>
  <p>{userBio()}</p>  <!-- safely escaped -->
</template>
```

If you absolutely must render HTML (e.g., from a trusted CMS with a sanitizer), sanitize it first:

```ts
import DOMPurify from 'dompurify';

const sanitized = DOMPurify.sanitize(trustedHtml);
el.innerHTML = sanitized;
```

::: warning Even with sanitization
Only render HTML from sources you control (your own CMS, your own markdown parser). Never render user-submitted HTML without sanitization.
:::

## CSRF Protection

Use the auth interceptor to attach tokens to every request. For cookie-based auth, include CSRF tokens.

```ts
import { createHttpClient } from '@akashjs/http';
import { createAuth } from '@akashjs/http';

const auth = createAuth({
  loginUrl: '/api/auth/login',
  refreshUrl: '/api/auth/refresh',
  userUrl: '/api/auth/me',
});

const http = createHttpClient({
  baseUrl: '/api',
  interceptors: [auth.interceptor],
});
```

For CSRF tokens with cookie-based auth:

```ts
import type { HttpInterceptor } from '@akashjs/http';

const csrfInterceptor: HttpInterceptor = async (request, next) => {
  const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
  if (token) {
    request.headers.set('X-CSRF-Token', token);
  }
  return next(request);
};

const http = createHttpClient({
  baseUrl: '/api',
  interceptors: [csrfInterceptor, auth.interceptor],
});
```

## Environment Variables

::: danger Never expose secrets in client code
Any environment variable prefixed with `VITE_` is embedded in the client bundle and visible to anyone.
:::

```bash
# .env
VITE_API_URL=https://api.example.com   # OK — public
VITE_MAPS_KEY=pk_1234567890            # OK — public API key

DATABASE_URL=postgres://...            # SAFE — not bundled (no VITE_ prefix)
SECRET_KEY=sk_abcdef                   # SAFE — not bundled
```

```ts
// Client code
const apiUrl = import.meta.env.VITE_API_URL;  // available
const dbUrl = import.meta.env.DATABASE_URL;    // undefined — never bundled
```

Rules:
- Prefix with `VITE_` only for values that are safe to be public.
- Never put API secrets, database credentials, or private keys in `VITE_` variables.
- Use server-side environment variables for secrets and proxy API calls through your backend.

## Input Sanitization

Never trust user input. Validate and sanitize on both client and server.

```ts
// Client-side validation with forms
import { defineForm, required, maxLength, pattern } from '@akashjs/forms';

const form = defineForm({
  username: {
    initial: '',
    validators: [
      required(),
      maxLength(50, 'Username too long'),
      pattern(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores'),
    ],
  },
});
```

::: warning Client validation is for UX, not security
Client-side validation improves user experience. Server-side validation prevents attacks. Always validate on the server.
:::

## Content Security Policy

Set up a Content Security Policy header to prevent unauthorized script execution:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.example.com;
  font-src 'self';
  frame-src 'none';
```

For development, you may need to relax the policy:

```ts
// vite.config.ts
export default defineConfig({
  server: {
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'",
    },
  },
});
```

::: danger Remove unsafe-eval in production
Vite's dev server needs `unsafe-eval` for HMR, but your production build should never use it.
:::

## Dependency Auditing

Regularly audit your dependencies for known vulnerabilities:

```bash
# Check for vulnerabilities
npm audit

# Fix automatically where possible
npm audit fix

# For pnpm
pnpm audit
```

Add auditing to your CI pipeline:

```yaml
# .github/workflows/ci.yml
- name: Security audit
  run: pnpm audit --audit-level=high
```

::: tip Keep dependencies up to date
Use `npx npm-check-updates` or Dependabot to stay current. Outdated dependencies are the most common source of vulnerabilities.
:::

## Authentication Best Practices

```ts
// DO: use memory storage for high-security apps
const auth = createAuth({
  loginUrl: '/api/auth/login',
  refreshUrl: '/api/auth/refresh',
  userUrl: '/api/auth/me',
  tokenStorage: 'memory',  // cleared on page refresh — most secure
});
```

| Storage Option | Security | UX |
|---|---|---|
| `'memory'` | Best — cleared on refresh | User must log in again after refresh |
| `'sessionStorage'` | Good — cleared when tab closes | Persists during session |
| `'localStorage'` | Lowest — persists indefinitely | Best UX, survives browser restarts |

Additional recommendations:
- Use short-lived access tokens (5-15 minutes) with refresh tokens.
- The auth interceptor handles automatic token refresh on 401 responses.
- Always use HTTPS in production.
- Set `HttpOnly` and `Secure` flags on cookies (server-side).

## Router Guards for Authorization

Protect routes with guards to prevent unauthorized access:

```ts
// routes/admin/guard.ts
export const guard = auth.guard({ redirectTo: '/login' });
```

::: warning Guards are client-side only
Route guards prevent navigation in the browser but do not protect your API. Always check authorization on the server.
:::

## Summary

- [ ] No `innerHTML` with user content
- [ ] CSRF tokens on state-changing requests
- [ ] No secrets in `VITE_` environment variables
- [ ] Client and server input validation
- [ ] Content Security Policy headers in production
- [ ] Regular dependency audits in CI
- [ ] Short-lived tokens with automatic refresh
- [ ] Route guards + server-side authorization
