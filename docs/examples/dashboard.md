# Data Dashboard

A dashboard that fetches data from an API, handles loading/error states, and refreshes after mutations. Demonstrates the query cache, HTTP client, and reactive data fetching.

## HTTP Client Setup

Create `src/lib/http.ts`:

```ts
import { createHttpClient, createQueryClient } from '@akashjs/http';

export const http = createHttpClient({
  baseUrl: '/api',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
});

export const queryClient = createQueryClient({
  defaultStaleTime: 30_000, // 30 seconds
});
```

## Page Component

Create `src/routes/page.akash`:

```html
<script lang="ts">
import { signal, computed } from '@akashjs/runtime';
import { useCachedQuery, useMutation } from '@akashjs/http';
import { http, queryClient } from '@/lib/http';

// Reactive filters
const search = signal('');
const page = signal(1);
const pageSize = 10;

// Fetch users — refetches when search or page changes
const users = useCachedQuery(
  queryClient,
  () => ['users', search(), page()],
  () => http.get(`/users?q=${search()}&page=${page()}&limit=${pageSize}`),
  { staleTime: 60_000 },
);

// Delete mutation — invalidates the users query on success
const deleteUser = useMutation(
  queryClient,
  (id: number) => http.delete(`/users/${id}`),
  {
    invalidates: ['users'],
    onSuccess: () => console.log('User deleted'),
  },
);

// Computed stats
const total = computed(() => users()?.total ?? 0);
const totalPages = computed(() => Math.ceil(total() / pageSize));

function handleSearch(e: Event) {
  search.set((e.target as HTMLInputElement).value);
  page.set(1); // reset to first page on search
}
</script>

<template>
  <div class="dashboard">
    <h1>Users</h1>

    <!-- Search -->
    <input
      type="search"
      placeholder="Search users..."
      value={search()}
      onInput={handleSearch}
    />

    <!-- Loading state -->
    <Show when={users.loading() && !users()}>
      {() => <div class="loading">Loading users...</div>}
    </Show>

    <!-- Error state -->
    <Show when={users.error()}>
      {() => (
        <div class="error">
          <p>Failed to load users: {users.error()?.message}</p>
          <button onClick={() => users.refetch()}>Retry</button>
        </div>
      )}
    </Show>

    <!-- Data table -->
    <Show when={users()}>
      {() => (
        <>
          <!-- Inline loading indicator for background refetch -->
          <Show when={users.loading()}>
            {() => <div class="refetching">Refreshing...</div>}
          </Show>

          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <For each={users()?.data ?? []} key={(u) => u.id}>
                {(user) => (
                  <tr>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>
                      <button
                        class="danger"
                        disabled={deleteUser.loading()}
                        onClick={() => deleteUser.execute(user.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>

          <!-- Pagination -->
          <div class="pagination">
            <button disabled={page() <= 1} onClick={() => page.update((p) => p - 1)}>
              Previous
            </button>
            <span>Page {page()} of {totalPages()}</span>
            <button
              disabled={page() >= totalPages()}
              onClick={() => page.update((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </Show>
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 800px;
  margin: 2rem auto;
  font-family: system-ui, sans-serif;
}

input[type="search"] {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  margin-bottom: 1rem;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}

th {
  font-weight: 600;
  color: #555;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1rem 0;
}

.pagination button {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  cursor: pointer;
}

.pagination button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.loading, .refetching {
  padding: 1rem;
  text-align: center;
  color: #666;
}

.refetching {
  font-size: 0.875rem;
  color: #6750a4;
}

.error {
  padding: 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #dc2626;
}

.error button {
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

button.danger {
  padding: 0.25rem 0.75rem;
  background: none;
  color: #dc2626;
  border: 1px solid #dc2626;
  border-radius: 4px;
  cursor: pointer;
}

button.danger:hover {
  background: #dc2626;
  color: white;
}
</style>
```

## What This Demonstrates

- **`createHttpClient`** — typed HTTP client with base URL and credentials
- **`createQueryClient`** — centralized cache with stale time
- **`useCachedQuery`** — reactive data fetching with cache key tracking
  - Reactive key: `['users', search(), page()]` — refetches when search or page changes
  - `staleTime` — serves cached data for 60s before refetching
  - `loading()` — true during fetch (both initial and background)
  - `error()` — error state with retry
  - `refetch()` — manual refresh
- **`useMutation`** — delete with automatic cache invalidation
  - `invalidates: ['users']` — prefix match refetches all user queries
  - `loading()` — disables button during mutation
- **`computed()`** — derived pagination state
- **`signal()`** — local filter/page state
- **`<For>`** — table rows with keyed reconciliation
- **`<Show>`** — loading, error, and empty states
- **Fragments `<>...</>`** — multiple root elements in Show children
