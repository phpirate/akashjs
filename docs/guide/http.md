# HTTP Client

`@akashjs/http` is a typed, promise-based HTTP client with interceptor middleware and reactive resource signals.

## Basic Usage

```ts
import { createHttpClient } from '@akashjs/http';

const http = createHttpClient({
  baseUrl: '/api',
  headers: { 'Content-Type': 'application/json' },
});

const users = await http.get<User[]>('/users');
const user = await http.post<User>('/users', { name: 'Alice' });
const updated = await http.put<User>('/users/1', { name: 'Bob' });
await http.patch('/users/1', { active: true });
await http.delete('/users/1');
```

All methods are generic — pass the expected response type for full type safety.

## Request Options

```ts
await http.get('/search', {
  params: { q: 'hello', page: '1' },    // query string
  headers: { 'X-Custom': 'value' },      // per-request headers
  signal: abortController.signal,         // cancellation
  credentials: 'include',                 // cookies
});
```

## Error Handling

Non-2xx responses throw `HttpError`:

```ts
import { HttpError } from '@akashjs/http';

try {
  await http.get('/missing');
} catch (err) {
  if (err instanceof HttpError) {
    console.log(err.status);     // 404
    console.log(err.statusText); // 'Not Found'
    console.log(err.body);       // response body text
  }
}
```

## Interceptors

Interceptors are async middleware that can transform requests and responses:

```ts
import type { HttpInterceptor } from '@akashjs/http';

const authInterceptor: HttpInterceptor = async (request, next) => {
  request.headers.set('Authorization', `Bearer ${getToken()}`);
  const response = await next(request);
  if (response.status === 401) {
    await refreshToken();
    return next(request); // retry
  }
  return response;
};

const http = createHttpClient({
  baseUrl: '/api',
  interceptors: [authInterceptor],
});
```

Interceptors execute in order for requests and reverse order for responses (onion model).

## createResource()

`createResource()` bridges HTTP with the reactivity system:

```ts
import { createResource } from '@akashjs/http';
import { signal } from '@akashjs/runtime';

const userId = signal(1);

const user = createResource(
  () => http.get<User>(`/users/${userId()}`),
  {
    key: () => userId(),        // refetch when key changes
    staleTime: 30_000,          // cache for 30s
    refetchOnFocus: true,       // refetch on tab focus
    initialData: undefined,     // data before first fetch
  },
);

user();          // User | undefined
user.loading();  // boolean
user.error();    // Error | undefined
user.refetch();  // manually refetch
user.mutate(u);  // optimistic update
user.dispose();  // cleanup
```

The fetcher re-runs automatically whenever reactive dependencies inside it change (like `userId()` above).

## createAction()

`createAction()` is the write-side companion to `createResource()`. It wraps a mutation function with reactive loading/error state and lifecycle hooks.

```ts
import { createAction } from '@akashjs/http';

const createPost = createAction(
  (data: { title: string; body: string }) =>
    http.post<Post>('/api/posts', data),
  {
    onSuccess: (result) => { posts.refetch(); },
    onError: (err) => { toast.error(err.message); },
    onSettled: () => { console.log('done'); },
  },
);

// Execute the action:
await createPost.execute({ title: 'Hello', body: '...' });
createPost.loading(); // boolean
createPost.error();   // Error | undefined
createPost.data();    // Post | undefined
createPost.reset();   // clear error and data
```

### Optimistic Updates

Apply changes immediately and revert on failure:

```ts
const toggleLike = createAction(
  (postId: string) => http.post(`/api/posts/${postId}/like`),
  {
    optimistic: (postId) => { likeCache.set(postId, true); },
    revertOptimistic: (postId) => { likeCache.set(postId, false); },
  },
);
```

## createSocket()

`createSocket()` provides a WebSocket client with auto-reconnect, exponential backoff, and reactive status via signals.

