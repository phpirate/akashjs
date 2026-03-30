/**
 * State machines for complex UI flows.
 *
 * Finite state machines with typed states, events, guards,
 * actions, and reactive current state signal.
 *
 * ```ts
 * const checkout = createMachine({
 *   initial: 'cart',
 *   states: {
 *     cart: { on: { CHECKOUT: 'shipping' } },
 *     shipping: { on: { NEXT: 'payment', BACK: 'cart' } },
 *     payment: { on: { PAY: 'processing', BACK: 'shipping' } },
 *     processing: { on: { SUCCESS: 'complete', FAIL: 'payment' } },
 *     complete: { type: 'final' },
 *   },
 * });
 *
 * checkout.state();  // 'cart'
 * checkout.send('CHECKOUT');
 * checkout.state();  // 'shipping'
 * checkout.matches('shipping'); // true
 * ```
 */

import { signal, computed } from './signals.js';
import type { ReadonlySignal } from './signals.js';

// =========================================================================
// Types
// =========================================================================

export interface MachineConfig<TState extends string, TEvent extends string, TContext = unknown> {
  /** Initial state */
  initial: TState;
  /** Initial context data */
  context?: TContext;
  /** State definitions */
  states: Record<TState, StateConfig<TState, TEvent, TContext>>;
}

export interface StateConfig<TState extends string, TEvent extends string, TContext = unknown> {
  /** Transitions: event → target state */
  on?: Partial<Record<TEvent, TState | TransitionConfig<TState, TEvent, TContext>>>;
  /** Entry action — runs when entering this state */
  entry?: (ctx: MachineContext<TContext>) => void;
  /** Exit action — runs when leaving this state */
  exit?: (ctx: MachineContext<TContext>) => void;
  /** Final state — machine stops accepting events */
  type?: 'final';
}

export interface TransitionConfig<TState extends string, TEvent extends string, TContext = unknown> {
  /** Target state */
  target: TState;
  /** Guard — transition only if this returns true */
  guard?: (ctx: MachineContext<TContext>) => boolean;
  /** Action — runs during the transition */
  action?: (ctx: MachineContext<TContext>) => void;
}

export interface MachineContext<TContext> {
  /** The context data (mutable) */
  data: TContext;
  /** The current event that triggered the transition */
  event: string;
  /** Optional payload passed with the event via send(event, payload) */
  payload?: unknown;
}

export interface Machine<TState extends string, TEvent extends string, TContext = unknown> {
  /** Current state (reactive signal) */
  state: ReadonlySignal<TState>;
  /** Context data (reactive signal) */
  context: ReadonlySignal<TContext>;
  /** Send an event to the machine */
  send(event: TEvent, payload?: Record<string, unknown>): void;
  /** Check if currently in a specific state */
  matches(state: TState): boolean;
  /** Whether the machine is in a final state */
  done: ReadonlySignal<boolean>;
  /** Reset to initial state */
  reset(): void;
  /** State history */
  history: ReadonlySignal<TState[]>;
  /** Can a specific event be sent in the current state? */
  can(event: TEvent): boolean;
  /** Get all possible events from current state */
  nextEvents: ReadonlySignal<TEvent[]>;
}

// =========================================================================
// createMachine
// =========================================================================

/**
 * Create a finite state machine.
 */
export function createMachine<
  TState extends string,
  TEvent extends string,
  TContext = unknown,
>(config: MachineConfig<TState, TEvent, TContext>): Machine<TState, TEvent, TContext> {
  const currentState = signal<TState>(config.initial);
  const contextData = signal<TContext>((config.context ?? {}) as TContext);
  const stateHistory = signal<TState[]>([config.initial]);

  const done = computed(() => {
    const stateCfg = config.states[currentState()];
    return stateCfg?.type === 'final';
  });

  const nextEvents = computed((): TEvent[] => {
    const stateCfg = config.states[currentState()];
    if (!stateCfg?.on) return [];
    return Object.keys(stateCfg.on) as TEvent[];
  });

  // Run entry action for initial state
  const initialStateCfg = config.states[config.initial];
  if (initialStateCfg?.entry) {
    initialStateCfg.entry({ data: contextData() as TContext, event: '' });
  }

  function send(event: TEvent, payload?: unknown): void {
    if (done()) return; // Final state — no more transitions

    const state = currentState();
    const stateCfg = config.states[state];
    if (!stateCfg?.on) return;

    const transition = stateCfg.on[event];
    if (!transition) return;

    let target: TState;
    let guard: ((ctx: MachineContext<TContext>) => boolean) | undefined;
    let action: ((ctx: MachineContext<TContext>) => void) | undefined;

    if (typeof transition === 'string') {
      target = transition;
    } else {
      const t = transition as TransitionConfig<TState, TEvent, TContext>;
      target = t.target;
      guard = t.guard;
      action = t.action;
    }

    const ctx: MachineContext<TContext> = {
      data: contextData() as TContext,
      event,
      payload,
    };

    // Check guard
    if (guard && !guard(ctx)) return;

    // Exit action
    if (stateCfg.exit) {
      stateCfg.exit(ctx);
    }

    // Transition action — pass payload as second argument for convenience
    if (action) {
      (action as Function)(ctx, payload);
    }

    // Update context if modified
    contextData.set(ctx.data);

    // Enter new state
    currentState.set(target);
    stateHistory.update((h) => [...h, target]);

    // Entry action for new state
    const targetCfg = config.states[target];
    if (targetCfg?.entry) {
      targetCfg.entry({ data: contextData() as TContext, event });
    }
  }

  function can(event: TEvent): boolean {
    const stateCfg = config.states[currentState()];
    if (!stateCfg?.on) return false;
    const transition = stateCfg.on[event];
    if (!transition) return false;

    if (typeof transition !== 'string') {
      const t = transition as TransitionConfig<TState, TEvent, TContext>;
      if (t.guard) {
        return t.guard({ data: contextData() as TContext, event });
      }
    }
    return true;
  }

  return {
    state: () => currentState(),
    context: () => contextData(),
    send,
    matches: (state: TState) => currentState() === state,
    done,
    reset() {
      currentState.set(config.initial);
      contextData.set((config.context ?? {}) as TContext);
      stateHistory.set([config.initial]);
    },
    history: () => stateHistory(),
    can,
    nextEvents,
  };
}
