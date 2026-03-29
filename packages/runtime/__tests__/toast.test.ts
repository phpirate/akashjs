import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createToaster } from '../src/toast.js';

describe('createToaster', () => {
  it('starts with an empty toast list', () => {
    const toast = createToaster();
    expect(toast.toasts()).toEqual([]);
  });

  it('success adds a toast with type "success"', () => {
    const toast = createToaster();
    toast.success('Saved!');
    expect(toast.toasts()).toHaveLength(1);
    expect(toast.toasts()[0].type).toBe('success');
    expect(toast.toasts()[0].message).toBe('Saved!');
  });

  it('error adds a toast with type "error"', () => {
    const toast = createToaster();
    toast.error('Failed');
    expect(toast.toasts()[0].type).toBe('error');
  });

  it('info adds a toast with type "info"', () => {
    const toast = createToaster();
    toast.info('Tip');
    expect(toast.toasts()[0].type).toBe('info');
  });

  it('warning adds a toast with type "warning"', () => {
    const toast = createToaster();
    toast.warning('Watch out');
    expect(toast.toasts()[0].type).toBe('warning');
  });

  it('toasts() returns the full list of active toasts', () => {
    const toast = createToaster();
    toast.success('one');
    toast.error('two');
    toast.info('three');
    expect(toast.toasts()).toHaveLength(3);
  });

  it('dismiss removes a specific toast', () => {
    const toast = createToaster();
    const id = toast.success('temp');
    expect(toast.toasts()).toHaveLength(1);
    toast.dismiss(id);
    expect(toast.toasts()).toHaveLength(0);
  });

  it('dismissAll clears all toasts', () => {
    const toast = createToaster();
    toast.success('one');
    toast.error('two');
    toast.warning('three');
    expect(toast.toasts()).toHaveLength(3);
    toast.dismissAll();
    expect(toast.toasts()).toHaveLength(0);
  });

  it('auto-dismisses after the default duration', () => {
    vi.useFakeTimers();
    const toast = createToaster({ defaultDuration: 1000 });
    toast.success('bye');
    expect(toast.toasts()).toHaveLength(1);

    vi.advanceTimersByTime(1000);
    expect(toast.toasts()).toHaveLength(0);

    vi.useRealTimers();
  });

  it('does not auto-dismiss when duration is 0', () => {
    vi.useFakeTimers();
    const toast = createToaster();
    toast.success('sticky', { duration: 0 });
    vi.advanceTimersByTime(10000);
    expect(toast.toasts()).toHaveLength(1);

    vi.useRealTimers();
  });

  it('maxVisible trims oldest toasts', () => {
    const toast = createToaster({ maxVisible: 2 });
    toast.success('first');
    toast.success('second');
    toast.success('third');
    expect(toast.toasts()).toHaveLength(2);
    expect(toast.toasts()[0].message).toBe('second');
    expect(toast.toasts()[1].message).toBe('third');
  });

  it('returns a unique id for each toast', () => {
    const toast = createToaster();
    const id1 = toast.success('a');
    const id2 = toast.success('b');
    expect(id1).not.toBe(id2);
  });
});
