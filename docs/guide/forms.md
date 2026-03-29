# Forms

`@akashjs/forms` provides signal-based forms with declarative validation. No `FormControl`, no `FormGroup` classes, no `Validators.required`.

## Basic Usage

```ts
import { defineForm, required, email, minLength } from '@akashjs/forms';

const form = defineForm({
  email: {
    initial: '',
    validators: [required('Email is required'), email('Invalid email')],
  },
  password: {
    initial: '',
    validators: [required('Password is required'), minLength(8, 'Min 8 characters')],
  },
});
```

## Field API

Each field is a reactive object:

```ts
form.fields.email.value();       // current value (signal)
form.fields.email.value.set(''); // set value
form.fields.email.errors();      // ['Email is required']
form.fields.email.touched();     // has been blurred
form.fields.email.dirty();       // changed from initial
form.fields.email.valid();       // no errors
form.fields.email.markTouched(); // mark as touched
form.fields.email.reset();       // reset to initial
```

## Form API

```ts
form.valid();    // all fields valid
form.dirty();    // any field dirty
form.values();   // { email: '', password: '' }
form.errors();   // { email: ['Required'], password: ['Required', 'Min 8'] }
form.reset();    // reset all fields
```

## Submitting

```ts
// Programmatic
await form.submit(async (values) => {
  await api.login(values.email, values.password);
});

// Event handler for <form>
<form onSubmit={form.handleSubmit(async (values) => {
  await api.login(values.email, values.password);
})}>
```

`submit()` touches all fields first, then only calls the handler if the form is valid.

## Template Binding

```html
<template>
  <form onSubmit={form.handleSubmit(onLogin)}>
    <input
      value={form.fields.email.value()}
      onInput={(e) => form.fields.email.value.set(e.currentTarget.value)}
      onBlur={() => form.fields.email.markTouched()}
    />
    <Show when={form.fields.email.touched() && !form.fields.email.valid()}>
      <span class="error">{form.fields.email.errors()[0]}</span>
    </Show>

    <button disabled={!form.valid()}>Login</button>
  </form>
</template>
```

## Built-in Validators

| Validator | Description |
|---|---|
| `required(msg?)` | Non-empty/non-null |
| `minLength(n, msg?)` | Minimum string length |
| `maxLength(n, msg?)` | Maximum string length |
| `min(n, msg?)` | Minimum number value |
| `max(n, msg?)` | Maximum number value |
| `pattern(regex, msg?)` | Regex match |
| `email(msg?)` | Email format |
| `custom(fn)` | Custom validation function |

## Async Validation

```ts
const form = defineForm({
  username: {
    initial: '',
    validators: [required()],
    asyncValidators: [
      async (value) => {
        const taken = await checkUsername(value);
        return taken ? 'Username taken' : null;
      },
    ],
    debounce: 300, // debounce async validators
  },
});

form.fields.username.validating(); // true while checking
```

## Form Groups (Nested)

```ts
import { defineForm, defineFormGroup, pattern } from '@akashjs/forms';

const form = defineForm({
  name: { initial: '' },
  address: defineFormGroup({
    street: { initial: '' },
    city: { initial: '' },
    zip: { initial: '', validators: [pattern(/^\d{5}$/, 'Invalid ZIP')] },
  }),
});

form.fields.address.fields.city.value();
form.values(); // { name: '', address: { street: '', city: '', zip: '' } }
```

## Zod Integration

Use existing Zod schemas for form validation with `zodFieldValidator` and `zodValidator`. Import from `@akashjs/forms/zod`.

### Per-Field Validation

`zodFieldValidator()` extracts a single field's schema and returns a synchronous validator:

```ts
import { z } from 'zod';
import { zodFieldValidator } from '@akashjs/forms/zod';
import { defineForm } from '@akashjs/forms';

const schema = z.object({
  email: z.string().email('Invalid email'),
  age: z.number().min(18, 'Must be 18+'),
});

const form = defineForm({
  email: { initial: '', validators: [zodFieldValidator(schema, 'email')] },
  age: { initial: 0, validators: [zodFieldValidator(schema, 'age')] },
});
```

For async Zod schemas (with `.refine()` or `.transform()`), use `zodAsyncFieldValidator()`:

```ts
import { zodAsyncFieldValidator } from '@akashjs/forms/zod';

const form = defineForm({
  username: {
    initial: '',
    asyncValidators: [zodAsyncFieldValidator(schema, 'username')],
  },
});
```

### Full-Form Validation

`zodValidator()` validates an entire form values object and returns errors keyed by field name:

```ts
import { zodValidator } from '@akashjs/forms/zod';

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

const validate = zodValidator(schema);
const errors = validate({ email: 'bad', name: '' });
// { email: ['Invalid email'], name: ['String must contain at least 1 character(s)'] }
```

The Zod adapter uses minimal interfaces internally, so it works with any Zod-compatible library without requiring Zod as a direct dependency.

## Schema-Driven Forms

`createFormFromSchema()` auto-generates a complete form definition from a Zod schema. Instead of defining each field manually, pass the schema and get a fully reactive form with validation wired up.

```ts
import { z } from 'zod';
import { createFormFromSchema } from '@akashjs/forms/zod';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  age: z.number().min(18, 'Must be 18+'),
  bio: z.string().max(500).optional(),
});

const form = createFormFromSchema(schema);
```

This creates a form with fields for `name`, `email`, `age`, and `bio` — each with the correct initial value (empty string for strings, 0 for numbers) and Zod validation applied automatically.

### Inspecting Schema Fields

Use `getSchemaFields()` to extract field metadata for dynamic UI generation:

```ts
import { getSchemaFields } from '@akashjs/forms/zod';

const fields = getSchemaFields(schema);
// [
//   { key: 'name', type: 'string', required: true, constraints: { min: 1 } },
//   { key: 'email', type: 'string', required: true, format: 'email' },
//   { key: 'age', type: 'number', required: true, constraints: { min: 18 } },
//   { key: 'bio', type: 'string', required: false, constraints: { max: 500 } },
// ]
```

This is useful for building form renderers that map schema metadata to UI components:

```html
<template>
  <form onSubmit={form.handleSubmit(onSave)}>
    <For each={getSchemaFields(schema)}>
      {(field) => (
        <div class="field">
          <label>{field.key}</label>
          <Show when={field.type === 'string'}>
            <input
              value={form.fields[field.key].value()}
              onInput={(e) => form.fields[field.key].value.set(e.currentTarget.value)}
              onBlur={() => form.fields[field.key].markTouched()}
            />
          </Show>
          <Show when={field.type === 'number'}>
            <input
              type="number"
              value={form.fields[field.key].value()}
              onInput={(e) => form.fields[field.key].value.set(Number(e.currentTarget.value))}
              onBlur={() => form.fields[field.key].markTouched()}
            />
          </Show>
          <Show when={form.fields[field.key].touched() && !form.fields[field.key].valid()}>
            <span class="error">{form.fields[field.key].errors()[0]}</span>
          </Show>
        </div>
      )}
    </For>
    <button disabled={!form.valid()}>Save</button>
  </form>
</template>
```

### Overriding Defaults

Pass overrides for specific fields to customize initial values or add extra validators:

```ts
const form = createFormFromSchema(schema, {
  overrides: {
    age: { initial: 25 },
    bio: { initial: 'Tell us about yourself...' },
    email: {
      asyncValidators: [
        async (value) => {
          const taken = await checkEmail(value);
          return taken ? 'Email already registered' : null;
        },
      ],
      debounce: 300,
    },
  },
});
```

Overrides are merged with the auto-generated field config, so Zod validation still applies alongside any extra validators you add.
