# PWA

AkashJS includes built-in Progressive Web App support: service worker registration, update detection, caching strategies, push notifications, and offline awareness.

## Registering a Service Worker

```ts
import { registerServiceWorker } from '@akashjs/runtime';

const sw = registerServiceWorker('/sw.js', {
  onUpdate: (reg) => toast.info('New version available!'),
  onReady: (reg) => console.log('SW ready'),
  onError: (err) => console.error('SW failed:', err),
  autoReload: false,
  scope: '/',
});
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `onUpdate` | `(reg) => void` | -- | Called when a new service worker version is available |
| `onReady` | `(reg) => void` | -- | Called when the service worker is active and ready |
| `onError` | `(err) => void` | -- | Called on registration failure |
| `autoReload` | `boolean` | `false` | Automatically reload the page when an update is found |
| `scope` | `string` | -- | Service worker scope |

### Returned Signals and Methods

The `registerServiceWorker()` call returns an object with reactive signals and control methods:

```ts
sw.registered();       // boolean signal — is the SW registered?
sw.updateAvailable();  // boolean signal — is a new version waiting?
sw.offline();          // boolean signal — is the browser offline?

await sw.ready;        // Promise<ServiceWorkerRegistration>
await sw.update();     // manually check for updates
sw.skipWaiting();      // activate the waiting SW and reload
await sw.unregister(); // remove the service worker
```

### Reacting to Updates

```html
<script lang="ts">
import { registerServiceWorker } from '@akashjs/runtime';

const sw = registerServiceWorker('/sw.js');
</script>

<template>
  <Show when={sw.updateAvailable()}>
    <div class="update-banner">
      A new version is available.
      <button onClick={() => sw.skipWaiting()}>Update now</button>
    </div>
  </Show>
</template>
```

### Offline Detection

The `offline` signal tracks the browser's connectivity state:

```html
<template>
  <Show when={sw.offline()}>
    <div class="offline-banner">You are offline</div>
  </Show>
</template>
```

## Caching Strategies

AkashJS can auto-generate a service worker script with configurable caching strategies per route pattern.

### Available Strategies

| Strategy | Behavior |
|---|---|
| `cache-first` | Serve from cache, fall back to network. Best for static assets. |
| `network-first` | Fetch from network, fall back to cache. Best for API calls. |
| `stale-while-revalidate` | Serve cached version immediately, update cache in background. |
| `network-only` | Always fetch from network. No caching. |
| `cache-only` | Only serve from cache. No network requests. |

### generateSWScript()

Generate a complete service worker script from an array of cache route configurations:

```ts
import { generateSWScript } from '@akashjs/runtime';

const swScript = generateSWScript([
  { match: /\.(?:js|css)$/, strategy: 'cache-first', cacheName: 'assets' },
  { match: '/api/', strategy: 'network-first', maxAgeSeconds: 300 },
  { match: /\.(?:png|jpg|svg)$/, strategy: 'cache-first', cacheName: 'images' },
]);

// Write swScript to dist/sw.js during your build step
```

### CacheRoute Options

| Property | Type | Description |
|---|---|---|
| `match` | `string \| RegExp` | URL pattern to match |
| `strategy` | `CacheStrategy` | One of the five caching strategies |
| `cacheName` | `string` | Cache storage name (default: `'akash-cache'`) |
| `maxEntries` | `number` | Maximum entries in the cache |
| `maxAgeSeconds` | `number` | Maximum age of cached entries in seconds |

## Push Notifications

Subscribe to push notifications after the service worker is ready:

```ts
import { subscribePush } from '@akashjs/runtime';

const sw = registerServiceWorker('/sw.js');
const reg = await sw.ready;

const subscription = await subscribePush(reg, VAPID_PUBLIC_KEY);

if (subscription) {
  // Send subscription to your server
  await fetch('/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify(subscription),
    headers: { 'Content-Type': 'application/json' },
  });
}
```

`subscribePush()` requests notification permission from the user. If denied, it returns `null`. The VAPID public key is provided by your push notification server.
