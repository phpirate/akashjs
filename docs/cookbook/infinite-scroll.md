# Infinite Scroll

## Problem

You need to load data incrementally as the user scrolls, with cursor-based pagination, a loading indicator, error handling, and a fallback "Load more" button.

## Solution

Combine `useInfiniteScroll` from `@akashjs/runtime` with `createCursorPagination` from `@akashjs/http` for a robust infinite list.

### 1. Mock API

```ts
// src/api/posts.ts
interface Post {
  id: string;
  title: string;
  body: string;
}

// Simulates a cursor-paginated API
export async function fetchPosts(cursor: string | null, limit: number) {
  const res = await fetch(`/api/posts?cursor=${cursor ?? ''}&limit=${limit}`);
  if (!res.ok) throw new Error('Failed to load posts');
  return res.json() as Promise<{
    items: Post[];
    nextCursor: string | null;
  }>;
}
```

### 2. Infinite Scroll with Cursor Pagination

```ts
// src/pages/feed.ts
import { signal } from '@akashjs/runtime';
import { useInfiniteScroll } from '@akashjs/runtime';
import { createCursorPagination } from '@akashjs/http';
import { fetchPosts } from '../api/posts';

const posts = signal<Post[]>([]);
const error = signal<string | null>(null);

const pager = createCursorPagination<string>({ pageSize: 20 });

async function loadNextPage() {
  error.set(null);
  const result = await fetchPosts(pager.cursor(), pager.pageSize);
  pager.setNextCursor(result.nextCursor);
  posts.update((prev) => [...prev, ...result.items]);
}

const { sentinel, loading, done, reset } = useInfiniteScroll({
  onLoadMore: async () => {
    try {
      pager.loadMore();
      await loadNextPage();
    } catch (err) {
      error.set(err.message);
    }
  },
  hasMore: () => pager.hasMore(),
  rootMargin: '400px',
});
```

::: tip
Set `rootMargin` to `'400px'` or more so data loads before the user reaches the bottom. This makes scrolling feel seamless.
:::

### 3. Template

```html
<div class="feed">
  <div :for={post of posts()} :key={post.id} class="post-card">
    <h3>{post.title}</h3>
    <p>{post.body}</p>
  </div>

  <!-- Loading indicator -->
  <div :if={loading()} class="loading-spinner" aria-label="Loading more posts">
    <div class="spinner"></div>
    <span>Loading more posts...</span>
  </div>

  <!-- Error with retry -->
  <div :if={error()} class="error-banner">
    <p>Failed to load: {error()}</p>
    <button @click={loadNextPage}>Try Again</button>
  </div>

  <!-- Fallback "Load more" button (for users who disable JS observers) -->
  <button :if={!done() && !loading() && !error()}
          @click={loadNextPage}
          class="load-more-btn">
    Load More
  </button>

  <!-- Sentinel element (invisible, triggers next load) -->
  <div :if={!done()} :ref={sentinel}></div>

  <!-- End of list -->
  <p :if={done()} class="end-message">You've reached the end.</p>
</div>
```

### 4. Scroll Restoration

```ts
// Save scroll position before navigating away
import { effect } from '@akashjs/runtime';

const scrollKey = 'feed-scroll-pos';

// Restore on mount
const saved = sessionStorage.getItem(scrollKey);
if (saved) {
  requestAnimationFrame(() => window.scrollTo(0, parseInt(saved, 10)));
}

// Save on scroll (debounced)
let scrollTimer: number;
window.addEventListener('scroll', () => {
  clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => {
    sessionStorage.setItem(scrollKey, String(window.scrollY));
  }, 100);
});
```

### 5. Reset and Refresh

```ts
function refreshFeed() {
  posts.set([]);
  pager.reset();
  reset(); // Resets the infinite scroll state
  loadNextPage();
}
```

::: warning
Always call `reset()` on the infinite scroll controller when you clear the list. Otherwise it stays in the `done` state and never triggers again.
:::

### 6. Styles

```css
.loading-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  color: var(--color-text-muted);
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.load-more-btn {
  display: block;
  margin: 1rem auto;
  padding: 0.75rem 2rem;
}

.error-banner {
  text-align: center;
  padding: 1rem;
  background: #fef2f2;
  border-radius: 8px;
}
```

## Result

An infinite scroll feed that loads data via cursor pagination, shows a spinner while loading, retries on error, falls back to a manual "Load more" button, and restores scroll position when the user navigates back.
