# Await Blocks & Snippets

AkashJS provides Svelte-inspired utilities for handling asynchronous data, reusable template fragments, debugging, form actions, and navigation state preservation.

## Await Component

The `Await` component declaratively renders different content for each state of a promise: pending, resolved, and rejected.

```ts
import { Await } from '@akashjs/runtime';

const userData = fetch('/api/user').then(r => r.json());

html`
  <${Await} promise=${userData}>
    <template slot="pending">
      <p>Loading user...</p>
    </template>
    <template slot="then" let:value=${user}>
      <p>Hello, ${user.name}!</p>
    </template>
    <template slot="catch" let:error=${err}>
      <p class="error">Failed: ${err.message}</p>
    </template>
  </${Await}>
`;
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `promise` | `Promise<T>` | The promise to track |
| `slot="pending"` | template | Shown while the promise is unresolved |
| `slot="then"` | template | Shown when the promise resolves; receives the value |
| `slot="catch"` | template | Shown when the promise rejects; receives the error |

### Updating the Promise

When the `promise` prop changes, `Await` resets and tracks the new promise. This makes it easy to combine with reactive signals:

```ts
const userId = signal(1);
const userPromise = computed(() => fetch(`/api/users/${userId()}`).then(r => r.json()));

html`
  <${Await} promise=${userPromise}>
    <template slot="pending"><p>Loading...</p></template>
    <template slot="then" let:value=${user}>
      <p>${user.name}</p>
    </template>
  </${Await}>

  <button @click=${() => userId.set(userId() + 1)}>Next user</button>
`;
```

## awaitSignal()

For a more functional approach, `awaitSignal()` converts a promise into a reactive object with status fields.

```ts
import { awaitSignal } from '@akashjs/runtime';

const user = awaitSignal(fetch('/api/user').then(r => r.json()));

// Reactive properties:
user.loading   // true while pending
user.value     // resolved value (or undefined)
user.error     // rejection reason (or undefined)
```

Use it directly in templates:

```ts
html`
  ${() => user.loading
    ? html`<p>Loading...</p>`
    : user.error
      ? html`<p class="error">${user.error.message}</p>`
      : html`<p>Hello, ${user.value.name}!</p>`
  }
`;
```

### Refreshing

Pass a function that returns a promise to enable refresh:

```ts
const user = awaitSignal(() => fetch('/api/user').then(r => r.json()));

// Re-fetch
user.refresh();
```

## defineSnippet()

`defineSnippet()` creates reusable template fragments -- similar to Svelte's `{#snippet}` blocks. Snippets let you extract repeated markup without creating a full component.

```ts
import { defineSnippet } from '@akashjs/runtime';

const UserCard = defineSnippet((user) => html`
  <div class="card">
    <img src=${user.avatar} alt=${user.name} />
    <h3>${user.name}</h3>
    <p>${user.bio}</p>
  </div>
`);
```

Use snippets inside templates:

```ts
html`
  <div class="user-list">
    ${() => users().map(user => UserCard(user))}
  </div>
`;
```

Snippets can accept multiple arguments and nest other snippets:

```ts
const Badge = defineSnippet((label, color) => html`
  <span class="badge" style=${`background: ${color}`}>${label}</span>
`);

const UserCard = defineSnippet((user) => html`
  <div class="card">
    <h3>${user.name} ${Badge(user.role, user.roleColor)}</h3>
  </div>
`);
```

## inspect()

`inspect()` logs reactive values whenever they change -- useful for debugging without setting up watchers manually.

```ts
import { inspect } from '@akashjs/runtime';

const count = signal(0);
const name = signal('Alice');

// Logs to console whenever count or name changes
inspect(count, name);

// With a custom callback
inspect(count, name, (values) => {
  console.table(values);
});
```

In development mode, `inspect()` integrates with the AkashJS DevTools panel. In production builds, `inspect()` calls are tree-shaken away.

### Options

```ts
inspect(signal1, signal2, {
  label: 'MyComponent',   // prefix for log messages
  trace: true,             // include stack trace
  breakpoint: false,       // pause in debugger on change
});
```

## defineFormAction()

`defineFormAction()` creates server-side form handlers with progressive enhancement. Forms work without JavaScript and upgrade to async submission when JS is available.

```ts
import { defineFormAction } from '@akashjs/runtime';

export const submitContact = defineFormAction(async (formData) => {
  const name = formData.get('name');
  const email = formData.get('email');

  if (!email) {
    return { error: 'Email is required' };
  }

  await db.contacts.create({ name, email });
  return { success: true };
});
```

Use in a component:

```ts
import { submitContact } from './actions';

html`
  <form method="POST" action=${submitContact}>
    <input name="name" placeholder="Name" />
    <input name="email" type="email" placeholder="Email" required />
    <button type="submit">Send</button>

    ${() => submitContact.result?.error
      ? html`<p class="error">${submitContact.result.error}</p>`
      : null
    }
    ${() => submitContact.result?.success
      ? html`<p class="success">Message sent!</p>`
      : null
    }
  </form>
`;
```

### Progressive Enhancement

| Feature | No JS | With JS |
|---------|-------|---------|
| Form submission | Full page POST | Async fetch, no reload |
| Validation errors | Server redirect with flash | Inline error display |
| Loading state | Browser native | `submitContact.submitting` signal |
| Redirect | Server 302 | Client-side navigation |

## enableSnapshots()

`enableSnapshots()` preserves scroll position and form state across navigations and browser back/forward, similar to Svelte's `snapshot` feature.

```ts
import { enableSnapshots } from '@akashjs/runtime';

const SearchPage = component('app-search', () => {
  const query = signal('');
  const scrollY = signal(0);

  enableSnapshots({
    query,
    scrollY,
  });

  return html`
    <input
      type="search"
      value=${query}
      @input=${(e) => query.set(e.target.value)}
    />
    <div class="results">
      <!-- results here -->
    </div>
  `;
});
```

When the user navigates away and returns (via back button or history), the signals are restored to their saved values automatically.

### What Gets Preserved

- Signal values passed to `enableSnapshots()`
- Scroll position (opt-in via `scrollY` / `scrollX` signals)
- Form input values bound to signals

### Options

```ts
enableSnapshots(signals, {
  key: 'search-page',   // unique key (auto-generated from component if omitted)
  storage: 'session',   // 'session' (default) or 'history' (uses history.state)
});
```
