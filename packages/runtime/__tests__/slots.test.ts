/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from 'vitest';
import { renderSlot, hasSlot, createSlots } from '../src/slots.js';

describe('renderSlot', () => {
  it('renders a slot function to a DOM node', () => {
    const slot = () => 'Hello';
    const node = renderSlot(slot);
    expect(node.textContent).toBe('Hello');
  });

  it('returns a comment node for undefined slot', () => {
    const node = renderSlot(undefined);
    expect(node.nodeType).toBe(Node.COMMENT_NODE);
  });

  it('renders fallback when slot is undefined', () => {
    const fallback = () => 'Fallback';
    const node = renderSlot(undefined, fallback);
    expect(node.textContent).toBe('Fallback');
  });

  it('prefers slot over fallback', () => {
    const slot = () => 'Slot';
    const fallback = () => 'Fallback';
    const node = renderSlot(slot, fallback);
    expect(node.textContent).toBe('Slot');
  });

  it('handles DOM node slot content', () => {
    const el = document.createElement('span');
    el.textContent = 'DOM node';
    const slot = () => el;
    const node = renderSlot(slot);
    expect(node).toBe(el);
  });
});

describe('hasSlot', () => {
  it('returns false for undefined', () => {
    expect(hasSlot(undefined)).toBe(false);
  });

  it('returns false for null content', () => {
    expect(hasSlot(() => null)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(hasSlot(() => '')).toBe(false);
  });

  it('returns true for non-empty content', () => {
    expect(hasSlot(() => 'Hello')).toBe(true);
  });

  it('returns true for DOM node content', () => {
    expect(hasSlot(() => document.createElement('div'))).toBe(true);
  });
});

describe('createSlots', () => {
  it('extracts function props as slots', () => {
    const props = {
      header: () => 'Header',
      footer: () => 'Footer',
      title: 'Not a slot',
    };
    const slots = createSlots(props, ['header', 'footer']);
    expect(slots.header).toBe(props.header);
    expect(slots.footer).toBe(props.footer);
    expect(slots.title).toBeUndefined();
  });

  it('skips non-function props', () => {
    const props = { header: 'string', count: 42 };
    const slots = createSlots(props, ['header', 'count'] as any);
    expect(Object.keys(slots)).toHaveLength(0);
  });

  it('returns empty object for no slot names', () => {
    const slots = createSlots({ a: () => 'A' }, []);
    expect(Object.keys(slots)).toHaveLength(0);
  });
});
