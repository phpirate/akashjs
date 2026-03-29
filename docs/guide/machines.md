# State Machines

Complex UI flows -- multi-step forms, file uploads, checkout processes -- often devolve into tangled boolean flags and impossible states. State machines make these flows explicit, predictable, and easy to debug.

## Why state machines?

Consider a file upload component. Without a state machine you might track `isSelecting`, `isUploading`, `hasError`, `isComplete` as separate booleans. But what happens when `isUploading` and `hasError` are both true? That combination shouldn't exist, yet nothing prevents it.

A state machine guarantees that your component is in **exactly one state** at any time, and only **declared transitions** can move it to another state.

## createMachine

`createMachine()` defines a state machine and returns a reactive machine instance.

```ts
import { createMachine } from '@akashjs/runtime';

const checkout = createMachine({
  initial: 'cart',
  context: {
    items: [],
    total: 0,
  },
  states: {
    cart: {
      on: {
        PROCEED: 'shipping',
      },
    },
    shipping: {
      on: {
        BACK: 'cart',
        SUBMIT: 'payment',
      },
    },
    payment: {
      on: {
        BACK: 'shipping',
        PAY: 'confirming',
      },
    },
    confirming: {
      on: {
        SUCCESS: 'complete',
        FAILURE: 'payment',
      },
    },
    complete: {
      type: 'final',
    },
  },
});
```

## State definitions

Each key in `states` is a state name. Its `on` property maps event names to target states (or transition objects for more control).

```ts
states: {
  idle: {
    on: {
      START: 'running',       // shorthand — just a target
      RESET: { target: 'idle' }, // object form
    },
  },
  running: {
    on: {
      PAUSE: 'paused',
      FINISH: 'done',
    },
  },
}
```

## Guards

Guards are conditions that must be true for a transition to occur. If the guard returns `false`, the transition is ignored.

```ts
const machine = createMachine({
  initial: 'form',
  context: { name: '', email: '' },
  states: {
    form: {
      on: {
        SUBMIT: {
          target: 'submitting',
          guard: (ctx) => ctx.name.length > 0 && ctx.email.includes('@'),
        },
      },
    },
    submitting: {
      on: {
        SUCCESS: 'done',
        ERROR: 'form',
      },
    },
    done: { type: 'final' },
  },
});

machine.send('SUBMIT'); // ignored if guard returns false
```

## Entry and exit actions

Run side-effects when entering or leaving a state.

```ts
states: {
  loading: {
    entry: (ctx) => {
      console.log('Started loading');
      startSpinner();
    },
    exit: (ctx) => {
      stopSpinner();
    },
    on: {
      LOADED: 'ready',
      ERROR: 'failed',
    },
  },
}
```

Actions receive the current context and can perform any side-effect. They do not modify context directly -- use transition actions for that.

## Context

Context holds the data associated with a machine. You can update context during transitions with an `action`.

```ts
const counter = createMachine({
  initial: 'active',
  context: { count: 0 },
  states: {
    active: {
      on: {
        INCREMENT: {
          target: 'active',
          action: (ctx) => ({ ...ctx, count: ctx.count + 1 }),
        },
        DECREMENT: {
          target: 'active',
          action: (ctx) => ({ ...ctx, count: ctx.count - 1 }),
        },
        RESET: {
          target: 'active',
          action: () => ({ count: 0 }),
        },
      },
    },
  },
});

counter.send('INCREMENT');
counter.send('INCREMENT');
console.log(counter.context().count); // 2
```

## Final states

A state with `type: 'final'` signals that the machine has reached a terminal state. No further transitions are possible.

```ts
states: {
  complete: {
    type: 'final',
    entry: (ctx) => {
      console.log('Process finished with:', ctx);
    },
  },
}
```

## Machine API

The object returned by `createMachine()` exposes these reactive methods and signals:

| Method / Signal | Type | Description |
|---|---|---|
| `state()` | `() => string` | Reactive signal returning the current state name |
| `context()` | `() => T` | Reactive signal returning the current context |
| `send(event)` | `(event: string, payload?: any) => void` | Send an event to trigger a transition |
| `matches(state)` | `(state: string) => boolean` | Check if the machine is in a specific state |
| `can(event)` | `(event: string) => boolean` | Check if an event would trigger a valid transition |
| `nextEvents()` | `() => string[]` | List events available in the current state |
| `history()` | `() => string[]` | Array of previously visited state names |
| `reset()` | `() => void` | Reset to the initial state and original context |

### Usage examples

```ts
const machine = createMachine({ /* ... */ });

// Reactive state reads
effect(() => {
  console.log('Current state:', machine.state());
});

// Conditional rendering
if (machine.matches('loading')) {
  showSpinner();
}

// Guard UI elements
const canSubmit = machine.can('SUBMIT');

// Show available actions
console.log(machine.nextEvents()); // ['SUBMIT', 'CANCEL']

// Debug with history
console.log(machine.history()); // ['idle', 'loading', 'error']

// Start over
machine.reset();
```

## Real-world example: file upload

A complete file upload flow with idle, selecting, uploading, complete, and error states.

```ts
import { createMachine } from '@akashjs/runtime';

interface UploadContext {
  file: File | null;
  progress: number;
  error: string | null;
  url: string | null;
}

const upload = createMachine({
  initial: 'idle',
  context: {
    file: null,
    progress: 0,
    error: null,
    url: null,
  } as UploadContext,
  states: {
    idle: {
      on: {
        SELECT: {
          target: 'selecting',
        },
      },
    },
    selecting: {
      on: {
        FILE_CHOSEN: {
          target: 'uploading',
          guard: (ctx, event) => event.file.size < 10_000_000,
          action: (ctx, event) => ({
            ...ctx,
            file: event.file,
            progress: 0,
            error: null,
          }),
        },
        CANCEL: 'idle',
      },
    },
    uploading: {
      entry: async (ctx) => {
        // Start the upload
        const formData = new FormData();
        formData.append('file', ctx.file!);
        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
          const data = await res.json();
          upload.send('DONE', { url: data.url });
        } catch (e) {
          upload.send('FAIL', { error: (e as Error).message });
        }
      },
      on: {
        PROGRESS: {
          target: 'uploading',
          action: (ctx, event) => ({ ...ctx, progress: event.percent }),
        },
        DONE: {
          target: 'complete',
          action: (ctx, event) => ({ ...ctx, url: event.url, progress: 100 }),
        },
        FAIL: {
          target: 'error',
          action: (ctx, event) => ({ ...ctx, error: event.error }),
        },
      },
    },
    complete: {
      type: 'final',
      entry: (ctx) => {
        console.log('Upload complete:', ctx.url);
      },
    },
    error: {
      on: {
        RETRY: {
          target: 'uploading',
          action: (ctx) => ({ ...ctx, error: null, progress: 0 }),
        },
        CANCEL: {
          target: 'idle',
          action: () => ({
            file: null,
            progress: 0,
            error: null,
            url: null,
          }),
        },
      },
    },
  },
});

// Use in your component
effect(() => {
  const s = upload.state();
  if (upload.matches('uploading')) {
    console.log(`Uploading... ${upload.context().progress}%`);
  }
  if (upload.matches('error')) {
    console.log(`Failed: ${upload.context().error}`);
  }
});
```