```ts
import { createSocket } from '@akashjs/http';

const ws = createSocket('wss://api.example.com/ws', {
  autoReconnect: true,
  maxRetries: 5,
  reconnectDelay: 1000,
  maxReconnectDelay: 30000,
});

ws.status(); // 'connecting' | 'open' | 'closed' | 'error'

// Listen for messages (auto-deserialized from JSON):
const unsub = ws.on('message', (data) => {
  console.log('Received:', data);
});

// Send (auto-serialized to JSON):
ws.send({ type: 'subscribe', channel: 'updates' });

// Lifecycle:
ws.reconnect(); // manual reconnect
ws.close();     // close (stops auto-reconnect)
ws.dispose();   // close and stop reconnecting permanently
unsub();        // remove listener
```

**Options:**

| Option | Type | Default | Description |
|---|---|---|---|
| `autoReconnect` | `boolean` | `true` | Reconnect on disconnect |
| `maxRetries` | `number` | `Infinity` | Max reconnect attempts |
| `reconnectDelay` | `number` | `1000` | Initial delay in ms |
| `maxReconnectDelay` | `number` | `30000` | Max delay with exponential backoff |
| `protocols` | `string \| string[]` | — | WebSocket sub-protocols |
| `serialize` | `(data) => string` | `JSON.stringify` | Custom serializer |
| `deserialize` | `(data) => unknown` | `JSON.parse` | Custom deserializer |

## Pagination

Signal-based pagination controllers that pair with `createResource()` for paginated data fetching.

### Page-Based Pagination

```ts
import { createPagination } from '@akashjs/http';

const pager = createPagination({
  pageSize: 20,
  totalItems: () => totalCount(),
  initialPage: 1,
});

const data = createResource(
  () => http.get(`/items?page=${pager.page()}&size=${pager.pageSize}`),
  { key: () => pager.page() },
);

pager.page();       // current page (1-based)
pager.totalPages(); // computed total pages
pager.hasNext();    // boolean
pager.hasPrev();    // boolean
pager.next();       // go to next page
pager.prev();       // go to previous page
pager.goTo(3);      // jump to page 3
pager.offset();     // SQL-style offset (0-based)
pager.range();      // { from: 21, to: 40, total: 100 }
pager.reset();      // back to page 1
```

### Cursor-Based Pagination

For APIs that use cursors instead of page numbers:

```ts
import { createCursorPagination } from '@akashjs/http';

const pager = createCursorPagination<string>({ pageSize: 20 });

const data = createResource(
  () => http.get(`/items?cursor=${pager.cursor() ?? ''}&limit=${pager.pageSize}`),
  { key: () => pager.cursor() },
);

// After fetching, set the next cursor from the response:
effect(() => {
  if (data()) {
    pager.setNextCursor(data().nextCursor);
  }
});

pager.hasMore();   // boolean — false when nextCursor is null
pager.loadMore();  // advance to next cursor
pager.reset();     // back to first page
```

## Authentication

`createAuth()` provides a complete authentication layer with reactive state, token management, and integration hooks for the HTTP client and router.

### Setup

```ts
import { createAuth } from '@akashjs/http';

const auth = createAuth({
  loginUrl: '/api/auth/login',
  refreshUrl: '/api/auth/refresh',
  userUrl: '/api/auth/me',
  tokenStorage: 'localStorage',  // 'localStorage' | 'sessionStorage' | 'memory'
});
```

### Login and Logout

```ts
// Login with credentials — sends POST to loginUrl, stores token, fetches user
await auth.login({ email: 'alice@example.com', password: 'secret' });

// Set token manually (e.g., from an OAuth callback)
await auth.setToken('eyJhbGciOi...');

// Logout — clears token, clears user
auth.logout();
```

### Reactive State

All auth state is reactive via signals:

```ts
auth.user();         // User | null — current user object
auth.token();        // string | null — current JWT/token
auth.isLoggedIn();   // boolean — true when token is present
```

Use these in templates for conditional rendering:

```html
<template>
  <Show when={auth.isLoggedIn()}>
    <p>Welcome, {auth.user()?.name}</p>
    <button onClick={() => auth.logout()}>Logout</button>
  </Show>
  <Show when={!auth.isLoggedIn()}>
    <Link to="/login">Sign in</Link>
  </Show>
</template>
```

