# Advanced Form Patterns

## Problem

You need complex forms: multi-step wizards, dynamic array fields, dependent validation, Zod schemas, and file inputs.

## Solution

Combine `defineForm` from `@akashjs/forms` with `createMachine` for wizard flows and `zodFieldValidator` for schema-based validation.

### 1. Multi-Step Wizard with State Machine

```ts
// src/forms/checkout-wizard.ts
import { createMachine } from '@akashjs/runtime';
import { defineForm } from '@akashjs/forms';
import { required, email, minLength } from '@akashjs/forms/validators';

type Step = 'account' | 'shipping' | 'payment' | 'review';
type Event = 'NEXT' | 'BACK';

const wizard = createMachine<Step, Event>({
  initial: 'account',
  states: {
    account: { on: { NEXT: 'shipping' } },
    shipping: { on: { NEXT: 'payment', BACK: 'account' } },
    payment: { on: { NEXT: 'review', BACK: 'shipping' } },
    review: { on: { BACK: 'payment' }, type: 'final' },
  },
});

// One form per step
const accountForm = defineForm({
  email: { initial: '', validators: [required(), email()] },
  password: { initial: '', validators: [required(), minLength(8)] },
});

const shippingForm = defineForm({
  address: { initial: '', validators: [required()] },
  city: { initial: '', validators: [required()] },
  zip: { initial: '', validators: [required()] },
});

const paymentForm = defineForm({
  cardNumber: { initial: '', validators: [required(), minLength(16)] },
  expiry: { initial: '', validators: [required()] },
  cvv: { initial: '', validators: [required(), minLength(3)] },
});

function nextStep() {
  const step = wizard.state();
  const form = { account: accountForm, shipping: shippingForm, payment: paymentForm }[step];
  if (form && !form.valid()) return; // Block advance if invalid
  wizard.send('NEXT');
}

function prevStep() { wizard.send('BACK'); }
```

```html
<div class="wizard">
  <nav class="wizard-steps">
    <span :class="{ active: wizard.matches('account') }">Account</span>
    <span :class="{ active: wizard.matches('shipping') }">Shipping</span>
    <span :class="{ active: wizard.matches('payment') }">Payment</span>
    <span :class="{ active: wizard.matches('review') }">Review</span>
  </nav>

  <form :if={wizard.matches('account')} @submit|preventDefault={nextStep}>
    <input :value={accountForm.fields.email.value}
           @input={e => accountForm.fields.email.set(e.target.value)}
           placeholder="Email" />
    <input type="password" :value={accountForm.fields.password.value}
           @input={e => accountForm.fields.password.set(e.target.value)}
           placeholder="Password" />
    <button type="submit">Next</button>
  </form>

  <!-- Similar for shipping, payment, review steps -->
</div>
```

::: tip
Using a state machine for wizard navigation prevents users from skipping steps or reaching invalid states via browser history.
:::

### 2. Dynamic Array Fields (Add/Remove)

```ts
import { signal } from '@akashjs/runtime';
import { defineForm } from '@akashjs/forms';
import { required } from '@akashjs/forms/validators';

interface LineItem { name: string; qty: number; price: number; }

const items = signal<LineItem[]>([
  { name: '', qty: 1, price: 0 },
]);

function addItem() {
  items.update((list) => [...list, { name: '', qty: 1, price: 0 }]);
}

function removeItem(index: number) {
  items.update((list) => list.filter((_, i) => i !== index));
}

function updateItem(index: number, field: keyof LineItem, value: any) {
  items.update((list) =>
    list.map((item, i) => (i === index ? { ...item, [field]: value } : item))
  );
}

// Computed total
const total = computed(() =>
  items().reduce((sum, item) => sum + item.qty * item.price, 0)
);
```

```html
<div :for={(item, index) of items()} :key={index} class="line-item">
  <input :value={item.name} @input={e => updateItem(index, 'name', e.target.value)} />
  <input type="number" :value={item.qty} @input={e => updateItem(index, 'qty', +e.target.value)} />
  <input type="number" :value={item.price} @input={e => updateItem(index, 'price', +e.target.value)} />
  <button @click={() => removeItem(index)}>Remove</button>
</div>
<button @click={addItem}>+ Add Item</button>
<p>Total: ${total().toFixed(2)}</p>
```

### 3. Dependent Validation

```ts
const form = defineForm({
  password: { initial: '', validators: [required(), minLength(8)] },
  confirmPassword: {
    initial: '',
    validators: [
      required(),
      (value) => {
        const pw = form.fields.password.value();
        return value === pw ? null : 'Passwords do not match';
      },
    ],
  },
});
```

::: warning
Dependent validators reference other fields directly. The validation re-runs whenever the field value changes, but not when the dependency changes. Call `form.fields.confirmPassword.validate()` manually after the password field updates.
:::

### 4. Form from Zod Schema

```ts
import { z } from 'zod';
import { defineForm } from '@akashjs/forms';
import { zodFieldValidator } from '@akashjs/forms/zod';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  age: z.number().min(18, 'Must be at least 18'),
  website: z.string().url('Invalid URL').optional(),
});

const form = defineForm({
  name: { initial: '', validators: [zodFieldValidator(schema, 'name')] },
  email: { initial: '', validators: [zodFieldValidator(schema, 'email')] },
  age: { initial: 0, validators: [zodFieldValidator(schema, 'age')] },
  website: { initial: '', validators: [zodFieldValidator(schema, 'website')] },
});
```

### 5. Server-Side Validation

```ts
import { signal } from '@akashjs/runtime';

const serverErrors = signal<Record<string, string[]>>({});

async function handleSubmit(values) {
  try {
    await http.post('/api/register', values);
  } catch (err) {
    if (err.status === 422) {
      serverErrors.set(err.body.errors);
      // { email: ['Email already taken'], name: ['Name contains invalid characters'] }
    }
  }
}
```

```html
<span :if={serverErrors().email} class="error">{serverErrors().email[0]}</span>
```

### 6. File Input Handling

```ts
const selectedFile = signal<File | null>(null);
const preview = signal<string | null>(null);

function handleFileSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0] ?? null;
  selectedFile.set(file);

  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = () => preview.set(reader.result as string);
    reader.readAsDataURL(file);
  }
}

async function uploadWithForm(values) {
  const formData = new FormData();
  Object.entries(values).forEach(([k, v]) => formData.append(k, v));
  if (selectedFile()) formData.append('avatar', selectedFile());
  await fetch('/api/profile', { method: 'POST', body: formData });
}
```

```html
<input type="file" accept="image/*" @change={handleFileSelect} />
<img :if={preview()} :src={preview()} alt="Preview" class="avatar-preview" />
```

::: info
Use `FormData` instead of JSON when uploading files. Do not set the `Content-Type` header manually; the browser sets the correct multipart boundary.
:::

## Result

A toolkit for complex forms: state-machine-driven wizards that prevent invalid navigation, dynamic array fields with computed totals, cross-field validation, Zod schema integration, server error handling, and file uploads with preview.
