# @akashjs/forms API

## defineForm(config)

Create a reactive form.

```ts
function defineForm<T extends Record<string, FieldConfig<any> | FormGroup<any>>>(
  config: T,
): Form<T>;

interface Form<T> {
  fields: FormFields<T>;
  valid: () => boolean;
  dirty: () => boolean;
  values: () => FieldValues<T>;
  errors: () => Partial<Record<keyof T, string[]>>;
  submit(handler: (values: FieldValues<T>) => void | Promise<void>): Promise<void>;
  reset(): void;
  handleSubmit(handler: (values) => void | Promise<void>): (e: Event) => void;
}
```

## defineFormGroup(config)

Create a nested form group for use inside `defineForm()`.

```ts
function defineFormGroup<T>(config: T): FormGroup<T>;
```

## createField(config)

Create a single reactive field (advanced usage).

```ts
function createField<T>(config: FieldConfig<T>): FormField<T>;

interface FormField<T> {
  value: Signal<T>;
  errors: () => string[];
  touched: () => boolean;
  dirty: () => boolean;
  valid: () => boolean;
  validating: () => boolean;
  markTouched(): void;
  reset(): void;
}
```

## Built-in Validators

All validators are factory functions returning `(value: T) => string | null`.

| Function | Signature |
|---|---|
| `required(msg?)` | `Validator<unknown>` |
| `minLength(n, msg?)` | `Validator<string>` |
| `maxLength(n, msg?)` | `Validator<string>` |
| `min(n, msg?)` | `Validator<number>` |
| `max(n, msg?)` | `Validator<number>` |
| `pattern(regex, msg?)` | `Validator<string>` |
| `email(msg?)` | `Validator<string>` |
| `custom(fn)` | `Validator<T>` |

## Types

### FieldConfig

```ts
interface FieldConfig<T> {
  initial: T;
  validators?: Validator<T>[];
  asyncValidators?: AsyncValidator<T>[];
  debounce?: number;
}
```

### Validator / AsyncValidator

```ts
type Validator<T> = (value: T) => string | null;
type AsyncValidator<T> = (value: T) => Promise<string | null>;
```

## Zod Adapter

Integrate [Zod](https://zod.dev) schemas with AkashJS form validation.

### zodFieldValidator(schema, field)

Create a synchronous field validator from a Zod schema.

```ts
function zodFieldValidator<T>(schema: ZodType, field: string): Validator<T>;
```

### zodAsyncFieldValidator(schema, field)

Create an async field validator from a Zod schema (for schemas with `.refine()` or `.transform()`).

```ts
function zodAsyncFieldValidator<T>(schema: ZodType, field: string): AsyncValidator<T>;
```

### zodValidator(schema)

Create a whole-form validator from a Zod object schema. Validates all fields at once on submit.

```ts
function zodValidator<T extends Record<string, unknown>>(
  schema: ZodObject<any>,
): (values: T) => Record<string, string[]>;
```

## Schema Forms

### createFormFromSchema(schema, overrides?)

Generate a complete `Form` from a Zod schema. Each schema field is mapped to a form field with validators derived from the schema constraints. Optional `overrides` let you customize individual fields.

```ts
function createFormFromSchema<T extends Record<string, unknown>>(
  schema: ZodObject<any>,
  overrides?: Partial<Record<keyof T, Partial<FieldConfig<any>>>>,
): Form<Record<keyof T, FieldConfig<any>>>;
```

### getSchemaFields(schema)

Extract field metadata from a Zod schema. Useful for rendering dynamic form UIs.

```ts
function getSchemaFields(schema: ZodObject<any>): Array<{
  name: string;
  type: string;
  required: boolean;
  default?: unknown;
  constraints: Record<string, unknown>;
}>;
```