### HTTP Interceptor

`auth.interceptor` is an `HttpInterceptor` that attaches the token to every request and handles token refresh on 401 responses:

```ts
import { createHttpClient } from '@akashjs/http';

const http = createHttpClient({
  baseUrl: '/api',
  interceptors: [auth.interceptor],
});
```

The interceptor adds an `Authorization: Bearer <token>` header to outgoing requests. If a response returns 401, it attempts a token refresh via `refreshUrl` and retries the original request.

### Router Guard

`auth.guard()` returns a route guard that redirects unauthenticated users:

```ts
import { createRouter } from '@akashjs/router';

const router = createRouter(routes);

// Use as a per-route guard:
// routes/dashboard/guard.ts
export const guard = auth.guard('/login');
```

### Token Storage Options (`tokenStorage`)

| Value | Description |
|---|---|
| `'localStorage'` | Persists across tabs and browser restarts (default) |
| `'sessionStorage'` | Cleared when the tab closes |
| `'memory'` | In-memory only — cleared on page refresh (most secure) |

## useInfiniteScroll()

`useInfiniteScroll()` pairs with cursor-based pagination to load more data as the user scrolls. It observes a sentinel element and triggers loading automatically.

### Basic Usage

```ts
import { useInfiniteScroll } from '@akashjs/http';
import { createCursorPagination, createResource } from '@akashjs/http';

const pager = createCursorPagination<string>({ pageSize: 20 });

const data = createResource(
  () => http.get(`/items?cursor=${pager.cursor() ?? ''}&limit=${pager.pageSize}`),
  { key: () => pager.cursor() },
);

const scroll = useInfiniteScroll({
  load: async () => {
    pager.loadMore();
  },
  hasMore: () => pager.hasMore(),
});
```

### Template Integration

Place a sentinel element at the bottom of your list. When it enters the viewport, `load` is called:

```html
<template>
  <div class="feed">
    <For each={allItems()}>
      {(item) => <FeedItem data={item} />}
    </For>

    <div ref={scroll.sentinel}>
      <Show when={scroll.loading()}>
        <Spinner />
      </Show>
      <Show when={scroll.done()}>
        <p>No more items</p>
      </Show>
    </div>
  </div>
</template>
```

### Signals and Methods

```ts
scroll.loading();   // boolean — true while load() is running
scroll.done();      // boolean — true when hasMore() returns false
scroll.reset();     // reset state and re-observe sentinel
scroll.dispose();   // disconnect observer and clean up
```

`useInfiniteScroll` uses `IntersectionObserver` internally and automatically calls `dispose()` when the component unmounts.

## Query Cache

`createQueryClient` provides a centralized cache for server state with automatic stale-time management, background refetching, and cache invalidation.

### Setup

```ts
import { createQueryClient } from '@akashjs/http';

const qc = createQueryClient({
  defaultStaleTime: 30_000,  // 30s before data considered stale
});
```

### useCachedQuery()

```ts
import { useCachedQuery } from '@akashjs/http';

const users = useCachedQuery(qc, ['users'], () => http.get<User[]>('/users'), {
  staleTime: 60_000,          // override default stale time
  refetchOnFocus: true,        // refetch when tab regains focus
  placeholderData: [],         // shown while loading (no loading flash)
  initialData: cachedUsers,    // seed the cache
  enabled: () => isReady(),    // disable until condition is met
});

users();          // User[] | undefined
users.loading();  // boolean
users.error();    // Error | undefined
```

Pass `null` as the key to disable the query entirely:

```ts
const profile = useCachedQuery(qc, userId() ? ['user', userId()] : null, () =>
  http.get<User>(`/users/${userId()}`),
);
```

### useMutation()

