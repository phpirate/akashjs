# Migrating from Angular

## Concept Mapping

| Angular | AkashJS | Notes |
|---|---|---|
| `NgModule` | Nothing | No modules. Components are self-contained. |
| `@Component()` decorator | `defineComponent()` or `.akash` SFC | Functions, not classes. |
| `@Injectable()` service | `defineStore()` or plain function | No decorators needed. |
| `HttpClient` | `createHttpClient()` from `@akashjs/http` | Promise-based, no RxJS. |
| `Pipe` | `pipe()` function or plain function | Just a function call in templates. |
| `@Directive()` | `defineDirective()` | Same lifecycle concept, simpler API. |
| `CanActivate` guard | `guard()` function | Plain async function, no interface. |
| `@Input()` | `Props` interface | TypeScript interface, not decorator. |
| `@Output()` + EventEmitter | Callback props (`onSelect`, `onClick`) | Pass functions down, no emitter. |
| RxJS Observables | Signals (`signal`, `computed`, `effect`) | No subscribe, no pipe, no operators. |
| Zone.js | Nothing | No automatic change detection. Signals track dependencies. |
| Dependency Injection | `provide()` / `inject()` or `createInjector()` | Explicit, no hidden injector tree. |
| `ngOnInit` | `onMount()` | Runs after DOM insertion. |
| `ngOnDestroy` | `onUnmount()` or `onMount()` return cleanup | Return cleanup from onMount. |
| `*ngIf` | `<Show when={...}>` or `:if` directive | Same concept, different syntax. |
| `*ngFor` | `<For each={...}>` or `:for` directive | Same concept, different syntax. |
| Reactive Forms | `defineForm()` from `@akashjs/forms` | Signal-based, no FormControl classes. |
| Angular Router | `@akashjs/router` | File-based routing, similar guards/loaders. |
| Angular CLI | `@akashjs/cli` | `akash new`, `akash dev`, `akash build`. |

## Side-by-Side Examples

### 1. Component with State

**Angular:**
```ts
@Component({
  selector: 'app-counter',
  template: `
    <div>
      <span>{{ count }}</span>
      <button (click)="increment()">+</button>
    </div>
  `,
})
export class CounterComponent {
  @Input() initial = 0;
  count = 0;

  ngOnInit() {
    this.count = this.initial;
  }

  increment() {
    this.count++;
  }
}
```

**AkashJS:**
```html
<script lang="ts">
import { signal } from '@akashjs/runtime';

interface Props {
  initial?: number;
}

const count = signal(ctx.props.initial ?? 0);
const increment = () => count.update(c => c + 1);
</script>

<template>
  <div>
    <span>{count()}</span>
    <button onClick={increment}>+</button>
  </div>
</template>
```

### 2. Service / Store

**Angular:**
```ts
@Injectable({ providedIn: 'root' })
export class AuthService {
  private user = new BehaviorSubject<User | null>(null);
  user$ = this.user.asObservable();

  constructor(private http: HttpClient) {}

  login(email: string, password: string) {
    return this.http.post<{ user: User; token: string }>('/api/login', { email, password })
      .pipe(
        tap(res => this.user.next(res.user)),
      );
  }

  get isLoggedIn$() {
    return this.user$.pipe(map(u => u !== null));
  }
}
```

**AkashJS:**
```ts
import { defineStore } from '@akashjs/runtime';
import { createHttpClient } from '@akashjs/http';

const http = createHttpClient({ baseUrl: '/api' });

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
  }),
  getters: {
    isLoggedIn: (state) => state.user() !== null,
  },
  actions: {
    async login(email: string, password: string) {
      const res = await http.post<{ user: User; token: string }>('/login', { email, password });
      this.user.set(res.user);
    },
  },
});
```

### 3. HTTP Request with RxJS vs Signals

**Angular:**
```ts
this.http.get<User[]>('/api/users').pipe(
  map(users => users.filter(u => u.active)),
  catchError(err => {
    console.error(err);
    return of([]);
  }),
).subscribe(users => {
  this.users = users;
});
```

**AkashJS:**
```ts
import { createResource } from '@akashjs/http';

const users = createResource(
  async () => {
    const all = await http.get<User[]>('/users');
    return all.filter(u => u.active);
  },
);

// users() — the data (reactive)
// users.loading() — boolean
// users.error() — Error | undefined
```

### 4. Template Control Flow

**Angular:**
```html
<div *ngIf="isLoggedIn">
  <h1>Welcome, {{ user.name }}</h1>
</div>

<ul>
  <li *ngFor="let item of items; trackBy: trackById">
    {{ item.name }}
  </li>
</ul>
```

**AkashJS:**
```html
<Show when={isLoggedIn()}>
  <h1>Welcome, {user().name}</h1>
</Show>

<For each={items()} key={(item) => item.id}>
  {(item) => <li>{item.name}</li>}
</For>
```

### 5. Reactive Forms

**Angular:**
```ts
this.form = new FormGroup({
  email: new FormControl('', [Validators.required, Validators.email]),
  password: new FormControl('', [Validators.required, Validators.minLength(8)]),
});

onSubmit() {
  if (this.form.valid) {
    this.auth.login(this.form.value.email, this.form.value.password);
  }
}
```

**AkashJS:**
```ts
import { defineForm, required, email, minLength } from '@akashjs/forms';

const form = defineForm({
  email: { initial: '', validators: [required(), email()] },
  password: { initial: '', validators: [required(), minLength(8)] },
});

await form.submit(async (values) => {
  await auth.login(values.email, values.password);
});
```

## Step-by-Step Migration Plan

::: info Recommended approach: incremental migration
Angular apps tend to be large. Migrate one module at a time.
:::

### Phase 1: Setup (1 day)
1. Install AkashJS packages alongside Angular.
2. Configure Vite with `@akashjs/vite-plugin` (you may need to run both Angular CLI and Vite during transition).
3. Set up shared TypeScript types and interfaces.

### Phase 2: Migrate Services to Stores (1-2 weeks)
1. Convert `@Injectable()` services to `defineStore()` or plain functions.
2. Replace `BehaviorSubject` / `Observable` patterns with signals.
3. Replace `HttpClient` with `createHttpClient()`.
4. Keep Angular components consuming the new stores (import them as plain TypeScript).

### Phase 3: Migrate Components Bottom-Up (2-4 weeks)
1. Start with leaf components (buttons, inputs, cards) -- convert to `.akash` SFCs.
2. Move up to feature components (forms, lists, dashboards).
3. Replace Angular template syntax (`*ngIf`, `*ngFor`, `(click)`) with AkashJS equivalents.

### Phase 4: Migrate Routing (1 week)
1. Set up `@akashjs/router` with file-based routes.
2. Convert Angular route guards to AkashJS guard functions.
3. Convert resolvers to loader functions.

### Phase 5: Remove Angular (1 day)
1. Remove `@angular/*` packages.
2. Remove `angular.json`, `polyfills.ts`, `zone.js`.
3. Clean up any remaining Angular-specific code.

::: tip What you will not miss
- No more RxJS operator chains for simple data fetching.
- No more `ngOnInit` / `ngOnDestroy` boilerplate.
- No more Zone.js and mysterious change detection cycles.
- No more NgModules and module imports.
:::
