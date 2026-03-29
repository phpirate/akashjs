# Deployment

AkashJS provides zero-config deployment with `akash deploy`. It detects your target platform, generates the right configuration files, and deploys your app — all in a single command.

## Zero-Config Deploy

```bash
akash deploy
```

That is it. AkashJS inspects your project and automatically detects the right deployment target based on config files in your project (e.g., `vercel.json`, `wrangler.toml`, `netlify.toml`). If none are found, it defaults to a static export.

## Auto-Detection

AkashJS looks for platform-specific files to determine where to deploy:

| File Detected | Platform |
|---|---|
| `vercel.json` or `.vercel/` | Vercel |
| `wrangler.toml` | Cloudflare Pages/Workers |
| `netlify.toml` or `_redirects` | Netlify |
| `deno.json` | Deno Deploy |
| None of the above | Static export |

## Explicit Target

Override auto-detection with the `--target` flag:

```bash
akash deploy --target vercel
akash deploy --target cloudflare
akash deploy --target netlify
akash deploy --target deno
akash deploy --target static
```

## SSR Mode

Enable server-side rendering for your deployment:

```bash
akash deploy --ssr
```

This generates a server entry point alongside your client bundle. Each platform adapter handles SSR differently:

- **Vercel** — Generates a serverless function in `api/`
- **Cloudflare** — Generates a Workers script with `fetch` handler
- **Netlify** — Generates a Netlify Function in `netlify/functions/`
- **Deno** — Generates a `main.ts` entry for Deno Deploy

Without `--ssr`, the app is built as a fully static SPA.

## Dry Run

Preview what will happen without actually deploying:

```bash
akash deploy --dry-run
```

Output:

```
Detected target: cloudflare
Mode: SSR
Build output: dist/
Files to upload: 42 (1.2 MB)

Generated files:
  wrangler.toml (updated)
  dist/_worker.js
  dist/assets/ (38 files)

No changes deployed (dry run).
```

This is useful for CI pipelines where you want to verify the build before deploying.

## Platform Adapters

Each deployment target has a platform adapter that generates the necessary config and entry files.

### Vercel

```bash
akash deploy --target vercel
```

Generates:

```
vercel.json          # build and route configuration
api/ssr.ts           # serverless function for SSR (if --ssr)
dist/                # static assets
```

The generated `vercel.json`:

```json
{
  "buildCommand": "akash build",
  "outputDirectory": "dist",
  "framework": null,
  "routes": [
    { "src": "/assets/(.*)", "dest": "/assets/$1" },
    { "src": "/(.*)", "dest": "/api/ssr" }
  ]
}
```

### Cloudflare

```bash
akash deploy --target cloudflare
```

Generates:

```
wrangler.toml        # Workers/Pages configuration
dist/_worker.js      # Worker entry point (if --ssr)
dist/                # static assets
```

### Netlify

```bash
akash deploy --target netlify
```

Generates:

```
netlify.toml                    # build and redirect configuration
netlify/functions/ssr.ts        # serverless function (if --ssr)
dist/                           # static assets
_redirects                      # SPA fallback routing
```

### Deno Deploy

```bash
akash deploy --target deno
```

Generates:

```
deno.json            # Deno configuration
main.ts              # entry point for Deno Deploy
dist/                # static assets
```

## Static Export

For a plain static site with no server requirements:

```bash
akash deploy --target static
```

This produces a `dist/` directory with all HTML, CSS, JS, and assets. Upload it anywhere — any static file host, S3 bucket, GitHub Pages, or your own nginx server.

```
dist/
  index.html
  assets/
    app-[hash].js
    app-[hash].css
    ...
```

## Build Options

Combine flags to control the build:

```bash
# Production build with SSR for Cloudflare
akash deploy --target cloudflare --ssr

# Static build, custom output directory
akash deploy --target static --outDir build

# Preview locally before deploying
akash build --preview
```

## CI/CD Example

Deploy from GitHub Actions:

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npx akash deploy --target vercel
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

## Environment Variables

Set environment variables for your deployment:

```bash
akash deploy --env API_URL=https://api.example.com --env DEBUG=false
```

Or use a `.env.production` file — AkashJS reads it automatically during build:

```bash
# .env.production
API_URL=https://api.example.com
PUBLIC_ANALYTICS_ID=UA-123456
```

Variables prefixed with `PUBLIC_` are available in client-side code via `import.meta.env.PUBLIC_ANALYTICS_ID`. All other variables are server-only.
