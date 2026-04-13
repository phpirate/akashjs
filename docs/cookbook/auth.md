# Authentication Flow

## Problem

You need a complete auth system: login page, protected routes, automatic token refresh, logout, "remember me", and role-based access control.

## Solution

Use `createAuth` from `@akashjs/http` for token management and pair it with the router guard for protected routes.

### 1. Auth Setup

```ts
// src/auth.ts
import { createAuth } from '@akashjs/http';
import { signal, computed } from '@akashjs/runtime';

export const auth = createAuth({
  loginUrl: '/api/auth/login',
  refreshUrl: '/api/auth/refresh',
  userUrl: '/api/auth/me',
  tokenStorage: 'localStorage', // "remember me" default
  getToken: (res) => res.access_token,
  getRefreshToken: (res) => res.refresh_token,
  getUser: (res) => res.user,
});

// Role-based access helper
export function hasRole(role: string): boolean {
  const user = auth.user();
  return user?.roles?.includes(role) ?? false;
}

export function requireRole(role: string, redirectTo = '/unauthorized') {
  return (ctx) => {
    if (!auth.isLoggedIn()) return ctx.redirect('/login');
    if (!hasRole(role)) return ctx.redirect(redirectTo);
  };
}
```

### 2. HTTP Client with Auth Interceptor

```ts
// src/http.ts
import { createHttpClient } from '@akashjs/http';
import { auth } from './auth';

export const http = createHttpClient({
  baseUrl: '/api',
  interceptors: [auth.interceptor],
});
```

::: tip
The auth interceptor automatically attaches the Bearer token to every request and handles 401 responses by refreshing the token and retrying.
:::

### 3. Login Page

```ts
// src/pages/login.ts
import { defineForm, required, email } from '@akashjs/forms';
import { signal } from '@akashjs/runtime';
import { auth } from '../auth';

const rememberMe = signal(true);
const serverError = signal('');

const form = defineForm({
  email: { initial: '', validators: [required(), email()] },
  password: { initial: '', validators: [required()] },
});

async function handleLogin(values) {
  serverError.set('');
  try {
    // Switch storage based on "remember me"
    auth.setToken(''); // Clear first
    await auth.login({ ...values, remember: rememberMe() });
    router.navigate('/dashboard');
  } catch (err) {
    serverError.set('Invalid email or password');
  }
}
```

```html
<form @submit={form.handleSubmit(handleLogin)}>
  <input type="email" :value={form.fields.email.value}
         @input={e => form.fields.email.set(e.target.value)}
         placeholder="Email" />
  <span class="error" :if={form.fields.email.touched() && !form.fields.email.valid()}>
    {form.fields.email.errors()[0]}
  </span>

  <input type="password" :value={form.fields.password.value}
         @input={e => form.fields.password.set(e.target.value)}
         placeholder="Password" />

  <label>
    <input type="checkbox" :checked={rememberMe}
           @change={e => rememberMe.set(e.target.checked)} />
    Remember me
  </label>

  <span class="error" :if={serverError()}>{serverError()}</span>

  <button type="submit" :disabled={auth.loading()}>
    {auth.loading() ? 'Signing in...' : 'Sign In'}
  </button>
</form>
```

### 4. Router with Guards

```ts
// src/router.ts
import { createRouter } from '@akashjs/router';
import { auth, requireRole } from './auth';

const routes = [
  { path: '/login', component: LoginPage },
  { path: '/dashboard', component: Dashboard, guard: auth.guard('/login') },
  { path: '/admin', component: AdminPanel, guard: requireRole('admin') },
  { path: '/unauthorized', component: UnauthorizedPage },
];

export const router = createRouter(routes);
```

### 5. Logout

```ts
function logout() {
  auth.logout(); // Clears tokens and user state
  router.navigate('/login');
}
```

::: warning
Always call `auth.logout()` rather than manually clearing localStorage. It resets all reactive state (user, token, isLoggedIn) so your UI updates immediately.
:::

### 6. Restore Session on App Start

```ts
// src/main.ts
import { auth } from './auth';

// If a token exists in storage, fetch the user profile
if (auth.token()) {
  auth.fetchUser().catch(() => auth.logout());
}
```

## Result

A full auth system with login, automatic token refresh on 401, "remember me" via storage selection, role-based route guards, and clean logout. The reactive signals mean your navbar, guards, and conditional UI all update instantly when auth state changes.
