# TypeScript Best Practices

AkashJS is TypeScript-native. Every API is designed for inference first. These guidelines help you get the most out of the type system without fighting it.

## Enable Strict Mode

Always use strict mode in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true
  }
}
```

::: tip What strict mode catches
- `null` and `undefined` are not assignable to other types
- Function parameters must be typed
- `this` is typed in class methods
- Unused locals and parameters are flagged
:::

## Leverage Inference -- Do Not Over-Annotate

AkashJS APIs infer types automatically. Adding explicit annotations where the compiler already knows the type adds noise.

```ts
// DON'T: redundant type annotations
const count: Signal<number> = signal<number>(0);
const doubled: ReadonlySignal<number> = computed<number>(() => count() * 2);
const name: Signal<string> = signal<string>('Alice');
```

```ts
// DO: let TypeScript infer
const count = signal(0);          // Signal<number>
const doubled = computed(() => count() * 2);  // ReadonlySignal<number>
const name = signal('Alice');     // Signal<string>
```

The exception is when the initial value does not capture the full type:

```ts
// DO: annotate when inference falls short
const user = signal<User | null>(null);  // null alone infers Signal<null>
const items = signal<Item[]>([]);         // [] alone infers Signal<never[]>
```

## Generic Components

Type component props with interfaces for maximum inference:

```html
<script lang="ts">
interface Props {
  items: string[];
  onSelect: (item: string) => void;
}
</script>
```

For generic components in `defineComponent`, pass the type parameter:

```ts
// A type-safe list component
function createList<T>() {
  return defineComponent<{
    items: T[];
    renderItem: (item: T) => AkashNode;
    keyFn: (item: T) => string | number;
  }>((ctx) => {
    return () => (
      <For each={ctx.props.items} key={ctx.props.keyFn}>
        {(item) => ctx.props.renderItem(item)}
      </For>
    );
  });
}

const UserList = createList<User>();
```

## Utility Types for Props

Use TypeScript utility types to build prop interfaces cleanly:

```ts
// Pick relevant fields from a larger type
interface UserCardProps {
  user: Pick<User, 'name' | 'avatar' | 'email'>;
  compact?: boolean;
}

// Omit fields you do not need
type CreateUserInput = Omit<User, 'id' | 'createdAt'>;

// Make all props optional for an update form
type UpdateUserInput = Partial<Omit<User, 'id'>>;

// Extract callback types
type OnSelect = (item: Item) => void;
```

## Type-Safe Routes

Define route params as types and use them in loaders and pages:

```ts
// routes/blog/[slug]/loader.ts
import type { RouteLoader } from '@akashjs/router';

interface BlogParams {
  slug: string;
}

interface BlogData {
  title: string;
  content: string;
  author: string;
}

export const loader: RouteLoader<BlogParams> = async ({ params, fetch }) => {
  return fetch(`/api/posts/${params.slug}`).then(r => r.json()) as Promise<BlogData>;
};
```

```html
<!-- routes/blog/[slug]/page.akash -->
<script lang="ts">
import { useLoaderData, useParams } from '@akashjs/router';

interface BlogData {
  title: string;
  content: string;
  author: string;
}

const data = useLoaderData<BlogData>();
const params = useParams<{ slug: string }>();
</script>

<template>
  <article>
    <h1>{data()?.title}</h1>
    <p>By {data()?.author}</p>
    <div>{data()?.content}</div>
  </article>
</template>
```

## Type-Safe Stores

Store types are inferred from the `state()` factory. You rarely need explicit type annotations:

```ts
// Types are fully inferred
const useTaskStore = defineStore('tasks', {
  state: () => ({
    tasks: [] as Task[],
    filter: 'all' as 'all' | 'active' | 'done',
  }),
  getters: {
    // state is typed — state.tasks() returns Task[]
    filtered: (state) => {
      const f = state.filter();
      if (f === 'all') return state.tasks();
      return state.tasks().filter(t => t.done === (f === 'done'));
    },
    count: (state) => state.tasks().length,
  },
  actions: {
    // this is typed — this.tasks is Signal<Task[]>
    add(text: string) {
      this.tasks.update(list => [...list, { id: crypto.randomUUID(), text, done: false }]);
    },
    toggle(id: string) {
      this.tasks.update(list =>
        list.map(t => t.id === id ? { ...t, done: !t.done } : t)
      );
    },
  },
});
```

## Type-Safe HTTP

The HTTP client methods are generic -- always pass the expected response type:

```ts
// DON'T: untyped responses
const data = await http.get('/users');  // unknown

// DO: typed responses
const users = await http.get<User[]>('/users');          // User[]
const user = await http.post<User>('/users', payload);   // User
```

## Type-Safe Context

```ts
// The context type is inferred from the default value
const ThemeContext = createContext<'light' | 'dark'>('light');

// inject() returns 'light' | 'dark'
const theme = inject(ThemeContext);
```

## Type-Safe Event Bus

```ts
interface AppEvents {
  'user:login': { id: string; name: string };
  'user:logout': void;
  'cart:update': { itemCount: number };
}

const bus = createEventBus<AppEvents>();

// Fully typed — handler receives { id: string; name: string }
bus.on('user:login', (user) => {
  console.log(user.name);
});

// Type error: argument does not match 'user:login' payload
bus.emit('user:login', { wrong: 'type' }); // TypeScript error
```

## Avoid `any`

```ts
// DON'T
const data: any = await fetchData();
function process(input: any) { /* ... */ }
```

```ts
// DO: use unknown and narrow
const data: unknown = await fetchData();

if (isUser(data)) {
  console.log(data.name); // typed as User
}

// Type guard
function isUser(val: unknown): val is User {
  return typeof val === 'object' && val !== null && 'name' in val;
}
```

```ts
// DO: use generics instead of any
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}
```

::: warning When you truly need escape hatches
If you are integrating with an untyped third-party library, use `as unknown as TargetType` rather than `any`. It forces you to be explicit about what you are doing.
:::

## Type-Safe Forms

The form field types are inferred from the `initial` values:

```ts
const form = defineForm({
  email: { initial: '', validators: [required(), email()] },
  age: { initial: 0, validators: [min(18)] },
  agreed: { initial: false, validators: [] },
});

// form.values() returns { email: string; age: number; agreed: boolean }
// form.fields.email.value() returns string
// form.fields.age.value() returns number
```

With Zod, the types flow from the schema:

```ts
const schema = z.object({
  email: z.string().email(),
  age: z.number().min(18),
});

const form = createFormFromSchema(schema);
// form.values() returns { email: string; age: number }
```
