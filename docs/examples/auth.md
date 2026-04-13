# Auth Flow

A complete authentication flow with login, signup, protected routes, and session management. Demonstrates `createAuth`, route guards, and reactive auth state.

## Auth Setup

Create `src/lib/auth.ts`:

```ts
import { createAuth } from '@akashjs/http';

export const auth = createAuth<{ id: number; name: string; email: string }>({
  loginUrl: '/api/auth/login',
  signupUrl: '/api/auth/signup',
  userUrl: '/api/auth/me',
  forgotPasswordUrl: '/api/auth/forgot-password',
  resetPasswordUrl: '/api/auth/reset-password',

  mode: 'cookie',          // httpOnly cookies — no token stored client-side
  autoRestore: true,        // restore session on page load

  getUser: (res) => res,    // extract user from login/me response

  onSessionExpired: () => {
    window.location.href = '/login';
  },
});
```

## HTTP Client with Auth

Create `src/lib/http.ts`:

```ts
import { createHttpClient, createQueryClient } from '@akashjs/http';
import { auth } from './auth';

export const http = createHttpClient({
  baseUrl: '/api',
  credentials: 'include',
  interceptors: [auth.interceptor], // adds auth header, handles 401 refresh
});

export const queryClient = createQueryClient({
  defaultStaleTime: 30_000,
});
```

## Route Guard

Create `src/routes/dashboard/guard.ts`:

```ts
export const guard = auth.guard('/login');
```

That's it — one line. `auth.guard('/login')` redirects unauthenticated users to `/login`.

## Login Page

Create `src/routes/login/page.akash`:

```html
<script lang="ts">
import { signal } from '@akashjs/runtime';
import { useNavigate } from '@akashjs/router';
import { auth } from '@/lib/auth';

const email = signal('');
const password = signal('');
const error = signal('');
const navigate = useNavigate();

async function handleLogin() {
  error.set('');
  try {
    await auth.login({ email: email(), password: password() });
    navigate('/dashboard');
  } catch (err) {
    error.set(err instanceof Error ? err.message : 'Login failed');
  }
}
</script>

<template>
  <div class="auth-page">
    <h1>Sign In</h1>

    <Show when={error()}>
      {() => <div class="error">{error()}</div>}
    </Show>

    <form onSubmit|preventDefault={handleLogin}>
      <label>
        Email
        <input type="email" bind:value={email} required />
      </label>

      <label>
        Password
        <input type="password" bind:value={password} required />
      </label>

      <button type="submit" disabled={auth.loading()}>
        {auth.loading() ? 'Signing in...' : 'Sign In'}
      </button>
    </form>

    <p class="links">
      <Link to="/signup">Create account</Link>
      <Link to="/forgot-password">Forgot password?</Link>
    </p>
  </div>
</template>

<style scoped>
.auth-page {
  max-width: 400px;
  margin: 4rem auto;
  padding: 2rem;
  font-family: system-ui, sans-serif;
}

form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
}

input {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
}

button {
  padding: 0.75rem;
  background: #6750a4;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
}

button:disabled { opacity: 0.6; cursor: wait; }

.error {
  padding: 0.75rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.links {
  text-align: center;
  margin-top: 1rem;
  display: flex;
  justify-content: space-between;
}

.links a { color: #6750a4; }
</style>
```

## Dashboard (Protected)

Create `src/routes/dashboard/page.akash`:

```html
<script lang="ts">
import { auth } from '@/lib/auth';
import { useCachedQuery } from '@akashjs/http';
import { http, queryClient } from '@/lib/http';

// This page is protected by guard.ts — auth.user() is guaranteed to exist
const user = auth.user;

const stats = useCachedQuery(queryClient, ['dashboard-stats'], () =>
  http.get('/dashboard/stats'),
);
</script>

<template>
  <div class="dashboard">
    <header>
      <h1>Dashboard</h1>
      <div class="user-info">
        <span>Welcome, {user()?.name}</span>
        <button onClick={() => auth.logout()}>Sign Out</button>
      </div>
    </header>

    <Show when={stats.loading()}>
      {() => <p>Loading dashboard...</p>}
    </Show>

    <Show when={stats()}>
      {() => (
        <div class="stats-grid">
          <div class="stat-card">
            <h3>Total Users</h3>
            <p class="value">{stats()?.totalUsers}</p>
          </div>
          <div class="stat-card">
            <h3>Active Today</h3>
            <p class="value">{stats()?.activeToday}</p>
          </div>
          <div class="stat-card">
            <h3>Revenue</h3>
            <p class="value">${stats()?.revenue}</p>
          </div>
        </div>
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

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-info button {
  padding: 0.5rem 1rem;
  background: none;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.stat-card {
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 12px;
  text-align: center;
}

.stat-card h3 {
  color: #666;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.value {
  font-size: 2rem;
  font-weight: 700;
  color: #6750a4;
}
</style>
```

## What This Demonstrates

- **`createAuth`** — complete auth setup in one call
  - `mode: 'cookie'` — secure httpOnly cookie auth
  - `autoRestore: true` — session survives page refresh
  - `onSessionExpired` — redirect on expired session
- **`auth.interceptor`** — auto-attaches credentials, handles 401 with token refresh
- **`auth.guard('/login')`** — one-line route protection
- **`auth.login()`** — async login with loading state
- **`auth.user()`** — reactive user signal
- **`auth.loading()`** — loading state for disabled button
- **`auth.logout()`** — clears session
- **`useCachedQuery`** — fetch dashboard data with cache
- **File-based routing** — `/login`, `/dashboard` auto-discovered
- **Guard convention** — `guard.ts` alongside `page.akash`
