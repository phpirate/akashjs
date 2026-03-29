# Pipes

Pipes are pure transform functions for display values. They take a value in, return a formatted value out. Use them in templates, in script, or chain them together.

## pipe()

The `pipe()` function applies a transform to a value:

```ts
import { pipe, uppercase, currency, date } from '@akashjs/runtime';

pipe('hello', uppercase);                // 'HELLO'
pipe(1234.5, currency, 'USD');           // '$1,234.50'
pipe(new Date(), date, 'long');          // 'March 29, 2026'
```

The first argument is the value, the second is the transform function, and any remaining arguments are passed to the transform.

## Using in Templates

Inside `.akash` templates, call `pipe()` directly in expressions:

```html
<script lang="ts">
import { signal } from '@akashjs/runtime';
import { pipe, uppercase, currency } from '@akashjs/runtime';

const name = signal('john');
const price = signal(29.99);
</script>

<template>
  <h1>{pipe(name(), uppercase)}</h1>
  <p>Price: {pipe(price(), currency, 'USD')}</p>
</template>
```

## Built-in Pipes

| Pipe | Input | Example | Output |
|---|---|---|---|
| `uppercase` | `string` | `pipe('hello', uppercase)` | `'HELLO'` |
| `lowercase` | `string` | `pipe('HELLO', lowercase)` | `'hello'` |
| `capitalize` | `string` | `pipe('hello', capitalize)` | `'Hello'` |
| `titleCase` | `string` | `pipe('hello world', titleCase)` | `'Hello World'` |
| `trim` | `string` | `pipe('  hi  ', trim)` | `'hi'` |
| `truncate` | `string` | `pipe('Hello World', truncate, 8)` | `'Hello...'` |
| `date` | `Date \| string \| number` | `pipe(new Date(), date, 'short')` | `'3/29/26'` |
| `currency` | `number` | `pipe(1234.5, currency, 'EUR')` | `'€1,234.50'` |
| `number` | `number` | `pipe(1234567.89, number)` | `'1,234,567.89'` |
| `percent` | `number` | `pipe(0.85, percent)` | `'85%'` |
| `json` | `unknown` | `pipe({ a: 1 }, json)` | `'{\n  "a": 1\n}'` |
| `plural` | `number` | `pipe(5, plural, 'item', 'items')` | `'5 items'` |
| `relativeTime` | `Date \| number` | `pipe(Date.now() - 60000, relativeTime)` | `'1 minute ago'` |

### Date Formats

The `date` pipe accepts a format argument:

```ts
pipe(new Date(), date);             // '3/29/2026'     (medium, default)
pipe(new Date(), date, 'short');    // '3/29/26'
pipe(new Date(), date, 'long');     // 'March 29, 2026'
pipe(new Date(), date, 'full');     // 'Sunday, March 29, 2026'
pipe(new Date(), date, 'time');     // '2:30 PM'
pipe(new Date(), date, 'iso');      // '2026-03-29T...'
```

An optional locale can be passed as the third argument:

```ts
pipe(new Date(), date, 'long', 'de-DE');  // '29. März 2026'
```

### Number Formatting

The `number` pipe accepts a `digitsInfo` string in `"min-max"` format:

```ts
pipe(3.14159, number, '0-2');  // '3.14'
pipe(3.1, number, '2-2');     // '3.10'
```

### Truncate Options

```ts
pipe('Hello World', truncate, 8);           // 'Hello...'
pipe('Hello World', truncate, 8, '…');      // 'Hello W…'
```

## Custom Pipes with definePipe()

Create your own pipes with `definePipe()`:

```ts
import { definePipe, pipe } from '@akashjs/runtime';

const reverse = definePipe<string, string>((value) =>
  value.split('').reverse().join('')
);

pipe('hello', reverse);  // 'olleh'
```

A pipe with extra arguments:

```ts
const wrap = definePipe<string, string>((value, left: string, right: string) =>
  `${left}${value}${right}`
);

pipe('hello', wrap, '[', ']');  // '[hello]'
```

## Chaining with chain()

Combine multiple pipes into a single transform using `chain()`:

```ts
import { chain, trim, capitalize, truncate } from '@akashjs/runtime';

const format = chain(trim, capitalize, truncate);

format('  hello world  ', 10);  // 'Hello w...'
```

Use the chained pipe in templates:

```html
<script lang="ts">
import { chain, trim, capitalize } from '@akashjs/runtime';

const cleanName = chain(trim, capitalize);
</script>

<template>
  <p>{cleanName(rawInput())}</p>
</template>
```

## Type Signature

```ts
type PipeFn<TIn = any, TOut = any> = (value: TIn, ...args: any[]) => TOut;

function pipe<TIn, TOut>(value: TIn, transform: PipeFn<TIn, TOut>, ...args: any[]): TOut;
function chain<T>(...pipes: PipeFn[]): PipeFn<T, any>;
function definePipe<TIn, TOut>(fn: PipeFn<TIn, TOut>): PipeFn<TIn, TOut>;
```
