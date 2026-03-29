# Data Fetching Patterns

## Problem

You need to fetch, cache, mutate, and display server data with proper loading states, error handling, retry logic, and optimistic updates.

## Solution

Use `createResource` for reads and `createAction` for writes. Both integrate with AkashJS signals for reactive UI updates.

### 1. Basic Resource

```ts
import { createResource } from '@akashjs/http';
import { createHttpClient } from '@akashjs/http';

const http = createHttpClient({ baseUrl: '/api' });

// Fetches once, re-fetches when userId changes
const userId = signal(1);
const user = createResource(
  () => http.get(`/users/${userId()}`),
  { key: () => userId() }
);
```

```html
<div :if={user.loading()} class="skeleton">Loading...</div>
<div :if={user.error()} class="error">
  {user.error().message}
  <button @click={user.refetch}>Retry</button>
</div>
<div :if={user()}>
  <h1>{user().name}</h1>
  <p>{user().email}</p>
</div>
```

### 2. Caching with staleTime

```ts
// Data stays fresh for 30 seconds — navigating back skips refetch
const posts = createResource(
  () => http.get('/posts'),
  { staleTime: 30_000 }
);

// Refetch when the browser tab regains focus
const notifications = createResource(
  () => http.get('/notifications'),
  { staleTime: 10_000, refetchOnFocus: true }
);
```

::: tip
Set `staleTime` to avoid redundant fetches. A good default is 30 seconds for list views and 60 seconds for detail views.
:::

### 3. Mutations with createAction

```ts
import { createAction } from '@akashjs/http';

const createPost = createAction(
  (data: { title: string; body: string }) =>
    http.post('/posts', data),
  {
    onSuccess: (result) => {
      posts.refetch(); // Refresh the list
    },
    onError: (err) => {
      console.error('Failed to create post:', err.message);
    },
  }
);
```

```html
<form @submit|preventDefault={handleSubmit}>
  <!-- form fields... -->
  <button type="submit" :disabled={createPost.loading()}>
    {createPost.loading() ? 'Saving...' : 'Create Post'}
  </button>
  <p :if={createPost.error()} class="error">{createPost.error().message}</p>
</form>
```

### 4. Optimistic Updates

```ts
const todos = createResource(() => http.get('/todos'));

const toggleTodo = createAction(
  (todo: Todo) => http.patch(`/todos/${todo.id}`, { done: !todo.done }),
  {
    optimistic: (todo) => {
      // Immediately update the UI
      todos.mutate(
        todos().map((t) =>
          t.id === todo.id ? { ...t, done: !t.done } : t
        )
      );
    },
    revertOptimistic: () => {
      // On failure, refetch the real data
      todos.refetch();
    },
  }
);
```

::: warning
Always provide `revertOptimistic` when using `optimistic`. Without it, a failed mutation leaves the UI in an incorrect state.
:::

### 5. Retry with Exponential Backoff

```ts
import { retry } from '@akashjs/http';

const data = await retry(
  () => http.get('/flaky-endpoint'),
  {
    maxRetries: 3,
    backoff: 'exponential',
    delay: 1000,
    maxDelay: 10000,
    jitter: true,
    retryOn: [500, 502, 503, 429],
    onRetry: (err, attempt) => {
      console.log(`Retry ${attempt}: ${err.message}`);
    },
  }
);
```

### 6. Loading Skeletons

```html
<div :if={user.loading()} class="skeleton-card">
  <div class="skeleton-line skeleton-title"></div>
  <div class="skeleton-line"></div>
  <div class="skeleton-line skeleton-short"></div>
</div>
```

```css
.skeleton-line {
  height: 1rem;
  background: linear-gradient(90deg, #eee 25%, #ddd 50%, #eee 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
  margin-bottom: 0.75rem;
}
.skeleton-title { width: 60%; height: 1.5rem; }
.skeleton-short { width: 40%; }
@keyframes shimmer { to { background-position: -200% 0; } }
```

### 7. Request Deduplication

```ts
// createResource automatically deduplicates: if the same key triggers
// two fetches, the first in-flight request is cancelled via AbortController
const userId = signal(1);

const user = createResource(
  () => http.get(`/users/${userId()}`),
  { key: () => userId() }
);

// Rapidly changing userId only fires one request (the latest)
userId.set(2);
userId.set(3); // Only this request completes
```

### When to Use What

| Pattern | Use Case | API |
|---------|----------|-----|
| Read once | Static data on page load | `createResource(fetcher)` |
| Read + rekey | Data dependent on params | `createResource(fetcher, { key })` |
| Cached read | Avoid redundant fetches | `createResource(fetcher, { staleTime })` |
| Manual refetch | Refresh after mutation | `resource.refetch()` |
| Write | Create, update, delete | `createAction(mutationFn)` |
| Optimistic write | Instant UI feedback | `createAction(fn, { optimistic })` |
| Resilient fetch | Flaky APIs | `retry(fn, { maxRetries })` |

## Result

A complete data layer with reactive reads, write mutations, caching, optimistic updates, exponential retry, and automatic request deduplication. Loading and error states are signals, so your UI reacts instantly.