```ts
import { useMutation } from '@akashjs/http';

const addUser = useMutation(qc, (data: NewUser) => http.post<User>('/users', data), {
  invalidates: ['users'],     // prefix match — invalidates ['users'], ['users', 1], etc.
  onSuccess: (user) => { toast.success(`Created ${user.name}`); },
  onError: (err) => { toast.error(err.message); },
  optimistic: (data) => {
    qc.setQueryData(['users'], (prev) => [...(prev ?? []), { ...data, id: 'temp' }]);
  },
});

await addUser.execute({ name: 'Alice', email: 'alice@example.com' });
```

### Manual Cache Operations

```ts
qc.setQueryData(['users', 1], updatedUser);       // write directly to cache
qc.getQueryData<User[]>(['users']);                // read from cache
qc.invalidate(['users']);                          // mark stale, trigger refetch
qc.removeQuery(['users', 1]);                     // remove entry entirely
qc.clear();                                       // wipe the entire cache
```

## Offline Query Cache

Enable offline support by passing `offline` options to the query client:

```ts
const qc = createQueryClient({
  defaultStaleTime: 30_000,
  offline: {
    storage: 'indexeddb',        // persist cache to IndexedDB
    queueMutations: true,        // queue mutations when offline
    syncOnReconnect: true,       // replay queued mutations on reconnect
  },
});
```

When the network drops, queries are served from the persisted cache. Mutations are queued locally and automatically replayed in order when connectivity returns.

```ts
// Reactive online/offline signal
client.online();  // boolean — updates reactively
```

## Default Credentials

Set a default `credentials` policy on the HTTP client so every request includes cookies without per-request configuration:

```ts
const http = createHttpClient({
  baseUrl: '/api',
  credentials: 'include',  // 'include' | 'same-origin' | 'omit'
});
```

This applies to all requests made through the client. Per-request `credentials` still overrides the default.

## WebSocket / Cache Bridge

`bindSocket` connects a WebSocket to the query cache so server-pushed events automatically update or invalidate cached data:

```ts
import { bindSocket } from '@akashjs/http';

bindSocket(ws, qc, {
  'user:updated': { invalidates: ['users'] },
  'message:new': {
    update: (event) => ({
      key: ['messages'],
      updater: (prev) => [...(prev ?? []), event],
    }),
  },
  'cache:clear': { handler: () => qc.clear() },
});
```

Each key is a message `type` that maps to a rule. Rules can `invalidates` (prefix match), `update` (direct cache patch), or use a custom `handler`. You can also pass a custom message parser:

```ts
bindSocket(ws, qc, rules, {
  getType: (msg) => msg.method,    // e.g., for SignalR format
  getData: (msg) => msg.args?.[0],
});
```

## Enhanced Auth

`createAuth` supports additional options for cookie-based auth, account management flows, session recovery, and multi-tab coordination.

### Cookie Mode

```ts
const auth = createAuth({
  loginUrl: '/api/auth/login',
  userUrl: '/api/auth/me',
  mode: 'cookie',  // no token stored client-side; relies on httpOnly cookies
});
```

### Account Flows

```ts
await auth.signup({ email, password, name });
await auth.forgotPassword({ email });
await auth.resetPassword({ token, newPassword });
```

### Session Recovery and Expiration

```ts
const auth = createAuth({
  loginUrl: '/api/auth/login',
  refreshUrl: '/api/auth/refresh',
  userUrl: '/api/auth/me',
  autoRestore: true,             // restore session from storage on init
  onSessionExpired: () => {      // called when refresh fails
    router.push('/login');
    toast.error('Session expired');
  },
});
```

### Custom Login Payload and Fetch Config

```ts
const auth = createAuth({
  loginUrl: '/api/auth/login',
  userUrl: '/api/auth/me',
  loginPayload: (creds) => ({ username: creds.email, pass: creds.password }),
  fetchConfig: { credentials: 'include' },
});
```

### Cross-Tab Token Sync

When using `localStorage` storage, token changes in one tab are automatically synced to all other tabs via the `storage` event. Logging out in one tab logs out everywhere.

### Concurrent 401 Deduplication

When multiple requests hit a 401 simultaneously, only a single token refresh is triggered. All waiting requests are paused and retried once the refresh completes, avoiding redundant refresh calls and race conditions.
