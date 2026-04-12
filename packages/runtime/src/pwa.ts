/**
 * PWA / Service Worker support.
 *
 * Register service workers, configure caching strategies,
 * handle updates, and manage push notifications.
 *
 * ```ts
 * const sw = registerServiceWorker('/sw.js', {
 *   onUpdate: () => toast.info('New version available!'),
 * });
 * sw.ready;        // Promise<ServiceWorkerRegistration>
 * sw.update();     // check for updates
 * ```
 */

import { signal } from './signals.js';
import type { ReadonlySignal } from './signals.js';

// =========================================================================
// Types
// =========================================================================

export interface SWOptions {
  /** Callback when a new version is available */
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  /** Callback when the SW is ready */
  onReady?: (registration: ServiceWorkerRegistration) => void;
  /** Callback on registration error */
  onError?: (error: Error) => void;
  /** Auto-reload on update (default: false) */
  autoReload?: boolean;
  /** Scope of the service worker */
  scope?: string;
}

export interface SWRegistration {
  /** Whether the SW is registered */
  registered: ReadonlySignal<boolean>;
  /** Whether an update is available */
  updateAvailable: ReadonlySignal<boolean>;
  /** Whether the app is running offline */
  offline: ReadonlySignal<boolean>;
  /** The raw SW registration (available after ready) */
  ready: Promise<ServiceWorkerRegistration>;
  /** Check for updates */
  update(): Promise<void>;
  /** Skip waiting and activate new SW */
  skipWaiting(): void;
  /** Unregister the service worker */
  unregister(): Promise<boolean>;
}

// =========================================================================
// Service Worker registration
// =========================================================================

/**
 * Register a service worker with update detection.
 */
export function registerServiceWorker(
  swUrl: string,
  options: SWOptions = {},
): SWRegistration {
  const registered = signal(false);
  const updateAvailable = signal(false);
  const offline = signal(!navigator.onLine);

  let registration: ServiceWorkerRegistration | null = null;

  // Track online/offline
  window.addEventListener('online', () => offline.set(false));
  window.addEventListener('offline', () => offline.set(true));

  const ready = new Promise<ServiceWorkerRegistration>((resolve, reject) => {
    if (!('serviceWorker' in navigator)) {
      reject(new Error('Service workers not supported'));
      return;
    }

    navigator.serviceWorker
      .register(swUrl, { scope: options.scope })
      .then((reg) => {
        registration = reg;
        registered.set(true);
        options.onReady?.(reg);
        resolve(reg);

        // Listen for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              updateAvailable.set(true);
              options.onUpdate?.(reg);

              if (options.autoReload) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            }
          });
        });
      })
      .catch((err) => {
        options.onError?.(err);
        reject(err);
      });
  });

  return {
    registered: () => registered(),
    updateAvailable: () => updateAvailable(),
    offline: () => offline(),
    ready,
    async update() {
      if (registration) {
        await registration.update();
      }
    },
    skipWaiting() {
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
    },
    async unregister() {
      if (registration) {
        return registration.unregister();
      }
      return false;
    },
  };
}

// =========================================================================
// Caching strategies (for SW scripts)
// =========================================================================

export type CacheStrategy = 'cache-first' | 'network-first' | 'stale-while-revalidate' | 'network-only' | 'cache-only';

export interface CacheRoute {
  /** URL pattern to match (string or regex) */
  match: string | RegExp;
  /** Caching strategy */
  strategy: CacheStrategy;
  /** Cache name */
  cacheName?: string;
  /** Max entries in cache */
  maxEntries?: number;
  /** Max age in seconds */
  maxAgeSeconds?: number;
}

/**
 * Generate a service worker script from cache route configs.
 *
 * ```ts
 * const swScript = generateSWScript([
 *   { match: /\.(?:js|css)$/, strategy: 'cache-first', cacheName: 'assets' },
 *   { match: '/api/', strategy: 'network-first', maxAgeSeconds: 300 },
 *   { match: /\.(?:png|jpg|svg)$/, strategy: 'cache-first', cacheName: 'images' },
 * ]);
 * ```
 */
export function generateSWScript(routes: CacheRoute[]): string {
  let script = `// Auto-generated service worker by AkashJS
const CACHE_VERSION = 'v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
`;

  for (const route of routes) {
    const pattern = route.match instanceof RegExp
      ? route.match.toString()
      : `new RegExp(${JSON.stringify(route.match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))})`;

    const cacheName = route.cacheName ?? 'akash-cache';

    script += `
  if (${pattern}.test(url.pathname)) {
    event.respondWith(${generateStrategyCode(route.strategy, cacheName)});
    return;
  }
`;
  }

  script += `
  // Default: network-first
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
`;

  return script;
}

function generateStrategyCode(strategy: CacheStrategy, cacheName: string): string {
  switch (strategy) {
    case 'cache-first':
      return `caches.match(event.request).then(cached => cached || fetch(event.request).then(response => { const clone = response.clone(); caches.open('${cacheName}').then(cache => cache.put(event.request, clone)); return response; }))`;
    case 'network-first':
      return `fetch(event.request).then(response => { const clone = response.clone(); caches.open('${cacheName}').then(cache => cache.put(event.request, clone)); return response; }).catch(() => caches.match(event.request))`;
    case 'stale-while-revalidate':
      return `caches.match(event.request).then(cached => { const fetchPromise = fetch(event.request).then(response => { caches.open('${cacheName}').then(cache => cache.put(event.request, response.clone())); return response; }); return cached || fetchPromise; })`;
    case 'network-only':
      return `fetch(event.request)`;
    case 'cache-only':
      return `caches.match(event.request)`;
  }
}

// =========================================================================
// Push notifications
// =========================================================================

/**
 * Request push notification permission and subscribe.
 */
export async function subscribePush(
  registration: ServiceWorkerRegistration,
  vapidPublicKey: string,
): Promise<PushSubscription | null> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as any,
  });

  return subscription;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}
