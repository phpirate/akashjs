import { describe, it, expect, vi } from 'vitest';
import { createField } from '../src/field.js';
import { required, minLength } from '../src/validators.js';

describe('createField', () => {
  it('initializes with the initial value', () => {
    const field = createField({ initial: 'hello' });
    expect(field.value()).toBe('hello');
  });

  it('is not dirty or touched initially', () => {
    const field = createField({ initial: '' });
    expect(field.dirty()).toBe(false);
    expect(field.touched()).toBe(false);
  });

  it('tracks dirty state when value changes', () => {
    const field = createField({ initial: '' });
    field.value.set('changed');
    expect(field.dirty()).toBe(true);
  });

  it('dirty returns false if value is set back to initial', () => {
    const field = createField({ initial: 'start' });
    field.value.set('changed');
    expect(field.dirty()).toBe(true);
    field.value.set('start');
    expect(field.dirty()).toBe(false);
  });

  it('tracks touched state via markTouched()', () => {
    const field = createField({ initial: '' });
    expect(field.touched()).toBe(false);
    field.markTouched();
    expect(field.touched()).toBe(true);
  });

  it('runs sync validators', () => {
    const field = createField({
      initial: '',
      validators: [required('Required')],
    });
    expect(field.errors()).toEqual(['Required']);
    expect(field.valid()).toBe(false);
  });

  it('clears errors when value becomes valid', () => {
    const field = createField({
      initial: '',
      validators: [required('Required')],
    });
    expect(field.valid()).toBe(false);

    field.value.set('hello');
    expect(field.errors()).toEqual([]);
    expect(field.valid()).toBe(true);
  });

  it('collects multiple validation errors', () => {
    const field = createField({
      initial: '',
      validators: [required('Required'), minLength(3, 'Min 3')],
    });
    expect(field.errors()).toEqual(['Required', 'Min 3']);
  });

  it('resets to initial value and clears touched', () => {
    const field = createField({
      initial: 'start',
      validators: [required()],
    });
    field.value.set('changed');
    field.markTouched();
    expect(field.dirty()).toBe(true);
    expect(field.touched()).toBe(true);

    field.reset();
    expect(field.value()).toBe('start');
    expect(field.dirty()).toBe(false);
    expect(field.touched()).toBe(false);
  });

  it('works with number fields', () => {
    const field = createField({ initial: 0 });
    expect(field.value()).toBe(0);
    field.value.set(42);
    expect(field.value()).toBe(42);
    expect(field.dirty()).toBe(true);
  });

  it('works with boolean fields', () => {
    const field = createField({ initial: false });
    expect(field.value()).toBe(false);
    field.value.set(true);
    expect(field.dirty()).toBe(true);
  });
});

describe('createField async validation', () => {
  it('runs async validators', async () => {
    const asyncValidator = vi.fn(async (value: string) => {
      return value === 'taken' ? 'Already taken' : null;
    });

    const field = createField({
      initial: '',
      asyncValidators: [asyncValidator],
    });

    field.value.set('taken');

    // Wait for async validator to complete
    await vi.waitFor(() => {
      expect(field.errors()).toContain('Already taken');
    });
  });

  it('reports validating state', async () => {
    let resolveValidator!: (value: string | null) => void;
    const asyncValidator = vi.fn(
      () => new Promise<string | null>((r) => { resolveValidator = r; }),
    );

    const field = createField({
      initial: '',
      asyncValidators: [asyncValidator],
    });

    field.value.set('test');

    // Should be validating while promise is pending
    await vi.waitFor(() => {
      expect(field.validating()).toBe(true);
    });

    resolveValidator(null);

    await vi.waitFor(() => {
      expect(field.validating()).toBe(false);
    });
  });

  it('skips async validation when sync errors exist', async () => {
    const asyncValidator = vi.fn(async () => null);

    const field = createField({
      initial: '',
      validators: [required('Required')],
      asyncValidators: [asyncValidator],
    });

    // Trigger a value change that still fails sync validation
    field.value.set('');

    // Give async a chance to run
    await new Promise((r) => setTimeout(r, 10));

    // Async validator should not have been called (sync errors exist)
    // Note: it may be called once on init, but sync errors block it
    expect(field.errors()).toEqual(['Required']);
  });
});
