# Testing Best Practices

## Testing Pyramid

Structure your tests in three layers:

```
        ┌─────────┐
        │   E2E   │  Few — critical user flows
        ├─────────┤
        │  Integ  │  Some — component interactions
        ├─────────┤
        │  Unit   │  Many — signals, stores, utils
        └─────────┘
```

| Layer | What to test | Tool | Speed |
|---|---|---|---|
| **Unit** | Signals, computed, stores, utils, validators | Vitest | ~1ms per test |
| **Integration** | Mounted components, user interactions, form flows | Vitest + `mount()` | ~10ms per test |
| **E2E** | Full user journeys (login, checkout, navigation) | Playwright | ~1-5s per test |

::: tip Test behavior, not implementation
Do not test internal signal values. Test what the user sees and does.
:::

```ts
// DON'T: test implementation details
it('sets the count signal to 1', () => {
  const { component } = mount(Counter);
  // reaching into internal signals is fragile
  expect(component.__internal_count()).toBe(0);
});
```

```ts
// DO: test user-visible behavior
it('increments the displayed count on click', async () => {
  const { getByRole, getByText, unmount } = mount(Counter, { props: { initial: 0 } });
  await fireEvent.click(getByRole('button'));
  expect(getByText('Count: 1')).toBeTruthy();
  unmount();
});
```

## Unit Testing Signals and Stores

Signals and stores are plain TypeScript -- test them without mounting any component.

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { signal, computed, batch } from '@akashjs/runtime';
import { clearStores } from '@akashjs/runtime';
import { useCartStore } from '@/stores/cart.store';

beforeEach(() => {
  clearStores();
});

describe('useCartStore', () => {
  it('starts empty', () => {
    const cart = useCartStore();
    expect(cart.items()).toEqual([]);
    expect(cart.totalItems()).toBe(0);
  });

  it('adds items', () => {
    const cart = useCartStore();
    cart.addItem('abc');
    expect(cart.totalItems()).toBe(1);
  });

  it('increments existing items', () => {
    const cart = useCartStore();
    cart.addItem('abc');
    cart.addItem('abc');
    expect(cart.items()).toHaveLength(1);
    expect(cart.items()[0].qty).toBe(2);
  });

  it('resets to initial state', () => {
    const cart = useCartStore();
    cart.addItem('abc');
    cart.$reset();
    expect(cart.items()).toEqual([]);
  });
});
```

## Integration Testing with mount()

Use `mount()` to render a component into a detached DOM and query it.

```ts
import { describe, it, expect } from 'vitest';
import { mount, fireEvent } from '@akashjs/runtime/test';
import LoginForm from './LoginForm.akash';

describe('LoginForm', () => {
  it('disables submit when form is invalid', () => {
    const { query, unmount } = mount(LoginForm);
    const button = query('button[type="submit"]');
    expect(button?.disabled).toBe(true);
    unmount();
  });

  it('enables submit when fields are filled', async () => {
    const { query, unmount } = mount(LoginForm);

    await fireEvent.input(query('input[name="email"]')!, 'alice@test.com');
    await fireEvent.input(query('input[name="password"]')!, 'password123');

    const button = query('button[type="submit"]');
    expect(button?.disabled).toBe(false);
    unmount();
  });

  it('calls onSubmit with form values', async () => {
    const handler = vi.fn();
    const { query, unmount } = mount(LoginForm, { props: { onSubmit: handler } });

    await fireEvent.input(query('input[name="email"]')!, 'alice@test.com');
    await fireEvent.input(query('input[name="password"]')!, 'password123');
    await fireEvent.submit(query('form')!);

    expect(handler).toHaveBeenCalledWith({
      email: 'alice@test.com',
      password: 'password123',
    });
    unmount();
  });
});
```

::: tip Always call unmount()
Forgetting to unmount leaks DOM nodes and effects between tests. Call `unmount()` in each test or use `afterEach`.
:::

## Mocking Stores

Use `provide` in mount options to inject mock values via context:

```ts
import { mount } from '@akashjs/runtime/test';
import { ThemeContext } from '@/contexts/theme';
import ThemedButton from './ThemedButton.akash';

it('renders with dark theme', () => {
  const { query, unmount } = mount(ThemedButton, {
    provide: new Map([[ThemeContext, 'dark']]),
  });

  expect(query('.btn')?.classList.contains('dark')).toBe(true);
  unmount();
});
```

For stores, clear and pre-populate:

```ts
import { clearStores } from '@akashjs/runtime';
import { useAuthStore } from '@/stores/auth.store';

beforeEach(() => {
  clearStores();
});

it('shows user name when logged in', () => {
  const auth = useAuthStore();
  auth.setCredentials({ name: 'Alice' }, 'token-123');

  const { getByText, unmount } = mount(UserBadge);
  expect(getByText('Alice')).toBeTruthy();
  unmount();
});
```

## Testing Async Operations

Use `await` with `fireEvent` to wait for effects to flush, and use `vi.fn()` for mocking async calls.

```ts
it('loads data and renders', async () => {
  vi.spyOn(http, 'get').mockResolvedValue([
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' },
  ]);

  const { getByText, unmount } = mount(UserList);

  // Wait for the resource to resolve
  await vi.waitFor(() => {
    expect(getByText('Alice')).toBeTruthy();
  });

  expect(getByText('Bob')).toBeTruthy();
  unmount();
});
```

## Testing Forms

Forms are signal-based -- test the form object directly for unit tests.

```ts
import { defineForm, required, email } from '@akashjs/forms';

describe('signup form validation', () => {
  it('rejects empty email', async () => {
    const form = defineForm({
      email: { initial: '', validators: [required(), email()] },
    });

    const handler = vi.fn();
    await form.submit(handler);
    expect(handler).not.toHaveBeenCalled();
    expect(form.fields.email.errors()).toContain('Required');
  });

  it('accepts valid email', async () => {
    const form = defineForm({
      email: { initial: 'a@b.com', validators: [required(), email()] },
    });

    const handler = vi.fn();
    await form.submit(handler);
    expect(handler).toHaveBeenCalledWith({ email: 'a@b.com' });
  });
});
```

## Test File Structure

Co-locate tests with source files:

```
features/
  dashboard/
    Dashboard.akash
    Dashboard.test.ts       ← integration test
    dashboard.store.ts
    dashboard.store.test.ts ← unit test
```

Or use a `__tests__` directory if you prefer separation:

```
features/
  dashboard/
    __tests__/
      Dashboard.test.ts
      dashboard.store.test.ts
    Dashboard.akash
    dashboard.store.ts
```

## Snapshot Testing Signals

Snapshots work well for store state:

```ts
it('matches snapshot after operations', () => {
  const store = useCartStore();
  store.addItem('product-1');
  store.addItem('product-2');
  store.addItem('product-1');

  expect(store.$snapshot()).toMatchInlineSnapshot(`
    {
      "items": [
        { "id": "product-1", "qty": 2 },
        { "id": "product-2", "qty": 1 },
      ],
    }
  `);
});
```

::: warning Do not snapshot DOM output
DOM snapshots are brittle and fail on every markup change. Test behavior instead.
:::

## Leak Detection in Tests

Enable leak detection in test setup to catch effects that are not cleaned up:

```ts
import { enableLeakDetection, checkForLeaks } from '@akashjs/runtime';

beforeAll(() => {
  enableLeakDetection();
});

afterEach(() => {
  const leaks = checkForLeaks(5000);
  if (leaks.length > 0) {
    console.warn('Leaked effects:', leaks);
  }
  expect(leaks).toHaveLength(0);
});
```
