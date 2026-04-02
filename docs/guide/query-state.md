# URL-Synced State

`useQueryState()` automatically syncs signal values to URL query parameters. Users can share links, use browser back/forward, and state persists across reloads — zero boilerplate.

## Basic Usage

```ts
import { useQueryState } from '@akashjs/runtime';

const search = useQueryState('q', '');
const page = useQueryState('page', 1);
const tags = useQueryState('tags', ['js']);

search();            // reads from URL param ?q=... or ''
search.set('hello'); // URL updates to ?q=hello
```

The signal reads the initial value from the URL. When you `.set()`, the URL updates. When the user hits back/forward, signals update automatically.

## Supported Types

Type detection is automatic based on the default value:

| Default Value | URL Format | Example |
|---|---|---|
| `''` (string) | `?q=hello` | `useQueryState('q', '')` |
| `0` (number) | `?page=3` | `useQueryState('page', 1)` |
| `false` (boolean) | `?debug=true` | `useQueryState('debug', false)` |
| `[]` (array) | `?tags=js,ts` | `useQueryState('tags', [])` |

## Multiple Parameters

Use `useQueryStates()` to sync several params at once:

```ts
import { useQueryStates } from '@akashjs/runtime';

const { q, page, sort } = useQueryStates({
  q: { default: '' },
  page: { default: 1 },
  sort: { default: 'name' },
});

q.set('akashjs');
page.set(2);
// URL: ?q=akashjs&page=2 (sort omitted because it equals default)
```

## Options

```ts
const search = useQueryState('q', '', {
  history: 'push',       // 'push' | 'replace' (default: 'replace')
  debounce: 300,          // debounce URL updates (ms)
  removeDefault: true,    // remove param when value === default
  serialize: (v) => v,    // custom serializer
  deserialize: (r) => r,  // custom deserializer
});
```

## With DataTable

Sync table filters, sort, and pagination to the URL:

```ts
const search = useQueryState('q', '');
const page = useQueryState('page', 1);
const sortCol = useQueryState('sort', '');

const table = createDataTable({
  data: () => filteredData(),
  columns: [...],
  pageSize: 20,
});

// Connect: when URL state changes, update the table
effect(() => {
  table.filter(search());
  table.goToPage(page());
  if (sortCol()) table.sort(sortCol());
});
```

## With Router

Query state integrates automatically with the router — navigation preserves query params, and back/forward triggers signal updates via the `popstate` listener.

## Utilities

```ts
import { clearQueryState, getQueryParams, removeQueryState } from '@akashjs/runtime';

clearQueryState();        // remove all params, reset signals
getQueryParams();         // { q: 'hello', page: '3' }
removeQueryState('q');    // stop syncing a specific key
```

## How It Works

1. On creation, reads the current URL param (or uses default)
2. On `.set()`, updates the URL via `replaceState` (or `pushState`)
3. On `popstate` (back/forward), all registered signals update in a batch
4. Default values are removed from URL to keep it clean

## Router Integration: useSearchParams()

If you're using `@akashjs/router`, you can also use `useSearchParams()` for raw read/write access to URL query parameters:

```ts
import { useSearchParams } from '@akashjs/router';

const [searchParams, setSearchParams] = useSearchParams();

// Read (reactive — updates on URL change)
const status = searchParams().status;

// Write — merges with existing params
setSearchParams({ status: 'active' });

// Remove a param
setSearchParams({ status: null });

// Replace all params
setSearchParams({ q: 'hello' }, { replace: true });
```

`useSearchParams` is lower-level than `useQueryState` — it works with raw `Record<string, string>` and doesn't auto-serialize types. Use `useQueryState` when you want typed signals with automatic URL sync; use `useSearchParams` when you need full control over the query string.
