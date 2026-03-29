import { describe, it, expect } from 'vitest';
import { createMachine } from '../src/machine.js';

function trafficLight() {
  return createMachine({
    initial: 'green',
    states: {
      green: { on: { NEXT: 'yellow' } },
      yellow: { on: { NEXT: 'red' } },
      red: { on: { NEXT: 'green' } },
    },
  });
}

describe('createMachine', () => {
  it('starts in initial state', () => {
    const m = trafficLight();
    expect(m.state()).toBe('green');
  });

  it('send transitions to next state', () => {
    const m = trafficLight();
    m.send('NEXT');
    expect(m.state()).toBe('yellow');
  });

  it('matches checks current state', () => {
    const m = trafficLight();
    expect(m.matches('green')).toBe(true);
    expect(m.matches('yellow')).toBe(false);
  });

  it('multiple transitions work', () => {
    const m = trafficLight();
    m.send('NEXT');
    m.send('NEXT');
    expect(m.state()).toBe('red');
    m.send('NEXT');
    expect(m.state()).toBe('green');
  });

  it('final state stops accepting events', () => {
    const m = createMachine({
      initial: 'active',
      states: {
        active: { on: { FINISH: 'done' } },
        done: { type: 'final' },
      },
    });

    m.send('FINISH');
    expect(m.state()).toBe('done');
    expect(m.done()).toBe(true);

    // Further events should be ignored
    m.send('FINISH');
    expect(m.state()).toBe('done');
  });

  it('can returns true for valid events, false for invalid', () => {
    const m = trafficLight();
    expect(m.can('NEXT')).toBe(true);
    expect(m.can('INVALID' as any)).toBe(false);
  });

  it('nextEvents returns possible events from current state', () => {
    const m = trafficLight();
    expect(m.nextEvents()).toEqual(['NEXT']);
  });

  it('reset returns to initial state', () => {
    const m = trafficLight();
    m.send('NEXT');
    m.send('NEXT');
    expect(m.state()).toBe('red');
    m.reset();
    expect(m.state()).toBe('green');
  });

  it('history tracks state transitions', () => {
    const m = trafficLight();
    m.send('NEXT');
    m.send('NEXT');
    expect(m.history()).toEqual(['green', 'yellow', 'red']);
  });

  it('guard prevents transition when returning false', () => {
    const m = createMachine({
      initial: 'idle',
      context: { allowed: false },
      states: {
        idle: {
          on: {
            GO: {
              target: 'running',
              guard: (ctx) => ctx.data.allowed,
            },
          },
        },
        running: { on: { STOP: 'idle' } },
      },
    });

    m.send('GO');
    expect(m.state()).toBe('idle'); // guard returned false, no transition
  });
});
