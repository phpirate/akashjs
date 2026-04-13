# Type-safe API

AkashJS lets you define your API once and use it on both server and client with full type safety. No code generation, no manual type duplication — `defineAPI()` gives you a typed contract that both sides share.

## Define Once, Use Everywhere

```ts
// shared/api.ts — this file is imported by both server and client
import { defineAPI } from '@akashjs/http';
import { z } from 'zod';

export const api = defineAPI({
  getUser: {
    method: 'GET',
    input: z.object({ id: z.string() }),
    resolve: async ({ input }) => {
      const user = await db.users.findById(input.id);
      if (!user) throw new APIError(404, 'User not found');
      return user;
    },
  },
  createUser: {
    method: 'POST',
    input: z.object({
      name: z.string().min(1),
      email: z.string().email(),
    }),
    resolve: async ({ input }) => {
      return db.users.create(input);
    },
  },
});
```

The `resolve` function runs on the server. The `input` schema validates on both sides — the client validates before sending, and the server validates before executing.

## Endpoints

Each endpoint has three parts:

| Property | Description |
|---|---|
| `method` | HTTP method — `'GET'`, `'POST'`, `'PUT'`, `'PATCH'`, `'DELETE'` |
| `input` | A Zod schema defining the expected input. Validated on both client and server. |
| `resolve` | An async function that handles the request. Receives `{ input, context }`. |

The resolve function receives a context object with request metadata:

```ts
resolve: async ({ input, context }) => {
  context.headers;    // request headers
  context.params;     // URL parameters
  context.user;       // authenticated user (if using auth middleware)
}
```

## Client

Use `createAPIClient()` to get a fully typed client. Every endpoint becomes a callable function with typed input and output.

```ts
// client.ts
import { createAPIClient } from '@akashjs/http';
import type { api } from './shared/api';

const client = createAPIClient<typeof api>({
  baseURL: '/api',
});

// Fully typed — TypeScript knows the input shape and return type
const user = await client.getUser({ id: '123' });
//    ^? { id: string; name: string; email: string }

const newUser = await client.createUser({
  name: 'Alice',
  email: 'alice@example.com',
});
```

Autocompletion works for endpoint names, input fields, and return types.

## Server Handler

Use `createAPIHandler()` to mount the API on your server. It works with any HTTP framework.

```ts
// server.ts
import { createAPIHandler } from '@akashjs/http';
import { api } from './shared/api';

const handler = createAPIHandler(api, {
  prefix: '/api',
});

// With Node's built-in HTTP
import { createServer } from 'http';
createServer(handler).listen(3000);

// Or with Express
app.use('/api', handler);

// Or with AkashJS server
import { createServer as createAkashServer } from '@akashjs/http';
const server = createAkashServer({ api: handler });
server.listen(3000);
```

## Input Validation

Input is validated automatically using the Zod schema. Invalid input never reaches your `resolve` function.

```ts
const api = defineAPI({
  createPost: {
    method: 'POST',
    input: z.object({
      title: z.string().min(1).max(200),
      body: z.string().min(10),
      tags: z.array(z.string()).max(5).optional(),
      published: z.boolean().default(false),
    }),
    resolve: async ({ input }) => {
      // input is fully typed and guaranteed valid
      return db.posts.create(input);
    },
  },
});
```

On the client side, validation errors are thrown before the request is sent:

```ts
try {
  await client.createPost({ title: '', body: 'short' });
} catch (e) {
  // ZodError: title must be at least 1 character, body must be at least 10 characters
}
```

## useQuery for Reactive Data

In components, use `useQuery()` to fetch data reactively. It returns signals for `data`, `loading`, and `error`.

```ts
import { defineComponent } from '@akashjs/runtime';
import { useQuery } from '@akashjs/http';

const UserProfile = defineComponent((ctx) => {
  const userId = ctx.prop('userId');

  const user = useQuery(() => client.getUser({ id: userId() }));

  return () => {
    if (user.loading()) return <p>Loading...</p>;
    if (user.error()) return <p>Error: {user.error().message}</p>;

    return (
      <div>
        <h1>{user.data().name}</h1>
        <p>{user.data().email}</p>
      </div>
    );
  };
});
```

`useQuery()` automatically re-fetches when reactive dependencies (like `userId()`) change.

