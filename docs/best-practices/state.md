# State Management Best Practices

## Decision Tree: Which State Tool?

```
Is the state local to one component?
  └─ YES → signal()

Is the state shared across components?
  ├─ Between parent and child → props (pass down) or context (provide/inject)
  ├─ Between siblings or distant components → defineStore()
  └─ Synced to the URL → useQueryState()

Does the state come from a server?
  └─ YES → createResource() (with createHttpClient)

Does the state need to persist offline?
  └─ YES → createOfflineStore()
```

| Tool | Scope | Persistence | Reactivity |
|---|---|---|---|
| `signal()` | Local component | None | Fine-grained |
| `computed()` | Derived from signals | None | Lazy recompute |
| `provide/inject` | Component subtree | None | Via signals |
| `defineStore()` | Global singleton | None (add $subscribe for persistence) | Signal-based |
| `useQueryState()` | URL params | URL + browser history | Signal-based |
| `createResource()` | Server data cache | Stale-while-revalidate | Signal-based |
| `createOfflineStore()` | IndexedDB | Full offline + sync | Signal-based |

## Signal Fundamentals

### Do not destructure signal calls

When you destructure a signal's return value, you capture a static value and lose reactivity.

```ts
// DON'T: destructuring breaks reactivity
const store = useUserStore();
const { name, email } = store.$snapshot(); // static values — not reactive!

effect(() => {
  console.log(name); // never re-runs when name changes
});
```

```ts
// DO: read signals as function calls
const store = useUserStore();

effect(() => {
  console.log(store.name()); // re-runs when name changes
});
```

### Prefer computed over effect + signal

If you are using an effect to write to a signal based on other signals, use `computed()` instead.

```ts
// DON'T: effect + signal for derived state
const firstName = signal('Alice');
const lastName = signal('Smith');
const fullName = signal('');

effect(() => {
  fullName.set(`${firstName()} ${lastName()}`);
});
```

```ts
// DO: computed for derived state
const firstName = signal('Alice');
const lastName = signal('Smith');
const fullName = computed(() => `${firstName()} ${lastName()}`);
```

::: tip Why computed wins
- `computed()` is lazy -- it only recalculates when read.
- `effect()` runs eagerly on every dependency change.
- `computed()` is read-only, preventing accidental writes.
- `computed()` avoids an extra signal allocation.
:::

### Batch related updates

When you update multiple signals that feed the same UI, wrap them in `batch()` to avoid intermediate renders.

```ts
// DON'T: two separate updates = two effect runs
firstName.set('Bob');
lastName.set('Jones');
```

```ts
// DO: batch = one effect run
import { batch } from '@akashjs/runtime';

batch(() => {
  firstName.set('Bob');
  lastName.set('Jones');
});
```

### Use untrack for non-reactive reads

When you need to read a signal inside an effect without subscribing to it, use `untrack()`.

```ts
import { untrack } from '@akashjs/runtime';

effect(() => {
  // Re-runs when query changes, but NOT when config changes
  const results = search(query(), untrack(() => config()));
  hits.set(results);
});
```

## Store Design

### One store per domain

Split your application state into focused, domain-specific stores.

```ts
// DON'T: one mega-store
const useAppStore = defineStore('app', {
  state: () => ({
    user: null,
    token: '',
    cartItems: [],
    theme: 'light',
    notifications: [],
    searchQuery: '',
    // ... 20 more fields
  }),
});
```

```ts
// DO: domain-specific stores
const useAuthStore = defineStore('auth', {
  state: () => ({ user: null, token: '' }),
  // ...
});

const useCartStore = defineStore('cart', {
  state: () => ({ items: [] }),
  // ...
});

const useUIStore = defineStore('ui', {
  state: () => ({ theme: 'light', sidebarOpen: true }),
  // ...
});
```

### Keep actions focused

Each action should do one thing. Complex workflows should compose multiple actions.

```ts
// DON'T: action that does everything
actions: {
  async loginAndSetupApp(email: string, password: string) {
    const res = await http.post('/login', { email, password });
    this.user.set(res.user);
    this.token.set(res.token);
    localStorage.setItem('token', res.token);
    await loadUserPreferences();
    router.navigate('/dashboard');
    analytics.track('login');
  },
}
```

```ts
// DO: focused actions, composed externally
// auth.store.ts
actions: {
  setCredentials(user: User, token: string) {
    this.user.set(user);
    this.token.set(token);
  },
  clear() {
    this.user.set(null);
    this.token.set('');
  },
}

// login handler (in component or service)
async function handleLogin(email: string, password: string) {
  const res = await http.post('/login', { email, password });
  auth.setCredentials(res.user, res.token);
  navigate('/dashboard');
}
```

### Always clear stores in tests

Stores are singletons. If you do not clear them between tests, state leaks across test cases.

```ts
import { clearStores } from '@akashjs/runtime';

beforeEach(() => {
  clearStores();
});
```

## Context (provide/inject)

Use context for values that many descendants need but that should not be global (theme, locale, feature flags within a subtree).

```ts
// DO: use context for subtree-scoped values
const FeatureFlagContext = createContext<Set<string>>(new Set());

// In a parent
provide(FeatureFlagContext, new Set(['dark-mode', 'beta-search']));

// In any descendant
const flags = inject(FeatureFlagContext);
if (flags.has('dark-mode')) { /* ... */ }
```

::: warning Do not use context as a global store
Context is for subtree-scoped data. For truly global state, use `defineStore()`. Overusing context makes data flow harder to trace.
:::

## Common Mistakes

::: danger Reactive gotchas

**Reading a signal outside a reactive context does nothing special.**
```ts
const count = signal(0);
const val = count(); // just reads the value — no tracking here
// This is fine for one-time reads, but it will not update automatically.
```

**Storing a signal call result in a variable loses reactivity.**
```ts
// DON'T
const name = store.name(); // captures current value
return <p>{name}</p>;      // never updates

// DO
return <p>{store.name()}</p>; // re-evaluates on change
```

**Do not call `.set()` inside `computed()`.**
```ts
// DON'T — computed should be pure
const bad = computed(() => {
  sideEffect.set(true); // throws in dev mode
  return count() * 2;
});
```
:::
