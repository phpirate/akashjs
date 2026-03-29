import { describe, it, expect, vi } from 'vitest';
import { defineForm, defineFormGroup } from '../src/form.js';
import { required, minLength, email, pattern } from '../src/validators.js';

describe('defineForm', () => {
  it('creates a form with fields', () => {
    const form = defineForm({
      name: { initial: '' },
      age: { initial: 0 },
    });

    expect(form.fields.name.value()).toBe('');
    expect(form.fields.age.value()).toBe(0);
  });

  it('reports values as a plain object', () => {
    const form = defineForm({
      name: { initial: 'Alice' },
      age: { initial: 30 },
    });

    expect(form.values()).toEqual({ name: 'Alice', age: 30 });
  });

  it('tracks updated values', () => {
    const form = defineForm({
      name: { initial: '' },
    });

    form.fields.name.value.set('Bob');
    expect(form.values()).toEqual({ name: 'Bob' });
  });

  it('reports valid when no validators', () => {
    const form = defineForm({
      name: { initial: '' },
    });
    expect(form.valid()).toBe(true);
  });

  it('reports invalid when validators fail', () => {
    const form = defineForm({
      email: { initial: '', validators: [required('Required')] },
    });
    expect(form.valid()).toBe(false);
  });

  it('becomes valid after fixing errors', () => {
    const form = defineForm({
      email: { initial: '', validators: [required('Required')] },
    });
    expect(form.valid()).toBe(false);

    form.fields.email.value.set('test@example.com');
    expect(form.valid()).toBe(true);
  });

  it('tracks dirty state', () => {
    const form = defineForm({
      name: { initial: '' },
      age: { initial: 0 },
    });

    expect(form.dirty()).toBe(false);
    form.fields.name.value.set('changed');
    expect(form.dirty()).toBe(true);
  });

  it('collects errors by field', () => {
    const form = defineForm({
      email: { initial: '', validators: [required('Email required')] },
      password: { initial: '', validators: [required('Password required'), minLength(8, 'Min 8')] },
    });

    const errors = form.errors();
    expect(errors.email).toEqual(['Email required']);
    expect(errors.password).toEqual(['Password required', 'Min 8']);
  });

  it('returns empty errors for valid fields', () => {
    const form = defineForm({
      name: { initial: 'Alice' },
      email: { initial: '', validators: [required('Required')] },
    });

    const errors = form.errors();
    expect(errors.name).toBeUndefined();
    expect(errors.email).toEqual(['Required']);
  });

  it('resets all fields', () => {
    const form = defineForm({
      name: { initial: 'initial' },
      age: { initial: 25 },
    });

    form.fields.name.value.set('changed');
    form.fields.age.value.set(99);
    form.fields.name.markTouched();

    form.reset();
    expect(form.values()).toEqual({ name: 'initial', age: 25 });
    expect(form.fields.name.touched()).toBe(false);
    expect(form.dirty()).toBe(false);
  });
});

describe('defineForm submit', () => {
  it('calls handler with values when valid', async () => {
    const handler = vi.fn();
    const form = defineForm({
      name: { initial: 'Alice' },
    });

    await form.submit(handler);
    expect(handler).toHaveBeenCalledWith({ name: 'Alice' });
  });

  it('does not call handler when invalid', async () => {
    const handler = vi.fn();
    const form = defineForm({
      name: { initial: '', validators: [required()] },
    });

    await form.submit(handler);
    expect(handler).not.toHaveBeenCalled();
  });

  it('marks all fields as touched on submit', async () => {
    const form = defineForm({
      name: { initial: '', validators: [required()] },
      email: { initial: '', validators: [required()] },
    });

    expect(form.fields.name.touched()).toBe(false);
    expect(form.fields.email.touched()).toBe(false);

    await form.submit(vi.fn());

    expect(form.fields.name.touched()).toBe(true);
    expect(form.fields.email.touched()).toBe(true);
  });

  it('calls handler when validation errors are fixed', async () => {
    const handler = vi.fn();
    const form = defineForm({
      name: { initial: '', validators: [required()] },
    });

    // First submit fails
    await form.submit(handler);
    expect(handler).not.toHaveBeenCalled();

    // Fix the error
    form.fields.name.value.set('Alice');
    await form.submit(handler);
    expect(handler).toHaveBeenCalledWith({ name: 'Alice' });
  });
});

describe('defineForm handleSubmit', () => {
  it('returns an event handler that prevents default', async () => {
    const handler = vi.fn();
    const form = defineForm({
      name: { initial: 'Alice' },
    });

    const onSubmit = form.handleSubmit(handler);
    const event = { preventDefault: vi.fn() } as unknown as Event;
    onSubmit(event);

    expect(event.preventDefault).toHaveBeenCalled();
  });
});

describe('defineFormGroup', () => {
  it('creates nested field groups', () => {
    const form = defineForm({
      name: { initial: '' },
      address: defineFormGroup({
        street: { initial: '' },
        city: { initial: '' },
        zip: { initial: '', validators: [pattern(/^\d{5}$/, 'Invalid ZIP')] },
      }),
    });

    expect(form.fields.address.fields.street.value()).toBe('');
    expect(form.fields.address.fields.city.value()).toBe('');
  });

  it('extracts nested values', () => {
    const form = defineForm({
      name: { initial: 'Alice' },
      address: defineFormGroup({
        street: { initial: '123 Main St' },
        city: { initial: 'Springfield' },
      }),
    });

    expect(form.values()).toEqual({
      name: 'Alice',
      address: {
        street: '123 Main St',
        city: 'Springfield',
      },
    });
  });

  it('validates nested fields', () => {
    const form = defineForm({
      name: { initial: 'Alice' },
      address: defineFormGroup({
        zip: { initial: 'bad', validators: [pattern(/^\d{5}$/, 'Invalid ZIP')] },
      }),
    });

    expect(form.valid()).toBe(false);
    expect(form.fields.address.valid()).toBe(false);
    expect(form.fields.address.fields.zip.errors()).toEqual(['Invalid ZIP']);

    form.fields.address.fields.zip.value.set('12345');
    expect(form.fields.address.valid()).toBe(true);
    expect(form.valid()).toBe(true);
  });

  it('tracks dirty state across groups', () => {
    const form = defineForm({
      name: { initial: '' },
      address: defineFormGroup({
        city: { initial: '' },
      }),
    });

    expect(form.dirty()).toBe(false);
    form.fields.address.fields.city.value.set('Portland');
    expect(form.dirty()).toBe(true);
    expect(form.fields.address.dirty()).toBe(true);
  });

  it('resets nested fields', () => {
    const form = defineForm({
      name: { initial: 'init' },
      address: defineFormGroup({
        city: { initial: 'orig' },
      }),
    });

    form.fields.address.fields.city.value.set('changed');
    form.reset();
    expect(form.fields.address.fields.city.value()).toBe('orig');
  });

  it('collects errors from nested groups', () => {
    const form = defineForm({
      email: { initial: '', validators: [required('Email needed')] },
      address: defineFormGroup({
        zip: { initial: '', validators: [required('ZIP needed')] },
      }),
    });

    const errors = form.errors();
    expect(errors.email).toEqual(['Email needed']);
    expect(errors.address).toEqual(['ZIP needed']);
  });
});