### Query Options

```ts
const posts = useQuery(() => client.listPosts({ page: page() }), {
  refetchInterval: 30_000,   // re-fetch every 30 seconds
  staleTime: 5_000,          // consider data fresh for 5 seconds
  enabled: () => isLoggedIn(), // only fetch when condition is true
});

// Manual refetch
posts.refetch();
```

## Error Handling

Throw `APIError` in your resolve function to return structured errors.

```ts
import { defineAPI, APIError } from '@akashjs/http';

const api = defineAPI({
  deleteUser: {
    method: 'DELETE',
    input: z.object({ id: z.string() }),
    resolve: async ({ input, context }) => {
      if (!context.user?.isAdmin) {
        throw new APIError(403, 'Admin access required');
      }

      const user = await db.users.findById(input.id);
      if (!user) {
        throw new APIError(404, 'User not found');
      }

      await db.users.delete(input.id);
      return { deleted: true };
    },
  },
});
```

On the client, errors are caught with a status code and message:

```ts
try {
  await client.deleteUser({ id: '123' });
} catch (e) {
  if (e instanceof APIError) {
    e.status;   // 403
    e.message;  // 'Admin access required'
  }
}
```

## Example: Full CRUD API

A complete API for managing a todo list:

```ts
// shared/api.ts
import { defineAPI, APIError } from '@akashjs/http';
import { z } from 'zod';

const TodoInput = z.object({
  title: z.string().min(1),
  done: z.boolean().default(false),
});

export const api = defineAPI({
  listTodos: {
    method: 'GET',
    input: z.object({
      filter: z.enum(['all', 'active', 'done']).default('all'),
    }),
    resolve: async ({ input }) => {
      const todos = await db.todos.findAll();
      if (input.filter === 'active') return todos.filter((t) => !t.done);
      if (input.filter === 'done') return todos.filter((t) => t.done);
      return todos;
    },
  },

  getTodo: {
    method: 'GET',
    input: z.object({ id: z.string() }),
    resolve: async ({ input }) => {
      const todo = await db.todos.findById(input.id);
      if (!todo) throw new APIError(404, 'Todo not found');
      return todo;
    },
  },

  createTodo: {
    method: 'POST',
    input: TodoInput,
    resolve: async ({ input }) => {
      return db.todos.create(input);
    },
  },

  updateTodo: {
    method: 'PATCH',
    input: z.object({
      id: z.string(),
      title: z.string().min(1).optional(),
      done: z.boolean().optional(),
    }),
    resolve: async ({ input }) => {
      const { id, ...data } = input;
      const todo = await db.todos.update(id, data);
      if (!todo) throw new APIError(404, 'Todo not found');
      return todo;
    },
  },

  deleteTodo: {
    method: 'DELETE',
    input: z.object({ id: z.string() }),
    resolve: async ({ input }) => {
      await db.todos.delete(input.id);
      return { deleted: true };
    },
  },
});
```

```ts
// client component
import { defineComponent, signal } from '@akashjs/runtime';
import { useQuery } from '@akashjs/http';

const TodoApp = defineComponent((ctx) => {
  const filter = signal<'all' | 'active' | 'done'>('all');
  const newTitle = signal('');

  const todos = useQuery(() => client.listTodos({ filter: filter() }));

  const addTodo = async () => {
    await client.createTodo({ title: newTitle() });
    newTitle.set('');
    todos.refetch();
  };

  const toggle = async (id: string, done: boolean) => {
    await client.updateTodo({ id, done: !done });
    todos.refetch();
  };

  return () => (
    <div>
      <input value={newTitle()} on:input={(e) => newTitle.set(e.target.value)} />
      <button on:click={addTodo}>Add</button>

      <nav>
        <button on:click={() => filter.set('all')}>All</button>
        <button on:click={() => filter.set('active')}>Active</button>
        <button on:click={() => filter.set('done')}>Done</button>
      </nav>

      {todos.loading() && <p>Loading...</p>}

      <ul>
        {todos.data()?.map((todo) => (
          <li>
            <input
              type="checkbox"
              checked={todo.done}
              on:change={() => toggle(todo.id, todo.done)}
            />
            {todo.title}
          </li>
        ))}
      </ul>
    </div>
  );
});
```
