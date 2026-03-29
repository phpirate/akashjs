# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 0.1.x | Yes |

## Reporting a Vulnerability

If you discover a security vulnerability in AkashJS, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, email: **phpirate@gmail.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Impact assessment
- Suggested fix (if you have one)

## Response Timeline

- **Acknowledgement**: Within 48 hours
- **Assessment**: Within 1 week
- **Fix**: Depends on severity (critical: ASAP, high: within 2 weeks)
- **Disclosure**: After fix is released

## Security Features

AkashJS includes built-in security features:

- **`sanitize(html)`** — XSS prevention via HTML sanitization
- **`generateCSP()`** — Content Security Policy header generation
- **`generateSecurityHeaders()`** — Helmet-like security headers
- **`createCSRFInterceptor()`** — CSRF token management
- **`safeMerge()`** — Prototype pollution prevention
- **`sanitizeURL()`** — Open redirect prevention
- **`akash audit`** — Static security analysis CLI tool

See the [Security Guide](docs/guide/security-module.md) for details.

## Best Practices

When using AkashJS in production:

1. Never use `innerHTML` directly — use `sanitize()` or `createSafeHTML()`
2. Enable CSP headers via `generateSecurityHeaders()`
3. Use `createCSRFInterceptor()` with your HTTP client
4. Run `akash audit` in your CI pipeline
5. Keep all `@akashjs/*` packages on the same version
6. Use environment variables for secrets — never hardcode tokens
