# Server-Side Rendering

AkashJS supports SSR out of the box. The compiler generates server-safe output, the runtime provides `renderToString`, and the vite-plugin auto-detects SSR builds.

## How It Works

1. **Compiler** — `mode: 'server'` generates plain functions returning HTML strings (no `document`, no `defineComponent`, no event handlers)
2. **Runtime** — `renderToString(Component)` renders a component to an HTML string
3. **Vite plugin** — detects `vite build --ssr` and switches the compiler to server mode automatically

## Setup

No plugin configuration needed. The vite-plugin detects SSR mode from Vite's build config:

```ts
// vite.config.ts — same for both client and server
import { defineConfig } from 'vite';
import akash from '@akashjs/vite-plugin';

export default defineConfig({
  plugins: [akash({ routes: { dir: 'src/routes' } })],
});
```

## Entry Points

### Server Entry

```ts
// src/entry-server.ts
import { renderToString, collectSSRHead, renderHeadToString } from '@akashjs/runtime';
import App from './App.akash';

export async function render(url: string) {
  const html = await renderToString(App, { url });
  const head = renderHeadToString(collectSSRHead());
  return { html, head };
}
```

### Client Entry

```ts
// src/entry-client.ts
import { hydrate } from '@akashjs/runtime';
import App from './App.akash';

hydrate(App, document.getElementById('app')!);
```

## Build

```sh
# Client bundle
vite build

# Server bundle (plugin auto-switches to server compiler mode)
vite build --ssr src/entry-server.ts
```

## Server

```ts
// server.js
import express from 'express';
import fs from 'fs';
import { render } from './dist/server/entry-server.js';

const app = express();
app.use(express.static('dist/client'));

const template = fs.readFileSync('dist/client/index.html', 'utf8');

app.get('*', async (req, res) => {
  const { html, head } = await render(req.url);
  res.send(template
    .replace('<!--ssr-head-->', head)
    .replace('<!--ssr-outlet-->', html)
  );
});

app.listen(3000);
```

### HTML Template

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
<head>
  <!--ssr-head-->
</head>
<body>
  <div id="app"><!--ssr-outlet--></div>
  <script type="module" src="/src/entry-client.ts"></script>
</body>
</html>
```

## What Works in SSR

| Feature | SSR Support |
|---|---|
| Static HTML rendering | Full |
| `<Show>` / `<For>` / fragments | Compiled to `if`/`for` |
| Signal reads | Evaluated once (one-shot) |
| `useHead` / `useSEO` | Collected via `collectSSRHead()` |
| Props with types | Full TypeScript support |
| Scoped styles | Scope attributes applied |

| Feature | Client-only |
|---|---|
| Event handlers (`onClick`) | Stripped in SSR, attached on hydration |
| Effects / subscriptions | Not created during SSR |
| `bind:` directives | Hydration restores bindings |
| DevTools overlay | Client-only |

## SSR + Query Cache

Prefetch data on the server and pass it to the client:

```ts
// Server
const qc = createQueryClient();
const data = await fetch('/api/posts').then(r => r.json());
qc.setQueryData(['posts'], data);

// Pass serialized cache to client via script tag
const cacheJson = JSON.stringify(qc.getQueryData(['posts']));
```

## SSR + Head Management

`useHead()` and `useSEO()` work during SSR — tags are collected (not injected into DOM) and rendered via `renderHeadToString()`:

```ts
// Inside a component (works in both client and server)
useHead({ title: 'My Page', meta: [{ name: 'description', content: '...' }] });

// Server entry
const head = renderHeadToString(collectSSRHead());
// → '<title>My Page</title>\n  <meta name="description" content="..." />\n'
```
